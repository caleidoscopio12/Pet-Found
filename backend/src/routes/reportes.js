import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import mongoose from 'mongoose'
import { ErrorHttp } from '../middleware/errores.js'
import { assertFotoValida, subidaFoto } from '../middleware/subidaFoto.js'
import { LlaveBorrado } from '../models/LlaveBorrado.js'
import { RADIO_DEFAULT, Reporte } from '../models/Reporte.js'
import { publicIdDesdeUrl } from '../services/cloudinary.js'
import { buscarCoincidencias } from '../services/coincidencias.js'
import { toGeoPoint } from '../utils/geo.js'
import { generarLlave, huella, llaveCoincide } from '../utils/llaves.js'
import { esquemaCercanos, esquemaCrearReporte } from '../validation/reporte.js'

const DIAS_VISIBLE = 60
const MAX_RESULTADOS = 300

export const hace60Dias = (ahora = Date.now()) => new Date(ahora - DIAS_VISIBLE * 24 * 60 * 60 * 1000)

/**
 * @param {object} deps
 * @param {(buf: Buffer) => Promise<{url: string, publicId: string}>} deps.subirFoto
 * @param {(publicId: string) => Promise<unknown>} deps.borrarFoto
 * @param {number} deps.limitePublicaciones  publicaciones por IP cada 15 min
 * @param {((buf: Buffer) => Promise<number[]>) | null} deps.calcularEmbedding  CLIP (null = IA desactivada)
 * @param {number} deps.umbralCoincidencia  similitud coseno mínima para avisar
 */
export function rutasReportes({ subirFoto, borrarFoto, limitePublicaciones, calcularEmbedding, umbralCoincidencia }) {
  const router = Router()

  // Sin login hasta la Fase 4: limitar spam por IP.
  const limitePublicar = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: limitePublicaciones,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { ok: false, error: 'Publicaste muchos reportes seguidos. Espera unos minutos e intenta de nuevo.' },
  })

  const limiteBorrar = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { ok: false, error: 'Demasiados intentos de borrar. Espera unos minutos.' },
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

    // 2. Embedding de la foto ANTES de subirla. Si la IA falla, se publica igual.
    let embedding
    if (calcularEmbedding) {
      try {
        embedding = await calcularEmbedding(req.file.buffer)
      } catch (e) {
        console.error('[ia] No se pudo calcular el embedding; se publica sin coincidencias:', e.message)
      }
    }

    // 3. Subir foto.
    let foto
    try {
      foto = await subirFoto(req.file.buffer)
    } catch (e) {
      console.error('[api] Falló la subida a Cloudinary:', e)
      throw new ErrorHttp(502, 'No pudimos subir la foto. Revisa tu señal e intenta de nuevo.')
    }

    // 4. Guardar reporte + huella de la llave de borrado. Si algo falla, deshacer todo.
    const esPerdido = d.tipo === 'PERDIDO'
    let doc
    try {
      doc = await Reporte.create({
        tipo: d.tipo,
        especie: d.especie,
        nombre_mascota: d.nombre_mascota,
        descripcion: d.descripcion,
        contacto_whatsapp: d.contacto_whatsapp,
        recompensa: esPerdido ? (d.recompensa ?? 0) : 0,
        radio_metros: esPerdido ? (d.radio_metros ?? RADIO_DEFAULT) : 0,
        ubicacion: toGeoPoint([d.lat, d.lng]),
        foto_url: foto.url,
        embedding,
      })
      const llaveBorrado = generarLlave()
      await LlaveBorrado.create({ reporte: doc._id, hash: huella(llaveBorrado) })

      const { embedding: _omitido, ...reporte } = doc.toObject()

      // 5. Coincidencias (geo + coseno). Un fallo aquí no anula la publicación.
      let coincidencias = []
      try {
        coincidencias = await buscarCoincidencias(reporte, embedding, { umbral: umbralCoincidencia })
      } catch (e) {
        console.error('[ia] Falló la búsqueda de coincidencias:', e.message)
      }

      // La llave se entrega UNA sola vez: el teléfono la guarda para poder borrar después.
      res.status(201).json({ reporte, llaveBorrado, coincidencias })
    } catch (e) {
      if (doc) await Reporte.deleteOne({ _id: doc._id }).catch(() => {})
      await Promise.resolve(borrarFoto(foto.publicId)).catch(() => {})
      next(e)
    }
  })

  /**
   * DELETE /api/reportes/:id — solo quien publicó (header X-Llave-Borrado).
   * Borra el reporte, su llave y su foto en Cloudinary.
   */
  router.delete('/:id', limiteBorrar, async (req, res) => {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) throw new ErrorHttp(404, 'Ese reporte no existe.')

    const reporte = await Reporte.findById(id).lean()
    if (!reporte) throw new ErrorHttp(404, 'Ese reporte no existe o ya fue borrado.')

    const llave = await LlaveBorrado.findOne({ reporte: id }).lean()
    if (!llave || !llaveCoincide(req.get('X-Llave-Borrado'), llave.hash)) {
      throw new ErrorHttp(403, 'Solo quien publicó este reporte puede borrarlo, desde el mismo teléfono.')
    }

    await Reporte.deleteOne({ _id: id })
    await LlaveBorrado.deleteOne({ _id: llave._id })

    const publicId = publicIdDesdeUrl(reporte.foto_url)
    if (publicId) {
      await Promise.resolve(borrarFoto(publicId)).catch((e) =>
        console.error('[api] No se pudo borrar la foto en Cloudinary:', publicId, e),
      )
    }

    res.json({ ok: true })
  })

  return router
}
