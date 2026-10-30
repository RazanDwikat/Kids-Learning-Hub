import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
export default defineConfig({
  base: '/little-sprout-demo/',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  build: { outDir: 'dist/public', emptyOutDir: true },
  server: { host: '0.0.0.0', port: Number(process.env.PORT || 5173), allowedHosts: true },
  preview: { host: '0.0.0.0', port: Number(process.env.PORT || 5173) },
});
