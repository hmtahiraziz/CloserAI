import {
  BadRequestException,
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CallStatus,
  CampaignStatus,
  LeadStatus,
  startCallSchema,
  normalizePhone,
} from '@closerai/shared';
import { Prisma } from '@closerai/database';
import { PrismaService } from '../prisma/prisma.service';
import { LeadsService } from '../leads/leads.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { RetellClientService, buildDynamicVariables } from '../retell/retell.service';
import { AppEnv } from '../../config/env';
import { SessionUser } from '../auth/auth.service';

@Injectable()
export class CallsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leads: LeadsService,
    @Inject(forwardRef(() => CampaignsService))
    private readonly campaigns: CampaignsService,
    private readonly retell: RetellClientService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  async list(
    organizationId: string,
    page = 1,
    pageSize = 20,
  ) {
    const where = { organizationId };
    const [total, items] = await Promise.all([
      this.prisma.call.count({ where }),
      this.prisma.call.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
          campaign: { select: { id: true, name: true } },
          appointments: { select: { id: true, status: true, startTime: true } },
        },
      }),
    ]);
    return {
      items,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async get(organizationId: string, id: string) {
    const call = await this.prisma.call.findFirst({
      where: { id, organizationId },
      include: {
        lead: true,
        campaign: true,
        qualification: true,
        objections: true,
        competitorMentions: true,
        appointments: true,
        toolExecutions: { orderBy: { createdAt: 'asc' } },
        followUps: true,
        humanHandoffs: true,
      },
    });
    if (!call) throw new NotFoundException({ code: 'CALL_NOT_FOUND', message: 'Call not found' });
    return call;
  }

  async getTranscript(organizationId: string, id: string) {
    const call = await this.get(organizationId, id);
    return {
      transcript: call.transcript,
      transcriptObject: call.transcriptObject,
      recordingUrl: call.recordingUrl,
    };
  }

  async listForLead(organizationId: string, leadId: string) {
    await this.leads.get(organizationId, leadId);
    return this.prisma.call.findMany({
      where: { organizationId, leadId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async assertNoActiveCall(organizationId: string, leadId: string) {
    const active = await this.prisma.call.findFirst({
      where: {
        organizationId,
        leadId,
        status: { in: [CallStatus.QUEUED, CallStatus.RINGING, CallStatus.IN_PROGRESS] },
      },
    });
    if (active) {
      throw new ConflictException({
        code: 'DUPLICATE_CALL',
        message: 'Lead already has a queued or active call',
        details: { callId: active.id },
      });
    }
  }

  private async buildLeadCallContext(
    user: SessionUser,
    lead: {
      id: string;
      firstName: string;
      lastName: string;
      companyName: string;
      jobTitle: string | null;
      industry: string | null;
      companySize: string | null;
      source: string | null;
      knownPainPoint: string | null;
      timezone: string | null;
    },
    campaign: {
      id: string;
      productName: string;
      defaultObjective: string | null;
    },
  ) {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: user.organizationId },
      include: { settings: true },
    });

    const previousCalls = await this.prisma.call.findMany({
      where: { leadId: lead.id, status: CallStatus.COMPLETED },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { callSummary: true, callOutcome: true, createdAt: true },
    });

    const previousSummary =
      previousCalls.length === 0
        ? 'No previous interactions'
        : previousCalls
            .map((c) => `${c.createdAt.toISOString()}: ${c.callOutcome} — ${c.callSummary ?? 'n/a'}`)
            .join(' | ');

    return buildDynamicVariables({
      lead_id: lead.id,
      campaign_id: campaign.id,
      first_name: lead.firstName,
      last_name: lead.lastName,
      company_name: lead.companyName,
      job_title: lead.jobTitle ?? '',
      industry: lead.industry ?? '',
      company_size: lead.companySize ?? '',
      lead_source: lead.source ?? '',
      known_pain_point: lead.knownPainPoint ?? '',
      previous_interaction_summary: previousSummary,
      product_name: campaign.productName,
      sales_objective: campaign.defaultObjective ?? 'Qualify and book a discovery meeting',
      assigned_sales_rep: user.name,
      sales_rep_phone: org.settings?.transferNumber ?? this.config.get('RETELL_TRANSFER_NUMBER') ?? '',
      company_timezone: org.timezone,
      lead_timezone: lead.timezone ?? org.timezone,
    });
  }

  async startOutboundCall(
    user: SessionUser,
    leadId: string,
    input: { campaignId: string; idempotencyKey?: string },
  ) {
    const parsed = startCallSchema.parse(input);
    const lead = await this.leads.ensureNotDoNotCall(user.organizationId, leadId);
    const phone = normalizePhone(lead.phone);
    if (!phone) {
      throw new BadRequestException({ code: 'INVALID_PHONE', message: 'Invalid lead phone number' });
    }

    const campaign = await this.campaigns.getActive(user.organizationId, parsed.campaignId);
    await this.assertNoActiveCall(user.organizationId, leadId);

    const dial = await this.resolveDialCredentials(user.organizationId, campaign);
    if (!dial.agentId || !dial.fromNumber) {
      throw new ServiceUnavailableException({
        code: 'MISSING_RETELL_CONFIG',
        message:
          'Missing Retell agent ID or phone number. Add an agent under Agents, or set org/env defaults.',
      });
    }
    const { agentId, fromNumber } = dial;

    const dynamicVars = await this.buildLeadCallContext(user, lead, campaign);

    const call = await this.prisma.call.create({
      data: {
        organizationId: user.organizationId,
        leadId,
        campaignId: campaign.id,
        status: CallStatus.QUEUED,
        direction: 'OUTBOUND',
        isSimulated: false,
        metadata: {
          startedBy: user.id,
          callType: 'phone',
          idempotencyKey: parsed.idempotencyKey ?? null,
        },
      },
    });

    try {
      const result = await this.retell.createPhoneCall({
        fromNumber,
        toNumber: phone,
        agentId,
        metadata: {
          closerCallId: call.id,
          leadId: lead.id,
          campaignId: campaign.id,
          organizationId: user.organizationId,
        },
        retellLlmDynamicVariables: dynamicVars,
      });

      const updated = await this.prisma.$transaction(async (tx) => {
        const updatedCall = await tx.call.update({
          where: { id: call.id },
          data: {
            retellCallId: result.retellCallId,
            status: CallStatus.QUEUED,
            rawRetellPayload: result.raw as Prisma.InputJsonValue,
          },
        });
        await tx.lead.update({
          where: { id: lead.id },
          data: { status: LeadStatus.CALLING, lastContactedAt: new Date() },
        });
        await tx.campaignLead.updateMany({
          where: { campaignId: campaign.id, leadId: lead.id },
          data: {
            attemptCount: { increment: 1 },
            lastAttemptAt: new Date(),
            status: 'QUEUED',
          },
        });
        return updatedCall;
      });

      return updated;
    } catch (err) {
      await this.prisma.call.update({
        where: { id: call.id },
        data: { status: CallStatus.FAILED, callOutcome: 'FAILED' },
      });
      const code = (err as { code?: string })?.code;
      if (code === 'MISSING_RETELL_CONFIG') {
        throw new ServiceUnavailableException({
          code: 'MISSING_RETELL_CONFIG',
          message: 'Missing Retell configuration',
        });
      }
      throw new ServiceUnavailableException({
        code: 'RETELL_API_ERROR',
        message: 'Failed to create outbound call with Retell',
      });
    }
  }

  /**
   * Browser mic web call via Retell — no phone number required.
   * Returns accessToken for the Retell Web SDK on the client.
   */
  async startWebCall(
    user: SessionUser,
    leadId: string,
    input: { campaignId: string; idempotencyKey?: string },
  ) {
    const parsed = startCallSchema.parse(input);
    const lead = await this.leads.ensureNotDoNotCall(user.organizationId, leadId);
    const campaign = await this.campaigns.getActive(user.organizationId, parsed.campaignId);
    await this.assertNoActiveCall(user.organizationId, leadId);

    const dial = await this.resolveDialCredentials(user.organizationId, campaign);

    if (
      !dial.agentId ||
      !String(this.config.get('RETELL_API_KEY') || process.env.RETELL_API_KEY || '').trim()
    ) {
      throw new ServiceUnavailableException({
        code: 'MISSING_RETELL_CONFIG',
        message:
          'Missing Retell configuration. Add an agent under Agents (or set RETELL_API_KEY / RETELL_AGENT_ID). Phone number is not required for web calls.',
      });
    }
    const { agentId } = dial;

    const dynamicVars = await this.buildLeadCallContext(user, lead, campaign);

    const call = await this.prisma.call.create({
      data: {
        organizationId: user.organizationId,
        leadId,
        campaignId: campaign.id,
        status: CallStatus.QUEUED,
        direction: 'OUTBOUND',
        isSimulated: false,
        metadata: {
          startedBy: user.id,
          callType: 'web',
          idempotencyKey: parsed.idempotencyKey ?? null,
        },
      },
    });

    try {
      const result = await this.retell.createWebCall({
        agentId,
        metadata: {
          closerCallId: call.id,
          leadId: lead.id,
          campaignId: campaign.id,
          organizationId: user.organizationId,
          callType: 'web',
        },
        retellLlmDynamicVariables: dynamicVars,
      });

      const updated = await this.prisma.$transaction(async (tx) => {
        const updatedCall = await tx.call.update({
          where: { id: call.id },
          data: {
            retellCallId: result.retellCallId,
            status: CallStatus.IN_PROGRESS,
            startedAt: new Date(),
            rawRetellPayload: result.raw as Prisma.InputJsonValue,
            metadata: {
              startedBy: user.id,
              callType: 'web',
              idempotencyKey: parsed.idempotencyKey ?? null,
            },
          },
        });
        await tx.lead.update({
          where: { id: lead.id },
          data: { status: LeadStatus.CALLING, lastContactedAt: new Date() },
        });
        await tx.campaignLead.updateMany({
          where: { campaignId: campaign.id, leadId: lead.id },
          data: {
            attemptCount: { increment: 1 },
            lastAttemptAt: new Date(),
            status: 'QUEUED',
          },
        });
        return updatedCall;
      });

      return {
        call: updated,
        accessToken: result.accessToken,
        retellCallId: result.retellCallId,
      };
    } catch (err) {
      await this.prisma.call.update({
        where: { id: call.id },
        data: { status: CallStatus.FAILED, callOutcome: 'FAILED' },
      });
      const code = (err as { code?: string })?.code;
      if (code === 'MISSING_RETELL_CONFIG') {
        throw new ServiceUnavailableException({
          code: 'MISSING_RETELL_CONFIG',
          message: 'Missing Retell configuration',
        });
      }
      throw new ServiceUnavailableException({
        code: 'RETELL_API_ERROR',
        message: 'Failed to create web call with Retell',
      });
    }
  }

  /**
   * Prefer campaign-linked agent, then campaign legacy fields, then org default agent,
   * then org settings, then env. Seed placeholder agent IDs are ignored.
   */
  private async resolveDialCredentials(
    organizationId: string,
    campaign: {
      retellAgentId?: string | null;
      retellPhoneNumber?: string | null;
      agentConfigurationId?: string | null;
    },
  ): Promise<{ agentId?: string; fromNumber?: string }> {
    const isUsable = (id?: string | null) =>
      Boolean(id?.trim()) && id !== 'agent_demo_placeholder';

    let agentId = isUsable(campaign.retellAgentId) ? campaign.retellAgentId!.trim() : undefined;
    let fromNumber = campaign.retellPhoneNumber?.trim() || undefined;

    if (campaign.agentConfigurationId) {
      const linked = await this.prisma.agentConfiguration.findFirst({
        where: { id: campaign.agentConfigurationId, organizationId },
      });
      if (linked) {
        if (isUsable(linked.retellAgentId)) agentId = linked.retellAgentId!.trim();
        if (linked.retellPhoneNumber?.trim()) fromNumber = linked.retellPhoneNumber.trim();
      }
    }

    if (!agentId || !fromNumber) {
      const orgAgent = await this.prisma.agentConfiguration.findFirst({
        where: { organizationId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
      if (orgAgent) {
        if (!agentId && isUsable(orgAgent.retellAgentId)) agentId = orgAgent.retellAgentId!.trim();
        if (!fromNumber && orgAgent.retellPhoneNumber?.trim()) {
          fromNumber = orgAgent.retellPhoneNumber.trim();
        }
      }
    }

    if (!agentId || !fromNumber) {
      const orgSettings = await this.prisma.organizationSettings.findUnique({
        where: { organizationId },
      });
      if (!agentId && isUsable(orgSettings?.retellAgentId)) {
        agentId = orgSettings!.retellAgentId!.trim();
      }
      if (!fromNumber && orgSettings?.retellPhoneNumber?.trim()) {
        fromNumber = orgSettings.retellPhoneNumber.trim();
      }
    }

    if (!agentId) {
      const fromEnv = this.config.get('RETELL_AGENT_ID') || process.env.RETELL_AGENT_ID;
      if (isUsable(fromEnv)) agentId = fromEnv!.trim();
    }
    if (!fromNumber) {
      fromNumber =
        this.config.get('RETELL_PHONE_NUMBER') || process.env.RETELL_PHONE_NUMBER || undefined;
      fromNumber = fromNumber?.trim() || undefined;
    }

    return { agentId, fromNumber };
  }

  /** @deprecated Prefer resolveDialCredentials — kept for any residual callers */
  private async resolveRetellAgentId(
    organizationId: string,
    campaignAgentId?: string | null,
  ): Promise<string | undefined> {
    const dial = await this.resolveDialCredentials(organizationId, {
      retellAgentId: campaignAgentId,
    });
    return dial.agentId;
  }

  async markReviewed(organizationId: string, id: string, userId: string) {
    await this.get(organizationId, id);
    return this.prisma.call.update({
      where: { id },
      data: { reviewedAt: new Date(), reviewedById: userId },
    });
  }

  async retry(user: SessionUser, id: string) {
    const call = await this.get(user.organizationId, id);
    if (!call.campaignId) {
      throw new BadRequestException({ code: 'NO_CAMPAIGN', message: 'Original call has no campaign' });
    }
    return this.startOutboundCall(user, call.leadId, { campaignId: call.campaignId });
  }

  /**
   * Activate campaign (if needed) and dial every pending assigned lead via Retell phone.
   * Requires a from-number via linked agent, campaign, org settings, or RETELL_PHONE_NUMBER.
   */
  async startCampaign(user: SessionUser, campaignId: string) {
    const campaign = await this.campaigns.get(user.organizationId, campaignId);
    const dial = await this.resolveDialCredentials(user.organizationId, campaign);

    if (!dial.fromNumber?.trim()) {
      throw new BadRequestException({
        code: 'MISSING_PHONE_NUMBER',
        message:
          'Add an agent with a Retell phone number under Agents (or set RETELL_PHONE_NUMBER) before starting',
      });
    }

    if (!dial.agentId) {
      throw new BadRequestException({
        code: 'MISSING_RETELL_AGENT',
        message:
          'Add an agent with a Retell agent ID under Agents (or set RETELL_AGENT_ID) before starting',
      });
    }

    if (campaign.status !== CampaignStatus.ACTIVE) {
      await this.campaigns.setStatus(user.organizationId, campaignId, CampaignStatus.ACTIVE);
    }

    const pending = await this.prisma.campaignLead.findMany({
      where: {
        campaignId,
        status: { in: ['PENDING', 'FAILED'] },
      },
      include: {
        lead: {
          select: {
            id: true,
            phone: true,
            doNotCall: true,
            status: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const started: Array<{ leadId: string; callId: string; name: string }> = [];
    const skipped: Array<{ leadId: string; reason: string; name: string }> = [];
    const failed: Array<{ leadId: string; reason: string; name: string }> = [];

    for (const cl of pending) {
      const name = `${cl.lead.firstName} ${cl.lead.lastName}`.trim();

      if (cl.lead.doNotCall || cl.lead.status === LeadStatus.DO_NOT_CALL) {
        await this.prisma.campaignLead.update({
          where: { id: cl.id },
          data: { status: 'SKIPPED' },
        });
        skipped.push({ leadId: cl.leadId, reason: 'Do not call', name });
        continue;
      }

      if (!normalizePhone(cl.lead.phone)) {
        await this.prisma.campaignLead.update({
          where: { id: cl.id },
          data: { status: 'SKIPPED' },
        });
        skipped.push({ leadId: cl.leadId, reason: 'Invalid phone', name });
        continue;
      }

      try {
        const call = await this.startOutboundCall(user, cl.leadId, { campaignId });
        started.push({ leadId: cl.leadId, callId: call.id, name });
      } catch (err) {
        let code: string | undefined;
        let message = 'Failed to start call';
        if (err instanceof HttpException) {
          const res = err.getResponse();
          if (typeof res === 'object' && res !== null) {
            const body = res as { code?: string; message?: string };
            code = body.code;
            message = body.message ?? err.message;
          } else {
            message = err.message;
          }
        } else if (err instanceof Error) {
          message = err.message;
        }

        if (code === 'DUPLICATE_CALL') {
          skipped.push({ leadId: cl.leadId, reason: 'Already has an active call', name });
          continue;
        }

        await this.prisma.campaignLead.update({
          where: { id: cl.id },
          data: {
            status: 'FAILED',
            lastAttemptAt: new Date(),
            attemptCount: { increment: 1 },
          },
        });
        failed.push({ leadId: cl.leadId, reason: message, name });
      }
    }

    await this.campaigns.maybeComplete(campaignId);
    const updated = await this.campaigns.get(user.organizationId, campaignId);

    return {
      campaign: updated,
      summary: {
        dialed: started.length,
        skipped: skipped.length,
        failed: failed.length,
        pendingRemaining: updated.stats.pendingDial,
      },
      started,
      skipped,
      failed,
    };
  }
}
