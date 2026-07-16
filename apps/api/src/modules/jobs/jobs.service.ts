import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { WebhookProcessorService } from '../webhooks/webhook-processor.service';

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly processor: WebhookProcessorService) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      this.processor.processPending().catch((err) => {
        this.logger.error('Job poll failed', err instanceof Error ? err.stack : String(err));
      });
    }, 5000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
