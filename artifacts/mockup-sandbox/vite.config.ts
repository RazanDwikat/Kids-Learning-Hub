import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { mockupPreviewPlugin } from './mockupPreviewPlugin';
export default defineConfig({
  base: '/__mockup/',
  plugins: [mockupPreviewPlugin(), react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  build: { outDir: 'dist', emptyOutDir: true },
  server: { host: '0.0.0.0', port: Number(process.env.PORT || 5174), allowedHosts: true },
  preview: { host: '0.0.0.0', port: Number(process.env.PORT || 5174) },
});
