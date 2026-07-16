export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
  timezone: string;
}

export interface IAvailabilityService {
  getAvailableSlots(input: {
    preferredDate: string;
    timezone: string;
    durationMinutes: number;
    organizationId: string;
  }): Promise<AvailabilitySlot[]>;
}

export const AVAILABILITY_SERVICE = Symbol('AVAILABILITY_SERVICE');
