/**
 * npm run db:indice-vectorial — crea (si no existe) el índice de Atlas Vector Search
 * sobre `embedding` y espera a que quede listo para consultas. Idempotente.
 */
import 'dotenv/config'
import { conectarBD, desconectarBD } from '../src/db/conexion.js'
import { DIMENSIONES_EMBEDDING, Reporte } from '../src/models/Reporte.js'

export const NOMBRE_INDICE = 'embedding_vector'

const definicion = {
  fields: [
    { type: 'vector', path: 'embedding', numDimensions: DIMENSIONES_EMBEDDING, similarity: 'cosine' },
    { type: 'filter', path: 'tipo' },
    { type: 'filter', path: 'especie' },
    { type: 'filter', path: 'estado' },
    { type: 'filter', path: 'createdAt' },
  ],
}

await conectarBD(process.env.MONGODB_URI)
const col = Reporte.collection

const existentes = await col.listSearchIndexes(NOMBRE_INDICE).toArray()
if (existentes.length === 0) {
  await col.createSearchIndex({ name: NOMBRE_INDICE, type: 'vectorSearch', definition: definicion })
  console.log(`Índice "${NOMBRE_INDICE}" creado. Esperando a que Atlas lo deje listo…`)
} else {
  console.log(`El índice "${NOMBRE_INDICE}" ya existe (estado: ${existentes[0].status}).`)
}

const limite = Date.now() + 5 * 60 * 1000
let indice
do {
  ;[indice] = await col.listSearchIndexes(NOMBRE_INDICE).toArray()
  if (indice?.queryable) break
  process.stdout.write('.')
  await new Promise((r) => setTimeout(r, 5000))
} while (Date.now() < limite)

console.log(
  indice?.queryable
    ? `\nListo ✓ "${NOMBRE_INDICE}" (${indice.status}): ${DIMENSIONES_EMBEDDING} dims, coseno, filtros tipo/especie/estado/createdAt.`
    : `\nTodavía no está listo (estado: ${indice?.status}). Vuelve a correr el script en unos minutos.`,
)
await desconectarBD()
process.exit(indice?.queryable ? 0 : 1)
