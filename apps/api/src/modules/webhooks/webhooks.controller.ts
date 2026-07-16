import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  UnauthorizedException,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Public } from '../../common/guards/auth.guard';
import { RetellSignatureVerifier } from '../retell/retell.service';
import { WebhookProcessorService } from './webhook-processor.service';
import { AppEnv } from '../../config/env';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly verifier: RetellSignatureVerifier,
    private readonly processor: WebhookProcessorService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  @Public()
  @Post('retell')
  @HttpCode(200)
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiExcludeEndpoint()
  async retell(
    @Req() req: Request & { rawBody?: Buffer },
    @Res() res: Response,
    @Headers('x-retell-signature') signature: string,
  ) {
    const rawBody = req.rawBody
      ? req.rawBody.toString('utf8')
      : typeof req.body === 'string'
        ? req.body
        : Buffer.isBuffer(req.body)
          ? req.body.toString('utf8')
          : JSON.stringify(req.body ?? {});

    const apiKey = this.config.get('RETELL_API_KEY');
    const tolerance = this.config.get('RETELL_WEBHOOK_TOLERANCE_SECONDS');

    if (
      !this.verifier.verify(rawBody, apiKey, signature ?? '', tolerance)
    ) {
      throw new UnauthorizedException({
        code: 'INVALID_WEBHOOK_SIGNATURE',
        message: 'Invalid Retell webhook signature',
      });
    }

    let parsed: { event?: string; call?: Record<string, unknown> };
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return res.status(400).json({ success: false, error: { code: 'MALFORMED', message: 'Invalid JSON' } });
    }

    const result = await this.processor.ingest(
      rawBody,
      String(parsed.event ?? 'unknown'),
      (parsed.call ?? {}) as Record<string, unknown>,
    );

    return res.status(200).json({ success: true, data: result });
  }
}
