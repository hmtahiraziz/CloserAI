import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [OrganizationsModule],
  controllers: [SettingsController],
})
export class SettingsModule {}
