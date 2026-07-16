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
        _count: { select: { campaignLeads: true, calls: true } },
      },
    });
  }

  async get(organizationId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
      include: {
        campaignLeads: {
          include: { lead: true },
          take: 100,
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { campaignLeads: true, calls: true } },
      },
    });
    if (!campaign) throw new NotFoundException({ code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found' });
    return campaign;
  }

  create(organizationId: string, input: CreateCampaignInput) {
    return this.prisma.campaign.create({
      data: {
        organizationId,
        name: input.name,
        description: input.description ?? null,
        retellAgentId: input.retellAgentId ?? null,
        retellPhoneNumber: input.retellPhoneNumber ?? null,
        productName: input.productName ?? 'AutomateFlow',
        targetAudience: input.targetAudience ?? null,
        defaultObjective: input.defaultObjective ?? null,
        status: input.status ?? CampaignStatus.DRAFT,
      },
    });
  }

  async update(organizationId: string, id: string, input: Partial<CreateCampaignInput>) {
    await this.get(organizationId, id);
    return this.prisma.campaign.update({ where: { id }, data: input });
  }

  async setStatus(organizationId: string, id: string, status: CampaignStatus) {
    await this.get(organizationId, id);
    return this.prisma.campaign.update({ where: { id }, data: { status } });
  }

  async assignLeads(organizationId: string, campaignId: string, leadIds: string[]) {
    await this.get(organizationId, campaignId);
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
    const campaign = await this.get(organizationId, campaignId);
    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException({ code: 'INACTIVE_CAMPAIGN', message: 'Campaign is not active' });
    }
    return campaign;
  }
}
