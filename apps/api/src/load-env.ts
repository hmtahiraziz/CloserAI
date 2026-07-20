import { resolve } from 'path';
import { existsSync } from 'fs';
import { config as loadEnv } from 'dotenv';

/**
 * Load .env files for local/dev only.
 * On Vercel (and other prod hosts), platform env vars must win — never override them
 * with a bundled localhost DATABASE_URL.
 */
const isVercel = process.env.VERCEL === '1';
const isProd = process.env.NODE_ENV === 'production';

const loaded: string[] = [];

if (!isVercel && !isProd) {
  const candidates = [
    resolve(process.cwd(), '../../.env'), // monorepo root when cwd is apps/api
    resolve(process.cwd(), '.env'),
    resolve(__dirname, '../../../.env'), // monorepo root when running from dist/
    resolve(__dirname, '../.env'), // apps/api/.env when running from dist/
  ];

  for (const file of candidates) {
    if (!existsSync(file)) continue;
    // override so empty inherited RETELL_* vars from the parent shell cannot block apps/api/.env
    loadEnv({ path: file, override: true, quiet: true });
    loaded.push(file);
  }
}

export const loadedEnvFiles = loaded;
