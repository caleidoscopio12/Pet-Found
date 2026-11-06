import { z } from 'zod'

const requerida = (nombre) =>
  z.string({ message: `Falta la variable ${nombre} en backend/.env` }).trim().min(1, `Falta la variable ${nombre} en backend/.env`)

const esquemaEnv = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: requerida('MONGODB_URI').refine(
    (v) => v.startsWith('mongodb://') || v.startsWith('mongodb+srv://'),
    'MONGODB_URI debe empezar con mongodb:// o mongodb+srv://',
  ),
  CLOUDINARY_CLOUD_NAME: requerida('CLOUDINARY_CLOUD_NAME'),
  CLOUDINARY_API_KEY: requerida('CLOUDINARY_API_KEY'),
  CLOUDINARY_API_SECRET: requerida('CLOUDINARY_API_SECRET'),
  CORS_ORIGIN: z.string().trim().default('http://localhost:5173'),
})

/**
 * Valida las variables de entorno al arrancar. Si falta alguna, se detiene
 * con un mensaje claro en vez de fallar más tarde con un error críptico.
 */
export function cargarEnv(fuente = process.env) {
  const r = esquemaEnv.safeParse(fuente)
  if (!r.success) {
    const lineas = r.error.issues.map((i) => `  - ${i.message}`).join('\n')
    throw new Error(`Configuración incompleta:\n${lineas}\n(Revisa backend/.env.example)`)
  }
  return r.data
}
