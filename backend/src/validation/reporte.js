import { z } from 'zod'
import { ESPECIES, RADIO_MAX, RADIO_MIN, REGEX_WHATSAPP, TIPOS } from '../models/Reporte.js'

/** En multipart todo llega como string: '' se trata como "no enviado". */
const vacioAUndefined = (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v)

const numero = (mensaje) =>
  z.preprocess(vacioAUndefined, z.coerce.number({ message: mensaje }).refine(Number.isFinite, mensaje))

const textoOpcional = (max, mensaje) =>
  z.preprocess(vacioAUndefined, z.string().trim().max(max, mensaje).optional())

const latitud = numero('Latitud inválida.').pipe(
  z.number().min(-90, 'Latitud inválida.').max(90, 'Latitud inválida.'),
)
const longitud = numero('Longitud inválida.').pipe(
  z.number().min(-180, 'Longitud inválida.').max(180, 'Longitud inválida.'),
)

/** Campos de texto de POST /api/reportes (la foto la maneja multer). */
export const esquemaCrearReporte = z
  .object({
    tipo: z.enum(TIPOS, { message: 'Indica si la mascota está perdida o fue avistada.' }),
    especie: z.enum(ESPECIES, { message: 'Indica si es perro o gato.' }),
    nombre_mascota: textoOpcional(40, 'El nombre puede tener hasta 40 caracteres.'),
    descripcion: textoOpcional(300, 'La descripción puede tener hasta 300 caracteres.'),
    recompensa: z.preprocess(
      vacioAUndefined,
      z.coerce
        .number({ message: 'La recompensa debe ser un número.' })
        .int('La recompensa debe ser un monto entero.')
        .min(0, 'La recompensa no puede ser negativa.')
        .max(100_000_000, 'La recompensa es demasiado alta.')
        .optional(),
    ),
    contacto_whatsapp: z.preprocess(
      vacioAUndefined,
      z.string().trim().regex(REGEX_WHATSAPP, 'El WhatsApp debe tener el formato +569XXXXXXXX.').optional(),
    ),
    lat: latitud,
    lng: longitud,
    radio_metros: z.preprocess(
      vacioAUndefined,
      z.coerce
        .number({ message: 'El radio debe ser un número.' })
        .int('El radio debe ser un número entero de metros.')
        .min(RADIO_MIN, `El radio mínimo es ${RADIO_MIN} m.`)
        .max(RADIO_MAX, `El radio máximo es ${RADIO_MAX / 1000} km.`)
        .optional(),
    ),
  })
  .strict()
  .superRefine((d, ctx) => {
    if (d.tipo !== 'PERDIDO') return
    if (!d.nombre_mascota) {
      ctx.addIssue({ code: 'custom', path: ['nombre_mascota'], message: 'Escribe el nombre de tu mascota.' })
    }
    if (!d.contacto_whatsapp) {
      ctx.addIssue({
        code: 'custom',
        path: ['contacto_whatsapp'],
        message: 'Deja un WhatsApp para que puedan avisarte.',
      })
    }
  })

/** Query de GET /api/reportes/cercanos */
export const esquemaCercanos = z.object({
  lat: latitud,
  lng: longitud,
  maxKm: z.preprocess(
    vacioAUndefined,
    z.coerce
      .number({ message: 'maxKm debe ser un número.' })
      .min(0.1, 'maxKm mínimo: 0,1 km.')
      .max(50, 'maxKm máximo: 50 km.')
      .default(10),
  ),
})
