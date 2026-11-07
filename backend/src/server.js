import 'dotenv/config'
import { createApp } from './app.js'
import { cargarEnv } from './config/env.js'
import { conectarBD, desconectarBD } from './db/conexion.js'
import { crearServicioFotos } from './services/cloudinary.js'
import { crearServicioEmbeddings, MODELO_POR_DEFECTO } from './services/embeddings.js'

let env
try {
  env = cargarEnv()
} catch (e) {
  console.error(e.message)
  process.exit(1)
}

const fotos = crearServicioFotos({
  cloudName: env.CLOUDINARY_CLOUD_NAME,
  apiKey: env.CLOUDINARY_API_KEY,
  apiSecret: env.CLOUDINARY_API_SECRET,
})

try {
  await conectarBD(env.MONGODB_URI)
  console.log('MongoDB conectado e índices listos (ubicacion_2dsphere).')
} catch (e) {
  console.error('No se pudo conectar a MongoDB:', e.message)
  console.error('Revisa MONGODB_URI y que tu IP esté permitida en Atlas → Network Access.')
  process.exit(1)
}

// Precarga de CLIP ANTES de abrir el puerto: el primer usuario no paga la descarga
// (~90 MB la primera vez) ni la carga del modelo. Si falla, la API funciona sin IA.
let calcularEmbedding = null
try {
  const t0 = Date.now()
  console.log(`[ia] Cargando ${MODELO_POR_DEFECTO} (la primera vez se descarga, ~90 MB)…`)
  const ia = await crearServicioEmbeddings()
  await ia.calentar() // la primera inferencia es la más lenta
  calcularEmbedding = ia.calcular
  console.log(`[ia] Modelo listo en ${((Date.now() - t0) / 1000).toFixed(1)} s · umbral de coincidencia ${env.UMBRAL_COINCIDENCIA}`)
} catch (e) {
  console.error('[ia] No se pudo cargar el modelo; la API funcionará SIN coincidencias:', e.message)
}

const servidor = createApp({
  subirFoto: fotos.subirFoto,
  borrarFoto: fotos.borrarFoto,
  calcularEmbedding,
  umbralCoincidencia: env.UMBRAL_COINCIDENCIA,
  corsOrigin: env.CORS_ORIGIN,
}).listen(env.PORT, () => {
  console.log(`API escuchando en http://localhost:${env.PORT}/api`)
})

for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, () => {
    servidor.close(() => desconectarBD().finally(() => process.exit(0)))
  })
}
