import { describe, expect, it } from 'vitest';
import { clampScore, leadScoreBand, normalizePhone, toSafeString } from './utils';
import { mapOutcomeToPipelineStage, parseEnumValue } from './mappers';
import { CallOutcome, PipelineStage } from './enums';

describe('shared utils', () => {
  it('normalizes phones', () => {
    expect(normalizePhone('+1 (415) 555-2671')).toBe('+14155552671');
    expect(normalizePhone('not-a-phone')).toBeNull();
  });

  it('safe strings', () => {
    expect(toSafeString(null, 'x')).toBe('x');
    expect(toSafeString('  hi ')).toBe('hi');
  });

  it('score bands', () => {
    expect(leadScoreBand(10)).toBe('LOW');
    expect(leadScoreBand(88)).toBe('HIGH_INTENT');
    expect(clampScore('91')).toBe(91);
  });

  it('pipeline mapping', () => {
    expect(mapOutcomeToPipelineStage(CallOutcome.MEETING_BOOKED)).toBe(PipelineStage.DEMO_BOOKED);
    expect(parseEnumValue(CallOutcome, 'meeting_booked', CallOutcome.UNKNOWN)).toBe(
      CallOutcome.MEETING_BOOKED,
    );
  });
});
