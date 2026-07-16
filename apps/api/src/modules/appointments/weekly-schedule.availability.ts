import { Injectable } from '@nestjs/common';
import { isValidTimezone } from '@closerai/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilitySlot, IAvailabilityService } from './availability.interface';

const DEFAULT_HOURS: Record<string, { start: string; end: string } | null> = {
  monday: { start: '09:00', end: '17:00' },
  tuesday: { start: '09:00', end: '17:00' },
  wednesday: { start: '09:00', end: '17:00' },
  thursday: { start: '09:00', end: '17:00' },
  friday: { start: '09:00', end: '17:00' },
  saturday: null,
  sunday: null,
};

@Injectable()
export class WeeklyScheduleAvailability implements IAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getAvailableSlots(input: {
    preferredDate: string;
    timezone: string;
    durationMinutes: number;
    organizationId: string;
  }): Promise<AvailabilitySlot[]> {
    if (!isValidTimezone(input.timezone)) {
      throw Object.assign(new Error('Invalid timezone'), { code: 'INVALID_TIMEZONE' });
    }

    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId: input.organizationId },
    });
    const hours = (settings?.businessHoursJson as typeof DEFAULT_HOURS) || DEFAULT_HOURS;

    const slots: AvailabilitySlot[] = [];
    const startDate = new Date(input.preferredDate);
    if (Number.isNaN(startDate.getTime())) {
      throw Object.assign(new Error('Invalid preferred date'), { code: 'INVALID_DATE' });
    }

    for (let dayOffset = 0; dayOffset < 14 && slots.length < 5; dayOffset++) {
      const day = new Date(startDate);
      day.setUTCDate(startDate.getUTCDate() + dayOffset);
      const weekday = day
        .toLocaleDateString('en-US', { weekday: 'long', timeZone: input.timezone })
        .toLowerCase();
      const window = hours[weekday] ?? DEFAULT_HOURS[weekday];
      if (!window) continue;

      for (const hour of [9, 11, 13, 15]) {
        if (slots.length >= 5) break;
        const start = new Date(day);
        // Approximate local hour as UTC for MVP schedule generation
        start.setUTCHours(hour, 0, 0, 0);
        if (start.getTime() < Date.now()) continue;
        const end = new Date(start.getTime() + input.durationMinutes * 60_000);

        const conflict = await this.prisma.appointment.findFirst({
          where: {
            organizationId: input.organizationId,
            status: { in: ['SCHEDULED', 'CONFIRMED'] },
            startTime: { lt: end },
            endTime: { gt: start },
          },
        });
        if (conflict) continue;

        slots.push({
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          timezone: input.timezone,
        });
      }
    }

    return slots.slice(0, 5);
  }
}
