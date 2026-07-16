import { Module } from '@nestjs/common';
import { DemoController } from './demo.controller';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [WebhooksModule],
  controllers: [DemoController],
})
export class DemoModule {}
