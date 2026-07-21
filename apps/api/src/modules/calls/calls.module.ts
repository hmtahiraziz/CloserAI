import { Module, forwardRef } from '@nestjs/common';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';
import { LeadsModule } from '../leads/leads.module';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { RetellModule } from '../retell/retell.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [LeadsModule, forwardRef(() => CampaignsModule), RetellModule, AuditLogsModule],
  providers: [CallsService],
  controllers: [CallsController],
  exports: [CallsService],
})
export class CallsModule {}
