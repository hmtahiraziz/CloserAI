import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().default(4000),
  WEB_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:4000'),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  COOKIE_SECRET: z.string().min(32),
  RETELL_API_KEY: z.string().optional().default(''),
  RETELL_AGENT_ID: z.string().optional().default(''),
  RETELL_PHONE_NUMBER: z.string().optional().default(''),
  RETELL_WEBHOOK_URL: z.string().optional().default(''),
  RETELL_TRANSFER_NUMBER: z.string().optional().default(''),
  RETELL_WEBHOOK_TOLERANCE_SECONDS: z.coerce.number().default(300),
  DEMO_MODE: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  DEFAULT_TIMEZONE: z.string().default('America/New_York'),
  DEFAULT_MEETING_DURATION_MINUTES: z.coerce.number().default(30),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): AppEnv {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${msg}`);
  }
  return parsed.data;
}
