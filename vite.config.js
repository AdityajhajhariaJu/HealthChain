import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'
import adminContentHandler from './api/admin-content.js'
import foodProductHandler from './api/food-product.js'

// Use the same public catalog endpoint during development and in production.
const foodProductPlugin = () => ({
  name: 'food-product-api',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url || '/', 'http://localhost');
      if (url.pathname !== '/api/food-product') return next();
      req.query = Object.fromEntries(url.searchParams);
      res.status = code => { res.statusCode = code; return res; };
      res.json = value => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); return res; };
      await foodProductHandler(req, res);
    });
  },
});

// Development uses the same authenticated CMS handler as production.
const adminContentPlugin = () => ({
  name: 'admin-content-api',
  configureServer(server) {
    const taskEnv = loadEnv(server.config.mode, process.cwd(), '');
    for (const key of ['VITE_SUPABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CONTENT_ADMIN_USER_IDS']) {
      if (taskEnv[key] && !process.env[key]) process.env[key] = taskEnv[key];
    }
    server.middlewares.use(async (req, res, next) => {
      if (new URL(req.url || '/', 'http://localhost').pathname !== '/api/admin-content') return next();
      res.status = code => { res.statusCode = code; return res; };
      res.json = value => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); return res; };
      if (req.method === 'POST') {
        try {
          let body = '';
          for await (const chunk of req) {
            body += chunk.toString();
            if (Buffer.byteLength(body) > 3 * 1024 * 1024) return res.status(413).json({ error: 'payload_too_large' });
          }
          req.body = JSON.parse(body || '{}');
        } catch { return res.status(400).json({ error: 'invalid_json' }); }
      }
      await adminContentHandler(req, res);
    });
  },
});
export default defineConfig({
  plugins: [
    react(),
    foodProductPlugin(),
    adminContentPlugin(),
    ViteImageOptimizer({
      png: { quality: 80 },
      jpeg: { quality: 80 },
      jpg: { quality: 80 },
    }),
    visualizer({ open: false, filename: 'dist/bundle-stats.html' })
  ],
  build: {
    target: ['es2015', 'safari11', 'chrome87'],
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'framer-motion': ['framer-motion'],
          'recharts': ['recharts'],
          'supabase': ['@supabase/supabase-js'],
          'pdf-tools': ['jspdf', 'html2pdf.js']
        }
      }
    }
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
  server: {
    port: 3001,
    host: true,
    open: false,
    allowedHosts: true,
    proxy: {
      '/api/gemini': { target: 'http://localhost:3000', changeOrigin: true }
    }
  }
})
