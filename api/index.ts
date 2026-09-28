import 'dotenv/config';
import type { Request, Response } from 'express';
import { app, setupMailer } from '../server/createApp';

// Initialize background mailer safely on serverless invocation
setupMailer().catch((err) => {
  console.warn('[Vercel Serverless] Mailer setup warning:', err);
});

// Vercel Serverless Function entry point
export default function handler(req: Request, res: Response) {
  return app(req, res);
}
