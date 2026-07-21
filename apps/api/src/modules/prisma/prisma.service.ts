import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@closerai/database';

const CONNECT_ATTEMPTS = 5;
const CONNECT_BASE_DELAY_MS = 1500;

function isTransientDbError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { errorCode?: string; code?: string; message?: string };
  const code = e.errorCode ?? e.code;
  // P1001: can't reach DB (Neon cold start / brief network blip)
  // P1017: server closed connection
  return code === 'P1001' || code === 'P1017' || /can't reach database server/i.test(e.message ?? '');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    let lastError: unknown;
    for (let attempt = 1; attempt <= CONNECT_ATTEMPTS; attempt++) {
      try {
        await this.$connect();
        if (attempt > 1) {
          this.logger.log(`Database connected after ${attempt} attempts`);
        }
        return;
      } catch (error) {
        lastError = error;
        if (!isTransientDbError(error) || attempt === CONNECT_ATTEMPTS) {
          throw error;
        }
        const delay = CONNECT_BASE_DELAY_MS * attempt;
        this.logger.warn(
          `Database unreachable (attempt ${attempt}/${CONNECT_ATTEMPTS}); retrying in ${delay}ms…`,
        );
        await sleep(delay);
      }
    }
    throw lastError;
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
