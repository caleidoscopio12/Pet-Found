import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import mongoose from 'mongoose'
import { manejarErrores } from './middleware/errores.js'
import { rutasReportes } from './routes/reportes.js'

/**
 * Crea la app Express (separada de server.js para testearla sin levantar el puerto).
 * Las dependencias externas (Cloudinary) se inyectan para poder usar fakes en los tests.
 */
export function createApp({
  subirFoto,
  borrarFoto,
  corsOrigin = 'http://localhost:5173',
  limitePublicaciones = 10,
} = {}) {
  const app = express()

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors({ origin: corsOrigin.split(',').map((o) => o.trim()) }))
  app.use(express.json({ limit: '100kb' }))

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      servicio: 'mascotas-api',
      fase: 2,
      db: mongoose.connection.readyState === 1 ? 'conectada' : 'desconectada',
    })
  })

  app.use('/api/reportes', rutasReportes({ subirFoto, borrarFoto, limitePublicaciones }))

  app.use((_req, res) => {
    res.status(404).json({ ok: false, error: 'Ruta no encontrada' })
  })

  app.use(manejarErrores)

  return app
}
