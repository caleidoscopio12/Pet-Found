import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { ErrorHttp } from '../middleware/errores.js'
import { assertFotoValida, subidaFoto } from '../middleware/subidaFoto.js'
import { RADIO_DEFAULT, Reporte } from '../models/Reporte.js'
import { toGeoPoint } from '../utils/geo.js'
import { esquemaCercanos, esquemaCrearReporte } from '../validation/reporte.js'

const DIAS_VISIBLE = 60
const MAX_RESULTADOS = 300

export const hace60Dias = (ahora = Date.now()) => new Date(ahora - DIAS_VISIBLE * 24 * 60 * 60 * 1000)

/**
 * @param {object} deps
 * @param {(buf: Buffer) => Promise<{url: string, publicId: string}>} deps.subirFoto
 * @param {(publicId: string) => Promise<unknown>} deps.borrarFoto
 * @param {number} deps.limitePublicaciones  publicaciones por IP cada 15 min
 */
export function rutasReportes({ subirFoto, borrarFoto, limitePublicaciones }) {
  const router = Router()

  // Sin login hasta la Fase 4: limitar spam por IP.
  const limitePublicar = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: limitePublicaciones,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { ok: false, error: 'Publicaste muchos reportes seguidos. Espera unos minutos e intenta de nuevo.' },
  })

  /** GET /api/reportes/cercanos?lat=&lng=&maxKm= — más cercanos primero. */
  router.get('/cercanos', async (req, res) => {
    const { lat, lng, maxKm } = esquemaCercanos.parse(req.query)

    const reportes = await Reporte.find({
      estado: 'ACTIVO',
      createdAt: { $gte: hace60Dias() },
      ubicacion: {
        $nearSphere: {
          $geometry: toGeoPoint([lat, lng]), // Leaflet [lat,lng] → GeoJSON [lng,lat]
          $maxDistance: maxKm * 1000,
        },
      },
    })
      .limit(MAX_RESULTADOS)
      .lean()

    res.json({ reportes })
  })

  /** POST /api/reportes — multipart: foto + campos. */
  router.post('/', limitePublicar, subidaFoto, async (req, res, next) => {
    // 1. Validar los datos ANTES de subir la foto (sin imágenes huérfanas en Cloudinary).
    const d = esquemaCrearReporte.parse(req.body ?? {})
    assertFotoValida(req.file)

    // 2. Subir foto.
    let foto
    try {
      foto = await subirFoto(req.file.buffer)
    } catch (e) {
      console.error('[api] Falló la subida a Cloudinary:', e)
      throw new ErrorHttp(502, 'No pudimos subir la foto. Revisa tu señal e intenta de nuevo.')
    }

    // 3. Guardar. Si falla, borrar la foto recién subida.
    const esPerdido = d.tipo === 'PERDIDO'
    try {
      const doc = await Reporte.create({
        tipo: d.tipo,
        especie: d.especie,
        nombre_mascota: d.nombre_mascota,
        descripcion: d.descripcion,
        contacto_whatsapp: d.contacto_whatsapp,
        recompensa: esPerdido ? (d.recompensa ?? 0) : 0,
        radio_metros: esPerdido ? (d.radio_metros ?? RADIO_DEFAULT) : 0,
        ubicacion: toGeoPoint([d.lat, d.lng]),
        foto_url: foto.url,
      })
      const { embedding: _omitido, ...reporte } = doc.toObject()
      res.status(201).json({ reporte })
    } catch (e) {
      await Promise.resolve(borrarFoto(foto.publicId)).catch(() => {})
      next(e)
    }
  })

  return router
}
