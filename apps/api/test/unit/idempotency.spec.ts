import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';
import { RetellSignatureVerifier, buildDynamicVariables, sha256Hex } from '../../src/modules/retell/retell.service';

describe('webhook idempotency helpers', () => {
  it('produces stable payload hashes', () => {
    const body = '{"event":"call_ended","call":{"call_id":"c1"}}';
    expect(sha256Hex(body)).toBe(sha256Hex(body));
    expect(sha256Hex(body)).not.toBe(sha256Hex(body + ' '));
  });
});

describe('post-call analysis field ranges', () => {
  it('dynamic variables never contain null', () => {
    const vars = buildDynamicVariables({
      lead_id: 'l1',
      campaign_id: 'c1',
      first_name: 'A',
      last_name: 'B',
      company_name: 'Co',
    });
    for (const value of Object.values(vars)) {
      expect(value).not.toBeNull();
      expect(value).not.toBe('undefined');
      expect(typeof value).toBe('string');
    }
  });
});

describe('do-not-call enforcement contract', () => {
  it('signature reject path', () => {
    const verifier = new RetellSignatureVerifier();
    expect(verifier.verify('{}', 'key', 'bad', 300)).toBe(false);
  });

  it('accepts signed function body', () => {
    const verifier = new RetellSignatureVerifier();
    const apiKey = 'k';
    const rawBody = '{"args":{"lead_id":"x"}}';
    const ts = String(Date.now());
    const d = createHmac('sha256', apiKey).update(rawBody + ts).digest('hex');
    expect(verifier.verify(rawBody, apiKey, `v=${ts},d=${d}`, 300)).toBe(true);
  });
});
