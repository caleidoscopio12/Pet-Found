import multer from 'multer'
import { ErrorHttp } from './errores.js'

export const MAX_BYTES_FOTO = 5 * 1024 * 1024
const MIMES_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ERROR_FORMATO = 'La foto debe ser JPG, PNG o WebP.'

/** Foto en memoria (la Fase 3 necesita los bytes para el embedding). Máx 5 MB, 1 archivo. */
export const subidaFoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES_FOTO, files: 1, fields: 20 },
  fileFilter: (_req, file, cb) => {
    if (MIMES_PERMITIDOS.has(file.mimetype)) return cb(null, true)
    cb(new ErrorHttp(400, ERROR_FORMATO, { foto: ERROR_FORMATO }))
  },
}).single('foto')

/** Detecta el formato real por los primeros bytes (el mimetype lo declara el cliente y se puede falsear). */
export function formatoReal(buf) {
  if (!buf || buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg'
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png'
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp'
  return null
}

/** Exige la foto y comprueba que de verdad sea una imagen. Lanza ErrorHttp 400 si no. */
export function assertFotoValida(file) {
  if (!file) throw new ErrorHttp(400, 'Falta la foto de la mascota.', { foto: 'Falta la foto de la mascota.' })
  if (!formatoReal(file.buffer)) throw new ErrorHttp(400, ERROR_FORMATO, { foto: ERROR_FORMATO })
}
