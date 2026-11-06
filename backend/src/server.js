import 'dotenv/config'
import { createApp } from './app.js'
import { cargarEnv } from './config/env.js'
import { conectarBD, desconectarBD } from './db/conexion.js'
import { crearServicioFotos } from './services/cloudinary.js'

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

const servidor = createApp({
  subirFoto: fotos.subirFoto,
  borrarFoto: fotos.borrarFoto,
  corsOrigin: env.CORS_ORIGIN,
}).listen(env.PORT, () => {
  console.log(`API escuchando en http://localhost:${env.PORT}/api`)
})

for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, () => {
    servidor.close(() => desconectarBD().finally(() => process.exit(0)))
  })
}
