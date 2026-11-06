import mongoose from 'mongoose'

const { Schema } = mongoose

/**
 * Modelo `Reporte` — esquema EXACTO de CLAUDE.md §7. No agregar campos sin consultar.
 * ¡CRÍTICO!: ubicacion.coordinates SIEMPRE es [longitud, latitud] (GeoJSON).
 */

export const TIPOS = ['PERDIDO', 'AVISTADO']
export const ESPECIES = ['PERRO', 'GATO']
export const ESTADOS = ['ACTIVO', 'ENCONTRADO']
export const REGEX_WHATSAPP = /^\+569\d{8}$/
export const RADIO_MIN = 100
export const RADIO_MAX = 5000
export const RADIO_DEFAULT = 1000

function esPerdido() {
  return this.tipo === 'PERDIDO'
}

const ubicacionSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (c) =>
          Array.isArray(c) &&
          c.length === 2 &&
          c.every(Number.isFinite) &&
          c[0] >= -180 &&
          c[0] <= 180 &&
          c[1] >= -90 &&
          c[1] <= 90,
        message: 'Coordenadas inválidas: deben ser [longitud, latitud].',
      },
    },
  },
  { _id: false },
)

const reporteSchema = new Schema(
  {
    tipo: {
      type: String,
      enum: { values: TIPOS, message: 'El tipo debe ser PERDIDO o AVISTADO.' },
      required: [true, 'Indica si la mascota está perdida o fue avistada.'],
    },
    especie: {
      type: String,
      enum: { values: ESPECIES, message: 'La especie debe ser PERRO o GATO.' },
      required: [true, 'Indica si es perro o gato.'],
    },
    estado: {
      type: String,
      enum: { values: ESTADOS, message: 'Estado inválido.' },
      default: 'ACTIVO',
    },
    nombre_mascota: {
      type: String,
      trim: true,
      maxlength: [40, 'El nombre puede tener hasta 40 caracteres.'],
      required: [esPerdido, 'Escribe el nombre de tu mascota.'],
    },
    descripcion: {
      type: String,
      trim: true,
      maxlength: [300, 'La descripción puede tener hasta 300 caracteres.'],
    },
    recompensa: {
      type: Number,
      default: 0,
      min: [0, 'La recompensa no puede ser negativa.'],
      validate: { validator: Number.isInteger, message: 'La recompensa debe ser un monto entero.' },
    },
    contacto_whatsapp: {
      type: String,
      trim: true,
      match: [REGEX_WHATSAPP, 'El WhatsApp debe tener el formato +569XXXXXXXX.'],
      required: [esPerdido, 'Deja un WhatsApp para que puedan avisarte.'],
    },
    foto_url: {
      type: String,
      required: [true, 'Falta la foto de la mascota.'],
      match: [/^https:\/\/res\.cloudinary\.com\//, 'La foto debe estar alojada en Cloudinary.'],
    },
    ubicacion: { type: ubicacionSchema, required: [true, 'Falta la ubicación.'] },
    radio_metros: {
      type: Number,
      default: function () {
        return this.tipo === 'PERDIDO' ? RADIO_DEFAULT : 0
      },
      validate: {
        validator: function (v) {
          return this.tipo === 'PERDIDO' ? v >= RADIO_MIN && v <= RADIO_MAX : v === 0
        },
        message: `El radio de búsqueda debe estar entre ${RADIO_MIN} m y ${RADIO_MAX / 1000} km.`,
      },
    },
    // Vector de la IA (Fase 3). Nunca se envía al frontend.
    embedding: { type: [Number], select: false, default: undefined },
    createdAt: { type: Date, default: Date.now, immutable: true },
  },
  {
    strict: 'throw', // rechaza campos que no están en el esquema
    versionKey: false,
    collection: 'reportes',
  },
)

// Un avistamiento no tiene radio ni recompensa.
reporteSchema.pre('validate', function () {
  if (this.tipo === 'AVISTADO') {
    this.radio_metros = 0
    this.recompensa = 0
  }
})

// Índice geoespacial para $nearSphere.
reporteSchema.index({ ubicacion: '2dsphere' })

export const Reporte = mongoose.models.Reporte ?? mongoose.model('Reporte', reporteSchema)
