import 'dotenv/config';
import type { Request, Response } from 'express';

// Vercel Serverless Function entry point
export default async function handler(req: any, res: any) {
  const rawUrl = String(req.url || '');
  const pathPart = rawUrl.split('?')[0].toLowerCase();

  const safeSend = (status: number, data: any) => {
    try {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.setHeader('Cache-Control', 'public, max-age=5, s-maxage=10');

      if (typeof res.status === 'function' && typeof res.json === 'function') {
        return res.status(status).json(data);
      }
      res.writeHead(status, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(data));
    } catch (_) {
      try {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(data));
      } catch (_) {}
    }
  };

  // Universal CORS headers
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  } catch (_) {}

  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') {
      return res.status(200).end();
    }
    res.writeHead(200);
    return res.end();
  }

  // Fast direct RTDB proxy for core marketplace endpoints
  if (req.method === 'GET') {
    if (pathPart.includes('product')) {
      try {
        const rtdbRes = await fetch('https://rjworldbdcom-default-rtdb.firebaseio.com/products.json');
        if (rtdbRes.ok) {
          const data = await rtdbRes.json();
          return safeSend(200, data || {});
        }
      } catch (_) {}
      return safeSend(200, {});
    }

    if (pathPart.includes('vendor') || pathPart.includes('store')) {
      try {
        const rtdbRes = await fetch('https://rjworldbdcom-default-rtdb.firebaseio.com/stores.json');
        if (rtdbRes.ok) {
          const data = await rtdbRes.json();
          return safeSend(200, data || {});
        }
      } catch (_) {}
      return safeSend(200, {});
    }

    if (pathPart.includes('health') || pathPart === '/' || pathPart === '/api') {
      return safeSend(200, { status: 'ok', domain: 'rjworldbd.com', timestamp: Date.now() });
    }
  }

  // Delegate other routes to full Express application if available
  try {
    const { app } = await import('../server/createApp');
    return app(req, res);
  } catch (err: any) {
    return safeSend(200, { success: true, timestamp: Date.now() });
  }
}


