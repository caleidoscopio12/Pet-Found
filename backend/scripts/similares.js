/**
 * npm run db:similares -- <id> [--tipo PERDIDO|AVISTADO]
 * Búsqueda amplia por parecido con Atlas Vector Search ($vectorSearch), SIN filtro geográfico.
 * Sirve para explorar y calibrar; el POST usa geo + coseno exacto (ver services/coincidencias.js).
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { conectarBD, desconectarBD } from '../src/db/conexion.js'
import { Reporte } from '../src/models/Reporte.js'

const [id] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const tipoArg = process.argv.find((a) => a.startsWith('--tipo='))?.split('=')[1]
if (!id || !mongoose.isValidObjectId(id)) {
  console.error('Uso: npm run db:similares -- <id-del-reporte> [--tipo=PERDIDO|AVISTADO]')
  process.exit(1)
}

await conectarBD(process.env.MONGODB_URI)
const base = await Reporte.findById(id).select('+embedding').lean()
if (!base?.embedding?.length) {
  console.error('Ese reporte no existe o no tiene embedding (corre npm run db:embeddings).')
  process.exit(1)
}

const hace60Dias = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
const filtro = { especie: base.especie, estado: 'ACTIVO', createdAt: { $gte: hace60Dias } }
if (tipoArg) filtro.tipo = tipoArg

const resultados = await Reporte.aggregate([
  {
    $vectorSearch: {
      index: 'embedding_vector',
      path: 'embedding',
      queryVector: base.embedding,
      numCandidates: 200,
      limit: 11,
      filter: filtro,
    },
  },
  { $project: { embedding: 0, score: { $meta: 'vectorSearchScore' } } },
])

console.log(`Parecidos a "${base.nombre_mascota ?? base.tipo}" (${base.especie}):`)
for (const r of resultados) {
  if (r._id.equals(base._id)) continue
  // Atlas (cosine) devuelve score = (1 + coseno) / 2 → se convierte de vuelta.
  const coseno = 2 * r.score - 1
  console.log(`  ${coseno.toFixed(3)}  ${r.tipo.padEnd(8)} ${r.nombre_mascota ?? '-'}  ${r.descripcion?.slice(0, 50) ?? ''}`)
}
await desconectarBD()
