import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'es2020',
      minify: 'esbuild',
      cssMinify: true,
      sourcemap: false,
      // Reduce bundle bloat
      modulePreload: {
        polyfill: false, // Modern browsers support this natively
      },
      rollupOptions: {
        output: {
          // Aggressive code splitting for better caching
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Core React — smallest chunk, cached permanently
              if (id.includes('react-dom') || id.includes('react/')) {
                return 'react-vendor';
              }
              // Firebase — large, rarely changes 
              if (id.includes('firebase')) {
                return 'firebase';
              }
              // Animation library — only loaded when animations render
              if (id.includes('motion')) {
                return 'motion';
              }
              // Icons — only the tree-shaken subset
              if (id.includes('lucide-react')) {
                return 'lucide';
              }
              // Everything else from node_modules
              return 'vendor';
            }
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
    server: {
      hmr: false,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
