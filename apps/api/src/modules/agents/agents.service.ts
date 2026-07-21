import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateAgentInput, UpdateAgentInput } from '@closerai/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.agentConfiguration.findMany({
      where: { organizationId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      include: {
        campaigns: { select: { id: true, name: true, status: true } },
        _count: { select: { campaigns: true } },
      },
    });
  }

  async get(organizationId: string, id: string) {
    const agent = await this.prisma.agentConfiguration.findFirst({
      where: { id, organizationId },
      include: {
        campaigns: { select: { id: true, name: true, status: true } },
      },
    });
    if (!agent) throw new NotFoundException({ code: 'AGENT_NOT_FOUND', message: 'Agent not found' });
    return agent;
  }

  async create(organizationId: string, input: CreateAgentInput) {
    if (input.campaignId) {
      await this.ensureCampaign(organizationId, input.campaignId);
    }

    return this.prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.agentConfiguration.updateMany({
          where: { organizationId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const existingCount = await tx.agentConfiguration.count({ where: { organizationId } });

      return tx.agentConfiguration.create({
        data: {
          organizationId,
          agentName: input.agentName,
          companyName: input.companyName ?? 'AutomateFlow',
          retellAgentId: input.retellAgentId,
          retellPhoneNumber: input.retellPhoneNumber,
          isDefault: input.isDefault ?? existingCount === 0,
          agentPersona: input.agentPersona ?? null,
          primaryObjective: input.primaryObjective ?? null,
          openingMessage: input.openingMessage ?? null,
          valueProposition: input.valueProposition ?? null,
          qualificationRules: input.qualificationRules ?? null,
          objectionRules: input.objectionRules ?? null,
          transferRules: input.transferRules ?? null,
          bookingRules: input.bookingRules ?? null,
          complianceRules: input.complianceRules ?? null,
          campaignId: input.campaignId ?? null,
        },
      });
    });
  }

  async update(organizationId: string, id: string, input: UpdateAgentInput) {
    await this.get(organizationId, id);
    if (input.campaignId) {
      await this.ensureCampaign(organizationId, input.campaignId);
    }

    return this.prisma.$transaction(async (tx) => {
      if (input.isDefault === true) {
        await tx.agentConfiguration.updateMany({
          where: { organizationId, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }

      return tx.agentConfiguration.update({
        where: { id },
        data: {
          ...(input.agentName !== undefined ? { agentName: input.agentName } : {}),
          ...(input.companyName !== undefined ? { companyName: input.companyName } : {}),
          ...(input.retellAgentId !== undefined ? { retellAgentId: input.retellAgentId } : {}),
          ...(input.retellPhoneNumber !== undefined
            ? { retellPhoneNumber: input.retellPhoneNumber }
            : {}),
          ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
          ...(input.agentPersona !== undefined ? { agentPersona: input.agentPersona } : {}),
          ...(input.primaryObjective !== undefined
            ? { primaryObjective: input.primaryObjective }
            : {}),
          ...(input.openingMessage !== undefined ? { openingMessage: input.openingMessage } : {}),
          ...(input.valueProposition !== undefined
            ? { valueProposition: input.valueProposition }
            : {}),
          ...(input.qualificationRules !== undefined
            ? { qualificationRules: input.qualificationRules }
            : {}),
          ...(input.objectionRules !== undefined ? { objectionRules: input.objectionRules } : {}),
          ...(input.transferRules !== undefined ? { transferRules: input.transferRules } : {}),
          ...(input.bookingRules !== undefined ? { bookingRules: input.bookingRules } : {}),
          ...(input.complianceRules !== undefined
            ? { complianceRules: input.complianceRules }
            : {}),
          ...(input.campaignId !== undefined ? { campaignId: input.campaignId } : {}),
        },
      });
    });
  }

  async remove(organizationId: string, id: string) {
    const agent = await this.get(organizationId, id);
    if (agent.campaigns.length > 0) {
      throw new BadRequestException({
        code: 'AGENT_IN_USE',
        message: 'Unassign this agent from campaigns before deleting it',
      });
    }
    await this.prisma.agentConfiguration.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureCampaign(organizationId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
      select: { id: true },
    });
    if (!campaign) {
      throw new BadRequestException({ code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found' });
    }
  }
}
