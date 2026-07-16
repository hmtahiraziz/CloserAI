import { parsePhoneNumberFromString } from 'libphonenumber-js';

export function toSafeString(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  const str = String(value).trim();
  return str.length > 0 ? str : fallback;
}

export function normalizePhone(phone: string, defaultCountry: 'US' | 'GB' = 'US'): string | null {
  try {
    const parsed = parsePhoneNumberFromString(phone, defaultCountry);
    if (!parsed || !parsed.isValid()) return null;
    return parsed.format('E.164');
  } catch {
    return null;
  }
}

export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function clampScore(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function hashPayload(payload: string): string {
  // Simple stable hash for idempotency keys when crypto not needed at type level
  let h = 0;
  for (let i = 0; i < payload.length; i++) {
    h = (Math.imul(31, h) + payload.charCodeAt(i)) | 0;
  }
  return `h${Math.abs(h).toString(16)}`;
}

export const LEAD_SCORE_BANDS = {
  LOW: { min: 0, max: 29, label: 'Low-quality or unqualified' },
  WEAK: { min: 30, max: 49, label: 'Weak fit or insufficient information' },
  POTENTIAL: { min: 50, max: 69, label: 'Potential opportunity requiring follow-up' },
  QUALIFIED: { min: 70, max: 84, label: 'Qualified opportunity' },
  HIGH_INTENT: { min: 85, max: 100, label: 'High-intent opportunity' },
} as const;

export function leadScoreBand(score: number): keyof typeof LEAD_SCORE_BANDS {
  if (score >= 85) return 'HIGH_INTENT';
  if (score >= 70) return 'QUALIFIED';
  if (score >= 50) return 'POTENTIAL';
  if (score >= 30) return 'WEAK';
  return 'LOW';
}
