import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadInput, UpdateLeadInput, LeadStatus, PipelineStage, normalizePhone } from '@closerai/shared';
import { Prisma } from '@closerai/database';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    organizationId: string,
    query: {
      page: number;
      pageSize: number;
      search?: string;
      status?: LeadStatus;
      pipelineStage?: PipelineStage;
      campaignId?: string;
      minScore?: number;
      maxScore?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const where: Prisma.LeadWhereInput = { organizationId };
    if (query.status) where.status = query.status;
    if (query.pipelineStage) where.pipelineStage = query.pipelineStage;
    if (query.search) {
      const s = query.search;
      where.OR = [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { companyName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s } },
      ];
    }
    if (query.campaignId) {
      where.campaignLeads = { some: { campaignId: query.campaignId } };
    }

    const sortMap: Record<string, Prisma.LeadOrderByWithRelationInput> = {
      newest: { createdAt: query.sortOrder ?? 'desc' },
      dealValue: { estimatedDealValue: query.sortOrder ?? 'desc' },
      nextFollowUp: { nextFollowUpAt: query.sortOrder ?? 'asc' },
      score: { updatedAt: query.sortOrder ?? 'desc' },
    };
    const orderBy = sortMap[query.sortBy ?? 'newest'] ?? { createdAt: 'desc' };

    const [total, items] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          campaignLeads: { include: { campaign: { select: { id: true, name: true } } } },
          calls: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { leadScore: true, callOutcome: true, createdAt: true },
          },
        },
      }),
    ]);

    let filtered = items;
    if (query.minScore !== undefined || query.maxScore !== undefined) {
      filtered = items.filter((l) => {
        const score = l.calls[0]?.leadScore;
        if (score == null) return false;
        if (query.minScore !== undefined && score < query.minScore) return false;
        if (query.maxScore !== undefined && score > query.maxScore) return false;
        return true;
      });
    }

    return {
      items: filtered,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async get(organizationId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId },
      include: {
        calls: {
          orderBy: { createdAt: 'desc' },
          include: {
            qualification: true,
            objections: true,
            competitorMentions: true,
            appointments: true,
          },
        },
        appointments: { orderBy: { startTime: 'desc' } },
        followUps: { orderBy: { scheduledFor: 'desc' } },
        campaignLeads: { include: { campaign: true } },
        humanHandoffs: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!lead) throw new NotFoundException({ code: 'LEAD_NOT_FOUND', message: 'Lead not found' });
    return lead;
  }

  async create(organizationId: string, input: CreateLeadInput) {
    const phone = normalizePhone(input.phone);
    if (!phone) {
      throw new BadRequestException({ code: 'INVALID_PHONE', message: 'Invalid lead phone number' });
    }
    return this.prisma.lead.create({
      data: {
        organizationId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email || null,
        phone,
        companyName: input.companyName,
        jobTitle: input.jobTitle || null,
        companySize: input.companySize || null,
        industry: input.industry || null,
        website: input.website || null,
        country: input.country || null,
        timezone: input.timezone || null,
        source: input.source || null,
        status: input.status ?? LeadStatus.NEW,
        pipelineStage: input.pipelineStage ?? PipelineStage.NEW_LEAD,
        estimatedDealValue: input.estimatedDealValue ?? null,
        preferredCallTime: input.preferredCallTime || null,
        notes: input.notes || null,
      },
    });
  }

  async update(organizationId: string, id: string, input: UpdateLeadInput) {
    await this.ensureOrg(organizationId, id);
    const data: Prisma.LeadUpdateInput = { ...input } as Prisma.LeadUpdateInput;
    if (input.phone) {
      const phone = normalizePhone(input.phone);
      if (!phone) {
        throw new BadRequestException({ code: 'INVALID_PHONE', message: 'Invalid lead phone number' });
      }
      (data as { phone: string }).phone = phone;
    }
    if (input.website === '') (data as { website: null }).website = null;
    return this.prisma.lead.update({ where: { id }, data });
  }

  async importCsv(organizationId: string, rows: CreateLeadInput[]) {
    const created = [];
    const errors: Array<{ row: number; message: string }> = [];
    for (let i = 0; i < rows.length; i++) {
      try {
        created.push(await this.create(organizationId, rows[i]));
      } catch (e) {
        errors.push({ row: i + 1, message: e instanceof Error ? e.message : 'Failed' });
      }
    }
    return { created: created.length, errors, items: created };
  }

  async ensureNotDoNotCall(organizationId: string, leadId: string) {
    const lead = await this.get(organizationId, leadId);
    if (lead.doNotCall || lead.status === LeadStatus.DO_NOT_CALL) {
      throw new ForbiddenException({
        code: 'DO_NOT_CALL',
        message: 'Lead is marked do-not-call and cannot be contacted',
      });
    }
    return lead;
  }

  private async ensureOrg(organizationId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id, organizationId } });
    if (!lead) throw new NotFoundException({ code: 'LEAD_NOT_FOUND', message: 'Lead not found' });
    return lead;
  }
}
