import { CallOutcome, CallStatus, LeadStatus, PipelineStage } from './enums';

export function mapDisconnectionToOutcome(
  disconnectionReason: string | null | undefined,
  callStatus?: string | null,
): CallOutcome {
  const reason = (disconnectionReason ?? '').toLowerCase();
  const status = (callStatus ?? '').toLowerCase();

  if (reason.includes('voicemail') || status.includes('voicemail')) return CallOutcome.VOICEMAIL;
  if (reason.includes('dial_no_answer') || reason.includes('no_answer') || status === 'no_answer') {
    return CallOutcome.NO_ANSWER;
  }
  if (reason.includes('busy') || status === 'busy') return CallOutcome.BUSY;
  if (reason.includes('error') || reason.includes('failed') || status === 'error') {
    return CallOutcome.FAILED;
  }
  if (reason.includes('user_hangup') || reason.includes('agent_hangup') || reason.includes('call_transfer')) {
    return CallOutcome.UNKNOWN;
  }
  return CallOutcome.UNKNOWN;
}

export function mapCallStatusFromRetell(retellStatus: string | null | undefined): CallStatus {
  const s = (retellStatus ?? '').toLowerCase();
  if (s === 'registered' || s === 'ongoing') return CallStatus.IN_PROGRESS;
  if (s === 'ended') return CallStatus.COMPLETED;
  if (s === 'error') return CallStatus.FAILED;
  if (s === 'not_connected') return CallStatus.NO_ANSWER;
  return CallStatus.IN_PROGRESS;
}

export function mapOutcomeToLeadStatus(outcome: CallOutcome, qualified?: boolean): LeadStatus {
  switch (outcome) {
    case CallOutcome.MEETING_BOOKED:
      return LeadStatus.MEETING_BOOKED;
    case CallOutcome.CALLBACK_REQUESTED:
      return LeadStatus.CALLBACK_REQUESTED;
    case CallOutcome.DO_NOT_CALL:
      return LeadStatus.DO_NOT_CALL;
    case CallOutcome.NOT_INTERESTED:
    case CallOutcome.NOT_QUALIFIED:
      return LeadStatus.UNQUALIFIED;
    case CallOutcome.QUALIFIED_NO_MEETING:
      return LeadStatus.QUALIFIED;
    case CallOutcome.TRANSFERRED_TO_HUMAN:
      return LeadStatus.CONTACTED;
    case CallOutcome.VOICEMAIL:
    case CallOutcome.NO_ANSWER:
    case CallOutcome.BUSY:
      return LeadStatus.CONTACTED;
    case CallOutcome.FOLLOW_UP_REQUIRED:
      return LeadStatus.CONTACTED;
    default:
      if (qualified) return LeadStatus.QUALIFIED;
      return LeadStatus.CONTACTED;
  }
}

export function mapOutcomeToPipelineStage(
  outcome: CallOutcome,
  qualified?: boolean,
): PipelineStage {
  switch (outcome) {
    case CallOutcome.MEETING_BOOKED:
      return PipelineStage.DEMO_BOOKED;
    case CallOutcome.QUALIFIED_NO_MEETING:
      return PipelineStage.QUALIFIED;
    case CallOutcome.NOT_INTERESTED:
    case CallOutcome.NOT_QUALIFIED:
    case CallOutcome.DO_NOT_CALL:
      return PipelineStage.LOST;
    case CallOutcome.WRONG_PERSON:
      return PipelineStage.NEW_LEAD;
    default:
      if (qualified) return PipelineStage.QUALIFIED;
      return PipelineStage.DISCOVERY;
  }
}

export function parseEnumValue<T extends Record<string, string>>(
  enumObj: T,
  value: unknown,
  fallback: T[keyof T],
): T[keyof T] {
  if (typeof value !== 'string') return fallback;
  const upper = value.toUpperCase().replace(/-/g, '_');
  if (Object.values(enumObj).includes(upper)) {
    return upper as T[keyof T];
  }
  return fallback;
}
