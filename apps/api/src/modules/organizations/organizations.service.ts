import { Injectable, NotFoundException } from '@nestjs/common';
import { updateOrganizationSchema, updateSettingsSchema } from '@closerai/shared';
import { Prisma } from '@closerai/database';
import { PrismaService } from '../prisma/prisma.service';
import { z } from 'zod';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { settings: true },
    });
    if (!org) throw new NotFoundException({ code: 'ORG_NOT_FOUND', message: 'Organization not found' });
    return org;
  }

  async update(organizationId: string, input: z.infer<typeof updateOrganizationSchema>) {
    return this.prisma.organization.update({
      where: { id: organizationId },
      data: input,
      include: { settings: true },
    });
  }

  async updateSettings(organizationId: string, input: z.infer<typeof updateSettingsSchema>) {
    await this.get(organizationId);
    const data: Prisma.OrganizationSettingsUpdateInput = {
      ...(input.defaultMeetingDurationMinutes !== undefined
        ? { defaultMeetingDurationMinutes: input.defaultMeetingDurationMinutes }
        : {}),
      ...(input.transferNumber !== undefined ? { transferNumber: input.transferNumber } : {}),
      ...(input.transferType !== undefined ? { transferType: input.transferType } : {}),
      ...(input.retellAgentId !== undefined ? { retellAgentId: input.retellAgentId } : {}),
      ...(input.retellPhoneNumber !== undefined ? { retellPhoneNumber: input.retellPhoneNumber } : {}),
      ...(input.complianceRules !== undefined ? { complianceRules: input.complianceRules } : {}),
      ...(input.businessHoursJson !== undefined
        ? { businessHoursJson: input.businessHoursJson as Prisma.InputJsonValue }
        : {}),
      ...(input.pricingConfig !== undefined
        ? { pricingConfig: input.pricingConfig as Prisma.InputJsonValue }
        : {}),
    };
    return this.prisma.organizationSettings.upsert({
      where: { organizationId },
      create: {
        organizationId,
        defaultMeetingDurationMinutes: input.defaultMeetingDurationMinutes ?? 30,
        transferNumber: input.transferNumber ?? null,
        transferType: input.transferType ?? 'WARM',
        retellAgentId: input.retellAgentId ?? null,
        retellPhoneNumber: input.retellPhoneNumber ?? null,
        complianceRules: input.complianceRules ?? null,
        businessHoursJson: (input.businessHoursJson ?? {}) as Prisma.InputJsonValue,
        pricingConfig: (input.pricingConfig ?? {}) as Prisma.InputJsonValue,
      },
      update: data,
    });
  }
}
