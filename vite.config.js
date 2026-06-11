import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // Falla si el puerto está ocupado, no salta a otro
  },
  build: {
    rollupOptions: {
      output: {
        // Separar las librerías pesadas en chunks propios: mejor cacheo
        // del navegador y carga inicial más ligera
        manualChunks: {
          react: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth'],
          charts: ['recharts'],
          scanner: ['html5-qrcode'],
          markdown: ['react-markdown', 'remark-gfm'],
        },
      },
    },
  },
})
