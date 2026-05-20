import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // Falla si el puerto está ocupado, no salta a otro
    proxy: {
      '/login': 'http://localhost:8000',
      '/register': 'http://localhost:8000',
      '/profile': 'http://localhost:8000',
      '/daily': 'http://localhost:8000',
      '/shopping': 'http://localhost:8000',
      '/weight': 'http://localhost:8000',
      '/chat': 'http://localhost:8000',
      '/ai': 'http://localhost:8000',
      '/admin': 'http://localhost:8000',
    }
  }
})
