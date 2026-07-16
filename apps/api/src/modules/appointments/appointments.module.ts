import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { WeeklyScheduleAvailability } from './weekly-schedule.availability';
import { AVAILABILITY_SERVICE } from './availability.interface';

@Module({
  providers: [
    AppointmentsService,
    WeeklyScheduleAvailability,
    { provide: AVAILABILITY_SERVICE, useExisting: WeeklyScheduleAvailability },
  ],
  controllers: [AppointmentsController],
  exports: [AppointmentsService, WeeklyScheduleAvailability],
})
export class AppointmentsModule {}
