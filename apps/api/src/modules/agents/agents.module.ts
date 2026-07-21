import { Module } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  providers: [AgentsService],
  controllers: [AgentsController],
  exports: [AgentsService],
})
export class AgentsModule {}
