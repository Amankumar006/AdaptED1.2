import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: 'localhost',
    port: 5174,
    strictPort: true,
    hmr: { clientPort: 5174 },
  },
  preview: {
    host: 'localhost',
    port: 4174,
    strictPort: true,
  },
  plugins: [react()],
})
