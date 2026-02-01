import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  // ▼▼▼ 重要: GitHub Pagesで画面が真っ白になるのを防ぐ設定 ▼▼▼
  base: './', 
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  server: {
    host: true,
    fs: {
      allow: ['..']
    }
  }
});