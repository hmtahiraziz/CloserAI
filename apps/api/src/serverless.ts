import './load-env';
import type { Request, Response } from 'express';
import { getExpressApp } from './create-app';

/**
 * Vercel serverless entry. Keep the Nest app warm across invocations in the same isolate.
 */
async function handler(req: Request, res: Response): Promise<void> {
  const server = await getExpressApp();
  server(req, res);
}

export default handler;
