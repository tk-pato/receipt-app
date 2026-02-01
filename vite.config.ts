import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // ▼▼▼ 重要: GitHub Pages用の設定 ▼▼▼
  base: './', 
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    host: true,
    fs: {
      allow: ['..']
    }
  }
});