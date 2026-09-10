import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: __dirname,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@1bod/react-gantt/styles.css': resolve(__dirname, '../src/styles.css'),
      '@1bod/react-gantt': resolve(__dirname, '../src/index.ts'),
    },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 5173, strictPort: true },
  build: { outDir: resolve(__dirname, '../dist-demo'), emptyOutDir: true },
});
