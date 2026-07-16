import { Module } from '@nestjs/common';
import { RetellFunctionsController } from './retell-functions.controller';
import { RetellModule } from '../retell/retell.module';
import { AppointmentsModule } from '../appointments/appointments.module';

@Module({
  imports: [RetellModule, AppointmentsModule],
  controllers: [RetellFunctionsController],
})
export class RetellFunctionsModule {}
