import 'dotenv/config';
import type { Request, Response } from 'express';

// Vercel Serverless Function entry point
export default async function handler(req: any, res: any) {
  const rawUrl = String(req.url || '');
  const pathPart = rawUrl.split('?')[0]; // Preserve exact casing for Firebase RTDB IDs!
  const lowerPath = pathPart.toLowerCase();

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
    // 1. Explicitly handle deleted_vendors so active stores are NEVER returned as deleted
    if (lowerPath.includes('deleted_vendor')) {
      return safeSend(200, {});
    }

    // 2. Products endpoints
    if (lowerPath.includes('product')) {
      try {
        const cleanPath = pathPart.replace(/^\/api\//i, '').replace(/^\//, '');
        const rtdbRes = await fetch(`https://rjworldbdcom-default-rtdb.firebaseio.com/${cleanPath}.json`);
        if (rtdbRes.ok) {
          const data = await rtdbRes.json();
          return safeSend(200, data || {});
        }
      } catch (_) {}
      return safeSend(200, {});
    }

    // 3. Stores and Vendors endpoints
    if (lowerPath.includes('vendor') || lowerPath.includes('store')) {
      try {
        const cleanPath = pathPart.replace(/^\/api\//i, '').replace(/^\//, '');
        // Map vendors/* to stores/* as vendor store profiles reside under stores/ in RTDB
        const rtdbPath = cleanPath.toLowerCase().startsWith('vendor') ? cleanPath.replace(/^vendors?/i, 'stores') : cleanPath;
        const rtdbRes = await fetch(`https://rjworldbdcom-default-rtdb.firebaseio.com/${rtdbPath}.json`);
        if (rtdbRes.ok) {
          const data = await rtdbRes.json();
          if (data && typeof data === 'object' && !('error' in data)) {
            return safeSend(200, data);
          }
        }
        // Fallback to full stores.json if specific subpath wasn't found
        const fallbackRes = await fetch('https://rjworldbdcom-default-rtdb.firebaseio.com/stores.json');
        if (fallbackRes.ok) {
          const fData = await fallbackRes.json();
          return safeSend(200, fData || {});
        }
      } catch (_) {}
      return safeSend(200, {});
    }

    if (lowerPath.includes('health') || lowerPath === '/' || lowerPath === '/api') {
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


