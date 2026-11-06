/**
 * npm run db:seed — carga los 3 reportes de prueba (los ex-mocks de la Fase 1).
 * Sube las fotos de Unsplash a Cloudinary por URL y es idempotente: si un
 * reporte de prueba ya existe (misma descripción), no lo duplica.
 */
import 'dotenv/config'
import { cargarEnv } from '../src/config/env.js'
import { conectarBD, desconectarBD } from '../src/db/conexion.js'
import { Reporte } from '../src/models/Reporte.js'
import { crearServicioFotos } from '../src/services/cloudinary.js'
import { toGeoPoint } from '../src/utils/geo.js'

const haceHoras = (h) => new Date(Date.now() - h * 60 * 60 * 1000)
const unsplash = (id) => `https://images.unsplash.com/${id}?w=800&q=80&auto=format&fit=crop&fm=jpg`

// Coordenadas en orden Leaflet [lat, lng]; toGeoPoint las invierte a GeoJSON.
const SEMILLAS = [
  {
    tipo: 'PERDIDO',
    especie: 'PERRO',
    nombre_mascota: 'Rocky',
    descripcion:
      'Beagle de 3 años, muy cariñoso. Llevaba collar negro. Se arrancó asustado por unos fuegos artificiales cerca de la plaza.',
    recompensa: 50000,
    contacto_whatsapp: '+56911111111',
    foto: unsplash('photo-1543466835-00a7907e9de1'),
    latlng: [-35.333, -72.416],
    radio_metros: 1000,
    createdAt: haceHoras(2),
  },
  {
    tipo: 'PERDIDO',
    especie: 'GATO',
    nombre_mascota: 'Michi',
    descripcion:
      'Gato blanco con negro, ojos verdes. Es tímido, si lo ven no lo persigan: avísenme y voy al tiro.',
    recompensa: 0,
    contacto_whatsapp: '+56922222222',
    foto: unsplash('photo-1514888286974-6c03e2ca1dba'),
    latlng: [-35.34, -72.405],
    radio_metros: 500,
    createdAt: haceHoras(20),
  },
  {
    tipo: 'AVISTADO',
    especie: 'PERRO',
    descripcion:
      'Perrito de pelo largo café con blanco, se ve desorientado. Está dando vueltas cerca de la costanera.',
    contacto_whatsapp: '+56933333333',
    foto: unsplash('photo-1587300003388-59208cc962cb'),
    latlng: [-35.327, -72.425],
    createdAt: haceHoras(0.5),
  },
]

const env = cargarEnv()
const fotos = crearServicioFotos({
  cloudName: env.CLOUDINARY_CLOUD_NAME,
  apiKey: env.CLOUDINARY_API_KEY,
  apiSecret: env.CLOUDINARY_API_SECRET,
})

await conectarBD(env.MONGODB_URI)
let creados = 0
for (const { foto, latlng, ...datos } of SEMILLAS) {
  if (await Reporte.exists({ descripcion: datos.descripcion })) {
    console.log(`= ya existe: ${datos.nombre_mascota ?? 'avistamiento'}`)
    continue
  }
  const { url } = await fotos.subirDesdeUrl(foto)
  await Reporte.create({ ...datos, foto_url: url, ubicacion: toGeoPoint(latlng) })
  console.log(`+ creado: ${datos.nombre_mascota ?? 'avistamiento'}`)
  creados++
}
console.log(`Listo: ${creados} reporte(s) nuevo(s).`)
await desconectarBD()
