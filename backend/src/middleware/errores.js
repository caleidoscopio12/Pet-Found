import mongoose from 'mongoose'
import multer from 'multer'
import { ZodError } from 'zod'

/** Error con código HTTP y, opcionalmente, mensajes por campo para el formulario. */
export class ErrorHttp extends Error {
  constructor(status, message, campos) {
    super(message)
    this.status = status
    this.campos = campos
  }
}

const MENSAJE_FORMULARIO = 'Revisa los datos del formulario.'

function camposDeZod(err) {
  const campos = {}
  for (const issue of err.issues) {
    if (issue.code === 'unrecognized_keys') {
      for (const k of issue.keys ?? []) campos[k] = 'Campo no permitido.'
      continue
    }
    const clave = issue.path.join('.') || '_'
    campos[clave] ??= issue.message
  }
  return campos
}

function camposDeMongoose(err) {
  const campos = {}
  for (const [k, e] of Object.entries(err.errors)) campos[k] = e.message
  return campos
}

/** Manejador central: respuestas `{ ok: false, error, campos? }` en español. */
// eslint-disable-next-line no-unused-vars
export function manejarErrores(err, req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ ok: false, error: MENSAJE_FORMULARIO, campos: camposDeZod(err) })
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ ok: false, error: MENSAJE_FORMULARIO, campos: camposDeMongoose(err) })
  }
  if (err instanceof mongoose.Error.StrictModeError) {
    return res.status(400).json({ ok: false, error: 'Se envió un campo no permitido.' })
  }
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ ok: false, error: 'La foto pesa más de 5 MB.', campos: { foto: 'La foto pesa más de 5 MB.' } })
    }
    return res.status(400).json({ ok: false, error: 'Solo se puede subir una foto, en el campo "foto".' })
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, error: 'El cuerpo de la petición no es JSON válido.' })
  }
  if (err instanceof ErrorHttp) {
    return res.status(err.status).json({ ok: false, error: err.message, ...(err.campos && { campos: err.campos }) })
  }

  console.error('[api] Error inesperado:', err)
  return res.status(500).json({ ok: false, error: 'Algo salió mal en el servidor. Intenta de nuevo en un rato.' })
}
