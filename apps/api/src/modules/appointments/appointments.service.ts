import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { LeadStatus, PipelineStage, isValidTimezone } from '@closerai/shared';
import { PrismaService } from '../prisma/prisma.service';
import { WeeklyScheduleAvailability } from './weekly-schedule.availability';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: WeeklyScheduleAvailability,
  ) {}

  list(organizationId: string, filter?: 'upcoming' | 'past' | 'canceled') {
    const now = new Date();
    const where: Record<string, unknown> = { organizationId };
    if (filter === 'upcoming') {
      where.startTime = { gte: now };
      where.status = { in: ['SCHEDULED', 'CONFIRMED'] };
    } else if (filter === 'past') {
      where.startTime = { lt: now };
    } else if (filter === 'canceled') {
      where.status = 'CANCELED';
    }
    return this.prisma.appointment.findMany({
      where,
      orderBy: { startTime: filter === 'past' ? 'desc' : 'asc' },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, companyName: true, email: true } },
        call: { select: { id: true, callOutcome: true } },
      },
    });
  }

  checkAvailability(organizationId: string, preferredDate: string, timezone: string, durationMinutes: number) {
    return this.availability.getAvailableSlots({
      preferredDate,
      timezone,
      durationMinutes,
      organizationId,
    });
  }

  async book(input: {
    organizationId: string;
    leadId: string;
    callId?: string;
    startTime: string;
    timezone: string;
    email: string;
    meetingPurpose?: string;
    idempotencyKey?: string;
  }) {
    if (!isValidTimezone(input.timezone)) {
      throw new BadRequestException({ code: 'INVALID_TIMEZONE', message: 'Invalid timezone' });
    }

    if (input.idempotencyKey) {
      const existing = await this.prisma.appointment.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) return existing;
    }

    const start = new Date(input.startTime);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException({ code: 'INVALID_TIME', message: 'Invalid start time' });
    }
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId: input.organizationId },
    });
    const duration = settings?.defaultMeetingDurationMinutes ?? 30;
    const end = new Date(start.getTime() + duration * 60_000);

    const conflict = await this.prisma.appointment.findFirst({
      where: {
        organizationId: input.organizationId,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });
    if (conflict) {
      throw new ConflictException({
        code: 'SLOT_BOOKED',
        message: 'Appointment slot already booked',
      });
    }

    const lead = await this.prisma.lead.findFirst({
      where: { id: input.leadId, organizationId: input.organizationId },
    });
    if (!lead) throw new NotFoundException({ code: 'LEAD_NOT_FOUND', message: 'Lead not found' });

    return this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.create({
        data: {
          organizationId: input.organizationId,
          leadId: input.leadId,
          callId: input.callId,
          title: input.meetingPurpose || `AutomateFlow discovery — ${lead.companyName}`,
          startTime: start,
          endTime: end,
          timezone: input.timezone,
          status: 'SCHEDULED',
          meetingType: 'DEMO',
          meetingUrl: `https://meet.closerai.demo/${cryptoRandom()}`,
          notes: `Booked for ${input.email}`,
          idempotencyKey: input.idempotencyKey,
        },
      });

      await tx.lead.update({
        where: { id: input.leadId },
        data: {
          status: LeadStatus.MEETING_BOOKED,
          pipelineStage: PipelineStage.DEMO_BOOKED,
          email: lead.email || input.email,
        },
      });

      return appointment;
    });
  }
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2, 10);
}
