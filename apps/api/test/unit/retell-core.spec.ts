import { describe, expect, it } from 'vitest';
import {
  buildDynamicVariables,
  RetellSignatureVerifier,
} from '../../src/modules/retell/retell.service';
import { createHmac } from 'crypto';
import {
  mapDisconnectionToOutcome,
  mapOutcomeToLeadStatus,
  clampScore,
  CallOutcome,
  LeadStatus,
} from '@closerai/shared';

describe('Retell signature verification', () => {
  const verifier = new RetellSignatureVerifier();
  const apiKey = 'test_api_key_123';

  it('accepts a valid signature', () => {
    const rawBody = '{"event":"call_started"}';
    const timestamp = String(Date.now());
    const digest = createHmac('sha256', apiKey).update(rawBody + timestamp).digest('hex');
    const header = `v=${timestamp},d=${digest}`;
    expect(verifier.verify(rawBody, apiKey, header, 300)).toBe(true);
  });

  it('rejects an invalid signature', () => {
    const rawBody = '{"event":"call_started"}';
    expect(verifier.verify(rawBody, apiKey, 'v=1,d=deadbeef', 300)).toBe(false);
  });
});

describe('dynamic variables', () => {
  it('stringifies and fills fallbacks', () => {
    const vars = buildDynamicVariables({
      lead_id: 'lead_1',
      first_name: 'Sarah',
      product_name: undefined as unknown as string,
    });
    expect(vars.lead_id).toBe('lead_1');
    expect(vars.first_name).toBe('Sarah');
    expect(vars.product_name).toBe('AutomateFlow');
    expect(vars.known_pain_point).toBe('not provided');
    expect(Object.values(vars).every((v) => typeof v === 'string')).toBe(true);
  });
});

describe('call outcome mapping', () => {
  it('maps disconnection reasons', () => {
    expect(mapDisconnectionToOutcome('dial_no_answer')).toBe(CallOutcome.NO_ANSWER);
    expect(mapDisconnectionToOutcome('dial_busy')).toBe(CallOutcome.BUSY);
    expect(mapDisconnectionToOutcome('voicemail_reached')).toBe(CallOutcome.VOICEMAIL);
  });
});

describe('lead status mapping', () => {
  it('maps outcomes to lead statuses', () => {
    expect(mapOutcomeToLeadStatus(CallOutcome.MEETING_BOOKED)).toBe(LeadStatus.MEETING_BOOKED);
    expect(mapOutcomeToLeadStatus(CallOutcome.DO_NOT_CALL)).toBe(LeadStatus.DO_NOT_CALL);
    expect(mapOutcomeToLeadStatus(CallOutcome.QUALIFIED_NO_MEETING)).toBe(LeadStatus.QUALIFIED);
  });
});

describe('lead score validation', () => {
  it('clamps scores to 0-100', () => {
    expect(clampScore(150)).toBe(100);
    expect(clampScore(-5)).toBe(0);
    expect(clampScore(72.6)).toBe(73);
  });
});
