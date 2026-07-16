import { createHmac, timingSafeEqual, createHash } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IRetellClient,
  IRetellSignatureVerifier,
  RetellOutboundCallRequest,
  RetellOutboundCallResult,
  RetellWebCallRequest,
  RetellWebCallResult,
  toSafeString,
  RetellDynamicVariables,
} from '@closerai/shared';
import { AppEnv } from '../../config/env';

@Injectable()
export class RetellSignatureVerifier implements IRetellSignatureVerifier {
  verify(
    rawBody: string,
    apiKey: string,
    signatureHeader: string,
    toleranceSeconds: number,
  ): boolean {
    if (!apiKey || !signatureHeader) return false;

    // Prefer SDK helper when present (docs); fall back to manual HMAC.
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Retell = require('retell-sdk').default ?? require('retell-sdk');
      if (typeof Retell.verify === 'function') {
        return Retell.verify(rawBody, apiKey, signatureHeader) === true;
      }
    } catch {
      // continue to manual
    }

    const match = signatureHeader.match(/^v=(\d+),d=(.+)$/);
    if (!match) return false;
    const [, timestamp, digest] = match;
    const ts = parseInt(timestamp, 10);
    if (!Number.isFinite(ts)) return false;
    if (Math.abs(Date.now() - ts) > toleranceSeconds * 1000) return false;

    const expected = createHmac('sha256', apiKey).update(rawBody + timestamp).digest('hex');
    try {
      const a = Buffer.from(digest, 'utf8');
      const b = Buffer.from(expected, 'utf8');
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function buildDynamicVariables(input: Partial<RetellDynamicVariables>): Record<string, string> {
  const keys: (keyof RetellDynamicVariables)[] = [
    'lead_id',
    'campaign_id',
    'first_name',
    'last_name',
    'company_name',
    'job_title',
    'industry',
    'company_size',
    'lead_source',
    'known_pain_point',
    'previous_interaction_summary',
    'product_name',
    'sales_objective',
    'assigned_sales_rep',
    'sales_rep_phone',
    'company_timezone',
    'lead_timezone',
  ];
  const out: Record<string, string> = {};
  for (const key of keys) {
    out[key] = toSafeString(input[key], key === 'product_name' ? 'AutomateFlow' : 'not provided');
  }
  return out;
}

@Injectable()
export class RetellClientService implements IRetellClient {
  private readonly logger = new Logger(RetellClientService.name);

  constructor(private readonly config: ConfigService<AppEnv, true>) {}

  private getApiKey(): string {
    return String(this.config.get('RETELL_API_KEY') || process.env.RETELL_API_KEY || '').trim();
  }

  async createPhoneCall(req: RetellOutboundCallRequest): Promise<RetellOutboundCallResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw Object.assign(new Error('Missing Retell configuration'), {
        code: 'MISSING_RETELL_CONFIG',
      });
    }

    // Dynamic import keeps tests mockable
    const RetellSdk = await import('retell-sdk');
    const Retell = RetellSdk.default;
    const client = new Retell({ apiKey });

    try {
      const response = await client.call.createPhoneCall({
        from_number: req.fromNumber,
        to_number: req.toNumber,
        override_agent_id: req.agentId,
        metadata: req.metadata,
        retell_llm_dynamic_variables: req.retellLlmDynamicVariables,
      });

      return {
        retellCallId: response.call_id,
        raw: response,
      };
    } catch (err) {
      this.logger.error('Retell createPhoneCall failed', err instanceof Error ? err.stack : String(err));
      throw Object.assign(new Error('Retell API error'), {
        code: 'RETELL_API_ERROR',
        cause: err,
      });
    }
  }

  async createWebCall(req: RetellWebCallRequest): Promise<RetellWebCallResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw Object.assign(new Error('Missing Retell configuration'), {
        code: 'MISSING_RETELL_CONFIG',
      });
    }

    const RetellSdk = await import('retell-sdk');
    const Retell = RetellSdk.default;
    const client = new Retell({ apiKey });

    try {
      const response = await client.call.createWebCall({
        agent_id: req.agentId,
        metadata: req.metadata,
        retell_llm_dynamic_variables: req.retellLlmDynamicVariables,
      });

      return {
        retellCallId: response.call_id,
        accessToken: response.access_token,
        raw: response,
      };
    } catch (err) {
      this.logger.error('Retell createWebCall failed', err instanceof Error ? err.stack : String(err));
      throw Object.assign(new Error('Retell API error'), {
        code: 'RETELL_API_ERROR',
        cause: err,
      });
    }
  }
}
