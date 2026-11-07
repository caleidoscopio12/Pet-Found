/**
 * npm run db:embeddings — calcula el embedding CLIP de los reportes que no lo tienen
 * (ej. los del seed o los publicados antes de la Fase 3), descargando su foto.
 * Con --todos recalcula también los que ya tienen (útil si cambia el modelo).
 */
import 'dotenv/config'
import { conectarBD, desconectarBD } from '../src/db/conexion.js'
import { Reporte } from '../src/models/Reporte.js'
import { crearServicioEmbeddings } from '../src/services/embeddings.js'

const todos = process.argv.includes('--todos')

await conectarBD(process.env.MONGODB_URI)
const ia = await crearServicioEmbeddings()

const filtro = todos ? {} : { $or: [{ embedding: { $exists: false } }, { embedding: { $size: 0 } }] }
const pendientes = await Reporte.find(filtro).select('foto_url nombre_mascota tipo').lean()
console.log(`${pendientes.length} reporte(s) por procesar${todos ? ' (--todos)' : ''}.`)

let ok = 0
for (const r of pendientes) {
  const etiqueta = r.nombre_mascota ?? `${r.tipo.toLowerCase()} ${r._id}`
  try {
    const res = await fetch(r.foto_url)
    if (!res.ok) throw new Error(`HTTP ${res.status} al descargar la foto`)
    const embedding = await ia.calcular(Buffer.from(await res.arrayBuffer()))
    await Reporte.updateOne({ _id: r._id }, { $set: { embedding } }, { runValidators: true })
    console.log(`  ✓ ${etiqueta}`)
    ok++
  } catch (e) {
    console.log(`  ✗ ${etiqueta}: ${e.message}`)
  }
}
console.log(`Listo: ${ok}/${pendientes.length}.`)
await desconectarBD()
