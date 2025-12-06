import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // הגדרה זו עוזרת בפתרון בעיות חיבור בסביבות ענן כמו StackBlitz
    host: true
  }
});