import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { app, setupMailer, getBaseUrl } from './server/createApp';
import { findProductByIdOrSlug, injectProductSeo, inject404Seo } from './server/seoHandler';

async function startServer() {
  await setupMailer();
  const PORT = 3000;

  // Vite middleware for development vs static build serving for production
  const isProduction = process.env.NODE_ENV === "production" || (typeof __filename !== 'undefined' && __filename.endsWith('.cjs'));
  let viteInstance: any = null;

  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import('vite');
      viteInstance = await createViteServer({
        server: {
          middlewareMode: true,
          allowedHosts: true
        },
        appType: "spa",
      });
    } catch (viteErr) {
      console.warn('Vite dev middleware could not be loaded, falling back to static:', viteErr);
    }
  }

  // Server-Side Pre-Rendering / SSR for SEO-friendly product pages
  // Intercepts /product/:identifier for crawlers, bot pre-renders, and full HTML delivery
  app.get('/product/:identifier', async (req, res, next) => {
    try {
      const identifier = req.params.identifier;
      // Skip static asset requests
      if (identifier && identifier.includes('.') && !identifier.endsWith('.html')) {
        return next();
      }

      const match = await findProductByIdOrSlug(identifier);
      const baseUrl = getBaseUrl(req);

      let template = '';
      if (!isProduction && viteInstance) {
        const raw = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
        template = await viteInstance.transformIndexHtml(req.originalUrl, raw);
      } else {
        const distIndex = path.join(process.cwd(), 'dist', 'index.html');
        if (fs.existsSync(distIndex)) {
          template = fs.readFileSync(distIndex, 'utf-8');
        } else {
          template = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
        }
      }

      if (!match || (match.product.status && match.product.status !== 'Published')) {
        // Return HTTP 404 with noindex meta tags for unpublished/deleted products
        const notFoundHtml = inject404Seo(template);
        res.setHeader('Content-Type', 'text/html; charset=UTF-8');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        return res.status(404).send(notFoundHtml);
      }

      // Return HTTP 200 with dynamic metadata, Schema.org JSON-LD, and pre-rendered semantic HTML
      const productHtml = injectProductSeo(template, match.product, baseUrl);
      res.setHeader('Content-Type', 'text/html; charset=UTF-8');
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
      return res.status(200).send(productHtml);
    } catch (ssrErr) {
      console.error('Error during product SSR SEO rendering:', ssrErr);
      return next();
    }
  });

  if (!isProduction && viteInstance) {
    app.use(viteInstance.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))
      ? path.join(process.cwd(), 'dist')
      : path.resolve(__dirname);

    // Static assets with cache buster hashes (CSS/JS/images)
    const assetsPath = path.join(distPath, 'assets');
    if (fs.existsSync(assetsPath)) {
      app.use('/assets', express.static(assetsPath, {
        maxAge: '1y',
        immutable: true
      }));
    }

    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        res.setHeader('CDN-Cache-Control', 'max-age=0, must-revalidate');
        res.setHeader('Cloudflare-CDN-Cache-Control', 'max-age=0, must-revalidate');

        const rawHost = (req.get('cf-connecting-host') || req.get('x-forwarded-host') || req.get('host') || '').toLowerCase().split(':')[0];
        let sub = '';
        if (rawHost.endsWith('.rjworldbd.com') && rawHost !== 'rjworldbd.com' && rawHost !== 'www.rjworldbd.com') {
          sub = rawHost.replace('.rjworldbd.com', '').trim();
        }
        const reserved = ['www', 'admin', 'api', 'mail', 'cpanel', 'webmail', 'ftp', 'app', 'auth', 'support'];
        if (sub && !reserved.includes(sub)) {
          let html = fs.readFileSync(indexPath, 'utf-8');
          html = html.replace('<head>', `<head><script data-cfasync="false">window.__RJ_VENDOR_SUBDOMAIN__="${sub}";</script>`);
          res.setHeader('Content-Type', 'text/html; charset=UTF-8');
          return res.send(html);
        }
        res.sendFile(indexPath);
      } else {
        res.status(200).send('RJ WORLD BD Server Running');
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
