import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import path from 'path';

export default defineConfig({
  plugins: [preact()],
  define: {
    // Required for hydra-synth which uses `global` internally
    global: 'globalThis',
  },
  build: {
    rollupOptions: {
      input: {
        display: path.resolve(__dirname, 'index.html'),
        ctrl: path.resolve(__dirname, 'ctrl.html'),
      },
    },
  },
  server: {
    host: '0.0.0.0',  // listen on all interfaces so phones on the LAN can connect
    allowedHosts: true, // allow any hostname (mDNS, LAN IP, etc.)
    proxy: {
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
        rewriteWsOrigin: true,
      },
      '/api': {
        target: 'http://localhost:3001',
      },
    },
  },
});
