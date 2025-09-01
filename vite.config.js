// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      // Optional: proxy API calls during dev
      // "/chat": "http://localhost:8000",
      // "/upload": "http://localhost:8000"
    }
  },
  build: {
    outDir: "dist"
  }
});
