import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  /**
   * `npm run dev:movil` → modo "movil": HTTPS con certificado autofirmado y expuesto
   * en la red local, para probar GPS y cámara desde el celular (el navegador solo
   * los permite en HTTPS). `npm run dev` normal sigue en http://localhost:5173.
   */
  const movil = mode === 'movil'

  return {
    plugins: [react(), tailwindcss(), ...(movil ? [basicSsl({ name: 'pet-found-dev' })] : [])],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      host: movil ? true : 'localhost', // true = escucha también en la IP de la red local
      port: 5173,
      strictPort: true,
      // El celular no puede llamar a "localhost:4000" (sería el propio teléfono) ni a HTTP
      // desde una página HTTPS: Vite reenvía /api al backend de este computador.
      proxy: {
        '/api': { target: 'http://localhost:4000', changeOrigin: true },
      },
    },
  }
})
