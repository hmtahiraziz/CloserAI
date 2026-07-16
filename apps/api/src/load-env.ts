import { resolve } from 'path';
import { existsSync } from 'fs';
import { config as loadEnv } from 'dotenv';

/**
 * Force-load env files with override so empty inherited RETELL_* vars
 * from the parent process cannot block values from apps/api/.env.
 * Import this module first from main.ts (side-effect).
 */
const candidates = [
  resolve(process.cwd(), '../../.env'), // monorepo root when cwd is apps/api
  resolve(process.cwd(), '.env'),
  resolve(__dirname, '../../../.env'), // monorepo root when running from dist/
  resolve(__dirname, '../.env'), // apps/api/.env when running from dist/
];

const loaded: string[] = [];
for (const file of candidates) {
  if (!existsSync(file)) continue;
  loadEnv({ path: file, override: true, quiet: true });
  loaded.push(file);
}

export const loadedEnvFiles = loaded;
