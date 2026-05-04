import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        tracks: resolve(__dirname, 'track-requests.html'),
      },
    },
  },
  server: {
    port: 5173,
  },
});
