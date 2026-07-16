import { describe, expect, it } from 'vitest';
import { CallOutcome, LeadStatus, mapOutcomeToLeadStatus, mapOutcomeToPipelineStage, PipelineStage } from '@closerai/shared';

describe('appointment conflict detection contract', () => {
  it('detects overlapping intervals', () => {
    const existing = { start: Date.parse('2026-07-20T15:00:00Z'), end: Date.parse('2026-07-20T15:30:00Z') };
    const candidate = { start: Date.parse('2026-07-20T15:15:00Z'), end: Date.parse('2026-07-20T15:45:00Z') };
    const overlaps = candidate.start < existing.end && candidate.end > existing.start;
    expect(overlaps).toBe(true);
  });
});

describe('do-not-call status mapping', () => {
  it('maps DNC outcome to DNC lead status and lost pipeline', () => {
    expect(mapOutcomeToLeadStatus(CallOutcome.DO_NOT_CALL)).toBe(LeadStatus.DO_NOT_CALL);
    expect(mapOutcomeToPipelineStage(CallOutcome.DO_NOT_CALL)).toBe(PipelineStage.LOST);
  });
});
