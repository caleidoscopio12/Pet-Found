import mongoose from 'mongoose'

const { Schema } = mongoose

/**
 * Llave para borrar un reporte sin login (hasta la Fase 4).
 * Al publicar, el teléfono recibe una llave secreta UNA sola vez; aquí guardamos
 * solo su huella SHA-256, nunca la llave. Colección aparte para no tocar el
 * esquema oficial de `Reportes` (CLAUDE.md §7). En la Fase 4 se reemplaza por
 * el dueño autenticado y esta colección se elimina.
 */
const llaveBorradoSchema = new Schema(
  {
    reporte: { type: Schema.Types.ObjectId, ref: 'Reporte', required: true, unique: true },
    hash: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
    createdAt: { type: Date, default: Date.now, immutable: true },
  },
  { strict: 'throw', versionKey: false, collection: 'llaves_borrado' },
)

export const LlaveBorrado =
  mongoose.models.LlaveBorrado ?? mongoose.model('LlaveBorrado', llaveBorradoSchema)
