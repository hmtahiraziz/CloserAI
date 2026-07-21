import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CampaignStatus, CreateCampaignInput } from '@closerai/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.campaign.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        agentConfiguration: {
          select: {
            id: true,
            agentName: true,
            retellAgentId: true,
            retellPhoneNumber: true,
            isDefault: true,
          },
        },
        _count: { select: { campaignLeads: true, calls: true } },
      },
    });
  }

  async get(organizationId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
      include: {
        agentConfiguration: {
          select: {
            id: true,
            agentName: true,
            companyName: true,
            retellAgentId: true,
            retellPhoneNumber: true,
            isDefault: true,
            primaryObjective: true,
          },
        },
        campaignLeads: {
          include: { lead: true },
          take: 100,
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { campaignLeads: true, calls: true } },
      },
    });
    if (!campaign) throw new NotFoundException({ code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found' });
    const stats = await this.stats(organizationId, id);
    return { ...campaign, stats };
  }

  async stats(organizationId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!campaign) throw new NotFoundException({ code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found' });

    const [campaignLeads, calls] = await Promise.all([
      this.prisma.campaignLead.findMany({
        where: { campaignId: id },
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              pipelineStage: true,
              status: true,
              doNotCall: true,
            },
          },
        },
      }),
      this.prisma.call.findMany({
        where: { organizationId, campaignId: id },
        orderBy: { createdAt: 'desc' },
        include: {
          lead: {
            select: { id: true, firstName: true, lastName: true, companyName: true },
          },
        },
      }),
    ]);

    const leadStatusCounts: Record<string, number> = {};
    for (const cl of campaignLeads) {
      leadStatusCounts[cl.status] = (leadStatusCounts[cl.status] ?? 0) + 1;
    }

    const contacted = campaignLeads.filter((cl) => cl.attemptCount > 0).length;
    const converted = campaignLeads.filter((cl) =>
      ['DEMO_BOOKED', 'PROPOSAL', 'NEGOTIATION', 'WON'].includes(cl.lead.pipelineStage),
    ).length;

    const connectedCalls = calls.filter(
      (c) =>
        (['COMPLETED', 'IN_PROGRESS'].includes(c.status) && (c.durationSeconds ?? 0) > 30) ||
        c.status === 'COMPLETED',
    );
    const meetingsBooked = calls.filter((c) => c.callOutcome === 'MEETING_BOOKED').length;
    const qualified = calls.filter((c) => c.qualified === true).length;
    const scored = calls.filter((c) => c.leadScore != null);
    const avgLeadScore =
      scored.length === 0
        ? 0
        : Math.round((scored.reduce((s, c) => s + (c.leadScore ?? 0), 0) / scored.length) * 10) / 10;

    const outcomes: Record<string, number> = {};
    for (const c of calls) {
      outcomes[c.callOutcome] = (outcomes[c.callOutcome] ?? 0) + 1;
    }

    const pendingDial =
      (leadStatusCounts['PENDING'] ?? 0) + (leadStatusCounts['FAILED'] ?? 0);

    return {
      totalLeads: campaignLeads.length,
      contacted,
      converted,
      conversionRate: contacted ? converted / contacted : 0,
      pendingDial,
      leadStatusCounts,
      totalCalls: calls.length,
      connectedCalls: connectedCalls.length,
      meetingsBooked,
      qualified,
      qualificationRate: connectedCalls.length ? qualified / connectedCalls.length : 0,
      meetingBookingRate: connectedCalls.length ? meetingsBooked / connectedCalls.length : 0,
      averageLeadScore: avgLeadScore,
      callsByOutcome: Object.entries(outcomes)
        .map(([outcome, count]) => ({ outcome, count }))
        .sort((a, b) => b.count - a.count),
      recentCalls: calls.slice(0, 25).map((c) => ({
        id: c.id,
        status: c.status,
        callOutcome: c.callOutcome,
        leadScore: c.leadScore,
        durationSeconds: c.durationSeconds,
        createdAt: c.createdAt,
        lead: c.lead,
      })),
    };
  }

  async create(organizationId: string, input: CreateCampaignInput) {
    const agent = await this.resolveAgent(organizationId, input.agentConfigurationId);
    return this.prisma.campaign.create({
      data: {
        organizationId,
        name: input.name,
        description: input.description ?? null,
        agentConfigurationId: agent?.id ?? null,
        retellAgentId: input.retellAgentId ?? agent?.retellAgentId ?? null,
        retellPhoneNumber: input.retellPhoneNumber ?? agent?.retellPhoneNumber ?? null,
        productName: input.productName ?? agent?.companyName ?? 'AutomateFlow',
        targetAudience: input.targetAudience ?? null,
        defaultObjective: input.defaultObjective ?? agent?.primaryObjective ?? null,
        status: input.status ?? CampaignStatus.DRAFT,
      },
      include: {
        agentConfiguration: {
          select: { id: true, agentName: true, retellPhoneNumber: true },
        },
      },
    });
  }

  async update(organizationId: string, id: string, input: Partial<CreateCampaignInput>) {
    await this.ensureExists(organizationId, id);
    const agent =
      input.agentConfigurationId !== undefined
        ? await this.resolveAgent(organizationId, input.agentConfigurationId)
        : null;

    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.productName !== undefined ? { productName: input.productName } : {}),
        ...(input.targetAudience !== undefined ? { targetAudience: input.targetAudience } : {}),
        ...(input.defaultObjective !== undefined ? { defaultObjective: input.defaultObjective } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.agentConfigurationId !== undefined
          ? {
              agentConfigurationId: agent?.id ?? null,
              retellAgentId: input.retellAgentId ?? agent?.retellAgentId ?? null,
              retellPhoneNumber: input.retellPhoneNumber ?? agent?.retellPhoneNumber ?? null,
            }
          : {
              ...(input.retellAgentId !== undefined ? { retellAgentId: input.retellAgentId } : {}),
              ...(input.retellPhoneNumber !== undefined
                ? { retellPhoneNumber: input.retellPhoneNumber }
                : {}),
            }),
      },
      include: {
        agentConfiguration: {
          select: { id: true, agentName: true, retellPhoneNumber: true },
        },
      },
    });
  }

  private async resolveAgent(organizationId: string, agentConfigurationId?: string | null) {
    if (!agentConfigurationId) return null;
    const agent = await this.prisma.agentConfiguration.findFirst({
      where: { id: agentConfigurationId, organizationId },
    });
    if (!agent) {
      throw new BadRequestException({ code: 'AGENT_NOT_FOUND', message: 'Agent not found' });
    }
    return agent;
  }

  async setStatus(organizationId: string, id: string, status: CampaignStatus) {
    await this.ensureExists(organizationId, id);
    return this.prisma.campaign.update({ where: { id }, data: { status } });
  }

  async assignLeads(organizationId: string, campaignId: string, leadIds: string[]) {
    await this.ensureExists(organizationId, campaignId);
    const leads = await this.prisma.lead.findMany({
      where: { organizationId, id: { in: leadIds } },
      select: { id: true },
    });
    if (leads.length !== leadIds.length) {
      throw new BadRequestException({ code: 'INVALID_LEADS', message: 'One or more leads not found' });
    }
    await this.prisma.campaignLead.createMany({
      data: leads.map((l) => ({ campaignId, leadId: l.id })),
      skipDuplicates: true,
    });
    return this.get(organizationId, campaignId);
  }

  async getActive(organizationId: string, campaignId: string) {
    const campaign = await this.ensureExists(organizationId, campaignId);
    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException({ code: 'INACTIVE_CAMPAIGN', message: 'Campaign is not active' });
    }
    return campaign;
  }

  /** Mark campaign COMPLETED when every assigned lead is past pending/queued. */
  async maybeComplete(campaignId: string) {
    const remaining = await this.prisma.campaignLead.count({
      where: {
        campaignId,
        status: { in: ['PENDING', 'QUEUED'] },
      },
    });
    if (remaining > 0) return null;

    const total = await this.prisma.campaignLead.count({ where: { campaignId } });
    if (total === 0) return null;

    return this.prisma.campaign.updateMany({
      where: { id: campaignId, status: CampaignStatus.ACTIVE },
      data: { status: CampaignStatus.COMPLETED },
    });
  }

  private async ensureExists(organizationId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({ where: { id, organizationId } });
    if (!campaign) throw new NotFoundException({ code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found' });
    return campaign;
  }
}
