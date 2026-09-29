import 'dotenv/config';
import { app, setupMailer } from '../server/createApp';

// Initialize background mailer safely on serverless invocation
setupMailer().catch((err) => {
  console.warn('[Vercel Serverless] Mailer setup warning:', err);
});

// Vercel Serverless Function entry point (Express app is directly invoked by @vercel/node)
export default app;
