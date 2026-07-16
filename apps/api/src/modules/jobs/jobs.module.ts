import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [WebhooksModule],
  providers: [JobsService],
})
export class JobsModule {}
