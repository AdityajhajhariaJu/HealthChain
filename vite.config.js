import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'
import { createClient } from '@supabase/supabase-js'

// Custom Vite plugin to mock the Vercel /api/admin-content Edge Function locally
const adminContentPlugin = () => ({
  name: 'admin-content-mock',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url === '/api/admin-content' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString() });
        req.on('end', async () => {
          try {
            const env = loadEnv(server.config.mode, process.cwd(), '');
            const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
            const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
            
            if (!supabaseUrl || !supabaseKey) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ error: "Missing service role key in .env" }));
            }
            
            const supabase = createClient(supabaseUrl, supabaseKey);
            const { action, payload, table = 'fitness_content' } = JSON.parse(body);
            
            res.setHeader('Content-Type', 'application/json');
            
            if (action === 'insert') {
              const { data, error } = await supabase.from(table).insert(payload).select();
              if (error) throw error;
              res.statusCode = 200;
              return res.end(JSON.stringify(data));
            } 
            if (action === 'update') {
              const { id, ...updates } = payload;
              const { data, error } = await supabase.from(table).update(updates).eq('id', id).select();
              if (error) throw error;
              res.statusCode = 200;
              return res.end(JSON.stringify(data));
            }
            if (action === 'delete') {
              const { id } = payload;
              const { data, error } = await supabase.from(table).update({ is_active: false }).eq('id', id);
              if (error) throw error;
              res.statusCode = 200;
              return res.end(JSON.stringify({ success: true }));
            }
            
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "Invalid action" }));
          } catch (err) {
            console.error("Local API Mock Error:", err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      } else {
        next();
      }
    });
  }
});

export default defineConfig({
  plugins: [
    react(),
    adminContentPlugin(),
    ViteImageOptimizer({
      png: { quality: 80 },
      jpeg: { quality: 80 },
      jpg: { quality: 80 },
    }),
    visualizer({ open: false, filename: 'bundle-stats.html' })
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
    allowedHosts: true
  }
})
