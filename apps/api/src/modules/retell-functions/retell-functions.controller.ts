import {
  Controller,
  Post,
  Req,
  Headers,
  UnauthorizedException,
  Param,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import {
  getLeadContextArgsSchema,
  saveCallDiscoveryArgsSchema,
  checkAvailabilityArgsSchema,
  bookMeetingArgsSchema,
  scheduleCallbackArgsSchema,
  markDoNotCallArgsSchema,
  updateLeadStatusArgsSchema,
  getPricingArgsSchema,
  createHandoffArgsSchema,
  LeadStatus,
} from '@closerai/shared';
import { Public } from '../../common/guards/auth.guard';
import { RetellSignatureVerifier } from '../retell/retell.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { AppEnv } from '../../config/env';
import { Prisma } from '@closerai/database';

type RetellBody = {
  name?: string;
  args?: Record<string, unknown>;
  call?: { call_id?: string; metadata?: Record<string, string> };
  [key: string]: unknown;
};

@ApiTags('retell-functions')
@Controller('retell/functions')
export class RetellFunctionsController {
  constructor(
    private readonly verifier: RetellSignatureVerifier,
    private readonly prisma: PrismaService,
    private readonly appointments: AppointmentsService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  @Public()
  @Post(':functionName')
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiExcludeEndpoint()
  async handle(
    @Param('functionName') functionName: string,
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-retell-signature') signature: string,
  ) {
    const started = Date.now();
    const rawBody = req.rawBody
      ? req.rawBody.toString('utf8')
      : typeof req.body === 'string'
        ? req.body
        : Buffer.isBuffer(req.body)
          ? req.body.toString('utf8')
          : JSON.stringify(req.body ?? {});

    const apiKey = this.config.get('RETELL_API_KEY');
    const tolerance = this.config.get('RETELL_WEBHOOK_TOLERANCE_SECONDS');
    if (!this.verifier.verify(rawBody, apiKey, signature ?? '', tolerance)) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Invalid signature' });
    }

    let body: RetellBody;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return this.safeFail('Invalid request body');
    }

    const args = (body.args ?? body) as Record<string, unknown>;
    const callIdMeta = body.call?.call_id;
    let callRecord = callIdMeta
      ? await this.prisma.call.findFirst({ where: { retellCallId: callIdMeta } })
      : null;
    if (!callRecord && typeof args.call_id === 'string') {
      callRecord = await this.prisma.call.findFirst({
        where: { OR: [{ id: args.call_id }, { retellCallId: args.call_id }] },
      });
    }

    try {
      const result = await Promise.race([
        this.dispatch(functionName, args, callRecord?.id),
        new Promise((_, reject) =>
          setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'TIMEOUT' })), 8000),
        ),
      ]);

      await this.prisma.toolExecution.create({
        data: {
          callId: callRecord?.id,
          toolName: functionName,
          arguments: args as Prisma.InputJsonValue,
          result: result as Prisma.InputJsonValue,
          status: 'SUCCESS',
          executionTimeMs: Date.now() - started,
        },
      });
      return result;
    } catch (err) {
      const message =
        (err as { code?: string })?.code === 'TIMEOUT'
          ? 'The request timed out. Offer another option or schedule a human follow-up.'
          : err instanceof Error
            ? err.message
            : 'Something went wrong. Offer another time or schedule a human follow-up.';

      await this.prisma.toolExecution.create({
        data: {
          callId: callRecord?.id,
          toolName: functionName,
          arguments: args as Prisma.InputJsonValue,
          result: { error: message },
          status: (err as { code?: string })?.code === 'TIMEOUT' ? 'TIMEOUT' : 'FAILURE',
          executionTimeMs: Date.now() - started,
        },
      });
      return this.safeFail(message);
    }
  }

  private safeFail(message: string) {
    return { success: false, message };
  }

  private async dispatch(name: string, args: Record<string, unknown>, internalCallId?: string) {
    switch (name) {
      case 'get_lead_context':
        return this.getLeadContext(args);
      case 'save_call_discovery':
        return this.saveDiscovery(args, internalCallId);
      case 'check_availability':
        return this.checkAvailability(args);
      case 'book_meeting':
        return this.bookMeeting(args, internalCallId);
      case 'schedule_callback':
        return this.scheduleCallback(args, internalCallId);
      case 'mark_do_not_call':
        return this.markDnc(args);
      case 'update_lead_status':
        return this.updateLeadStatus(args);
      case 'get_pricing_information':
        return this.getPricing(args);
      case 'create_human_handoff':
        return this.createHandoff(args, internalCallId);
      default:
        return this.safeFail(`Unknown function ${name}`);
    }
  }

  private async getLeadContext(args: Record<string, unknown>) {
    const { lead_id } = getLeadContextArgsSchema.parse(args);
    const lead = await this.prisma.lead.findUnique({
      where: { id: lead_id },
      include: {
        calls: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, callOutcome: true, callSummary: true, createdAt: true, leadScore: true },
        },
      },
    });
    if (!lead) return this.safeFail('Lead not found');
    return {
      lead: {
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        companyName: lead.companyName,
        jobTitle: lead.jobTitle,
        industry: lead.industry,
        companySize: lead.companySize,
        pipelineStage: lead.pipelineStage,
        status: lead.status,
        knownPainPoint: lead.knownPainPoint,
        notes: lead.notes,
        doNotCall: lead.doNotCall,
      },
      previous_calls: lead.calls,
      current_pipeline_stage: lead.pipelineStage,
      known_pain_points: lead.knownPainPoint ? [lead.knownPainPoint] : [],
      do_not_call: lead.doNotCall,
    };
  }

  private async saveDiscovery(args: Record<string, unknown>, internalCallId?: string) {
    const data = saveCallDiscoveryArgsSchema.parse(args);
    const lead = await this.prisma.lead.findUnique({ where: { id: data.lead_id } });
    if (!lead) return this.safeFail('Lead not found');

    const notes = [
      lead.notes,
      data.notes,
      data.current_process ? `Process: ${data.current_process}` : null,
      data.decision_process ? `Decision: ${data.decision_process}` : null,
      data.tools_used?.length ? `Tools: ${data.tools_used.join(', ')}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        notes,
        knownPainPoint: data.pain_points?.[0] ?? lead.knownPainPoint,
      },
    });

    if (internalCallId || data.call_id) {
      const call = await this.prisma.call.findFirst({
        where: {
          OR: [{ id: internalCallId }, { id: data.call_id }, { retellCallId: data.call_id }].filter(
            Boolean,
          ) as Array<{ id?: string; retellCallId?: string }>,
        },
      });
      if (call) {
        await this.prisma.qualification.upsert({
          where: { callId: call.id },
          create: {
            callId: call.id,
            painPoints: data.pain_points ?? [],
            businessGoals: data.business_goals ?? [],
            currentProcess: data.current_process,
            decisionProcess: data.decision_process,
          },
          update: {
            painPoints: data.pain_points ?? [],
            businessGoals: data.business_goals ?? [],
            currentProcess: data.current_process,
            decisionProcess: data.decision_process,
          },
        });
      }
    }

    return {
      success: true,
      saved_fields: Object.keys(data).filter((k) => k !== 'lead_id' && k !== 'call_id'),
    };
  }

  private async checkAvailability(args: Record<string, unknown>) {
    const data = checkAvailabilityArgsSchema.parse(args);
    const lead = await this.prisma.lead.findUnique({ where: { id: data.lead_id } });
    if (!lead) return this.safeFail('Lead not found');
    const slots = await this.appointments.checkAvailability(
      lead.organizationId,
      data.preferred_date,
      data.timezone,
      data.meeting_duration_minutes,
    );
    return {
      available_slots: slots.map((s) => s.startTime),
      slots,
      timezone: data.timezone,
      duration_minutes: data.meeting_duration_minutes,
    };
  }

  private async bookMeeting(args: Record<string, unknown>, internalCallId?: string) {
    const data = bookMeetingArgsSchema.parse(args);
    const lead = await this.prisma.lead.findUnique({ where: { id: data.lead_id } });
    if (!lead) return this.safeFail('Lead not found. Offer another time or schedule a human follow-up.');

    const call = await this.prisma.call.findFirst({
      where: {
        OR: [
          internalCallId ? { id: internalCallId } : undefined,
          { id: data.call_id },
          { retellCallId: data.call_id },
        ].filter(Boolean) as Prisma.CallWhereInput[],
      },
    });

    try {
      const appointment = await this.appointments.book({
        organizationId: lead.organizationId,
        leadId: lead.id,
        callId: call?.id,
        startTime: data.start_time,
        timezone: data.timezone,
        email: data.email,
        meetingPurpose: data.meeting_purpose,
        idempotencyKey: `book:${lead.id}:${data.start_time}`,
      });

      return {
        appointment_id: appointment.id,
        confirmed_start_time: appointment.startTime.toISOString(),
        confirmed_end_time: appointment.endTime.toISOString(),
        timezone: appointment.timezone,
        meeting_url: appointment.meetingUrl,
        confirmation_message: `Meeting booked for ${appointment.startTime.toISOString()} (${appointment.timezone}).`,
      };
    } catch {
      return this.safeFail(
        'That time slot could not be confirmed. Please offer another available time or schedule a human follow-up.',
      );
    }
  }

  private async scheduleCallback(args: Record<string, unknown>, internalCallId?: string) {
    const data = scheduleCallbackArgsSchema.parse(args);
    const lead = await this.prisma.lead.findUnique({ where: { id: data.lead_id } });
    if (!lead) return this.safeFail('Lead not found');

    const key = `callback:${lead.id}:${data.callback_time}`;
    const existing = await this.prisma.followUp.findUnique({ where: { idempotencyKey: key } });
    if (existing) {
      return {
        follow_up_id: existing.id,
        confirmed_callback_time: existing.scheduledFor.toISOString(),
        status: existing.status,
      };
    }

    const call = await this.prisma.call.findFirst({
      where: {
        OR: [
          internalCallId ? { id: internalCallId } : undefined,
          { id: data.call_id },
          { retellCallId: data.call_id },
        ].filter(Boolean) as Prisma.CallWhereInput[],
      },
    });

    const followUp = await this.prisma.$transaction(async (tx) => {
      const fu = await tx.followUp.create({
        data: {
          leadId: lead.id,
          callId: call?.id,
          type: 'CALLBACK',
          scheduledFor: new Date(data.callback_time),
          status: 'PENDING',
          notes: data.reason,
          idempotencyKey: key,
        },
      });
      await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: LeadStatus.CALLBACK_REQUESTED,
          nextFollowUpAt: new Date(data.callback_time),
        },
      });
      return fu;
    });

    return {
      follow_up_id: followUp.id,
      confirmed_callback_time: followUp.scheduledFor.toISOString(),
      status: followUp.status,
    };
  }

  private async markDnc(args: Record<string, unknown>) {
    const data = markDoNotCallArgsSchema.parse(args);
    const lead = await this.prisma.lead.update({
      where: { id: data.lead_id },
      data: {
        doNotCall: true,
        status: LeadStatus.DO_NOT_CALL,
        notes: [undefined, data.reason].filter(Boolean).join('\n') || undefined,
      },
    });
    return { success: true, lead_status: lead.status };
  }

  private async updateLeadStatus(args: Record<string, unknown>) {
    const data = updateLeadStatusArgsSchema.parse(args);
    const lead = await this.prisma.lead.update({
      where: { id: data.lead_id },
      data: {
        status: data.status,
        notes: data.notes
          ? `${(await this.prisma.lead.findUnique({ where: { id: data.lead_id } }))?.notes ?? ''}\n${data.notes}`.trim()
          : undefined,
      },
    });
    return { success: true, current_status: lead.status };
  }

  private async getPricing(args: Record<string, unknown>) {
    const data = getPricingArgsSchema.parse(args);
    const settings = await this.prisma.organizationSettings.findFirst();
    const pricing = (settings?.pricingConfig ?? {}) as Record<string, Record<string, unknown>>;
    const key = data.package_name.toLowerCase();
    const match =
      pricing[key] ||
      pricing.starter ||
      Object.values(pricing).find((p) =>
        String(p.package ?? '')
          .toLowerCase()
          .includes(key),
      );

    if (!match) {
      return {
        package: data.package_name,
        approved_price_range: 'A specialist will confirm pricing details.',
        included_features: [],
        limitations: [],
        requires_custom_quote: true,
        message: 'Pricing detail unavailable. A specialist will confirm.',
      };
    }

    return {
      package: match.package,
      approved_price_range: match.approved_price_range,
      included_features: match.included_features,
      limitations: match.limitations,
      requires_custom_quote: match.requires_custom_quote,
    };
  }

  private async createHandoff(args: Record<string, unknown>, internalCallId?: string) {
    const data = createHandoffArgsSchema.parse(args);
    const lead = await this.prisma.lead.findUnique({ where: { id: data.lead_id } });
    if (!lead) return this.safeFail('Lead not found');

    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId: lead.organizationId },
    });
    const transferNumber =
      settings?.transferNumber || this.config.get('RETELL_TRANSFER_NUMBER') || '';
    if (!transferNumber) {
      return this.safeFail('Human transfer is unavailable right now. Offer a callback instead.');
    }

    const rep = await this.prisma.user.findFirst({
      where: { organizationId: lead.organizationId, role: 'SALES_REP' },
    });

    const call = await this.prisma.call.findFirst({
      where: {
        OR: [
          internalCallId ? { id: internalCallId } : undefined,
          { id: data.call_id },
          { retellCallId: data.call_id },
        ].filter(Boolean) as Prisma.CallWhereInput[],
      },
    });

    const handoff = await this.prisma.humanHandoff.create({
      data: {
        organizationId: lead.organizationId,
        leadId: lead.id,
        callId: call?.id,
        reason: data.reason,
        urgency: data.urgency,
        summary: data.summary,
        transferNumber,
        salesRepName: rep?.name ?? 'Sales specialist',
        transferType: settings?.transferType ?? 'WARM',
      },
    });

    return {
      handoff_id: handoff.id,
      transfer_number: transferNumber,
      sales_rep_name: handoff.salesRepName,
      transfer_type: handoff.transferType,
    };
  }
}
