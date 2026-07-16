import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhookProcessorService } from './webhook-processor.service';
import { RetellModule } from '../retell/retell.module';

@Module({
  imports: [RetellModule],
  controllers: [WebhooksController],
  providers: [WebhookProcessorService],
  exports: [WebhookProcessorService],
})
export class WebhooksModule {}
