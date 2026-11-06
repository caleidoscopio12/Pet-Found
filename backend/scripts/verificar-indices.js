/**
 * npm run db:indices — comprueba que el índice 2dsphere exista y que
 * $nearSphere realmente lo use (etapa GEO_NEAR_2DSPHERE en el plan de consulta).
 */
import 'dotenv/config'
import { conectarBD, desconectarBD } from '../src/db/conexion.js'
import { Reporte } from '../src/models/Reporte.js'
import { toGeoPoint } from '../src/utils/geo.js'

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('Falta MONGODB_URI en backend/.env')
  process.exit(1)
}

await conectarBD(uri)

const indices = await Reporte.collection.listIndexes().toArray()
console.log('Índices de la colección "reportes":')
for (const i of indices) console.log(`  - ${i.name}: ${JSON.stringify(i.key)}`)

const tiene2dsphere = indices.some((i) => i.key?.ubicacion === '2dsphere')

const plan = await Reporte.find({
  estado: 'ACTIVO',
  ubicacion: { $nearSphere: { $geometry: toGeoPoint([-35.333, -72.416]), $maxDistance: 5000 } },
}).explain('queryPlanner')

const usaIndice = JSON.stringify(plan).includes('GEO_NEAR_2DSPHERE')
const total = await Reporte.countDocuments()

console.log(`\nÍndice 2dsphere en ubicacion: ${tiene2dsphere ? 'SÍ ✓' : 'NO ✗'}`)
console.log(`$nearSphere usa el índice (GEO_NEAR_2DSPHERE): ${usaIndice ? 'SÍ ✓' : 'NO ✗'}`)
console.log(`Documentos en la colección: ${total}`)

await desconectarBD()
process.exit(tiene2dsphere && usaIndice ? 0 : 1)
