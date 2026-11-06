import cors from 'cors'
import express from 'express'

/** Crea la app Express (separada de server.js para poder testearla sin levantar el puerto). */
export function createApp() {
  const app = express()

  app.use(cors())
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, servicio: 'mascotas-api', fase: 1 })
  })

  // Fase 2: POST /api/reportes y GET /api/reportes/cercanos ($nearSphere)

  app.use((_req, res) => {
    res.status(404).json({ ok: false, error: 'Ruta no encontrada' })
  })

  return app
}
