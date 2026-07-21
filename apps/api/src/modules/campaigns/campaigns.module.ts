import { Module, forwardRef } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { CallsModule } from '../calls/calls.module';

@Module({
  imports: [AuditLogsModule, forwardRef(() => CallsModule)],
  providers: [CampaignsService],
  controllers: [CampaignsController],
  exports: [CampaignsService],
})
export class CampaignsModule {}
