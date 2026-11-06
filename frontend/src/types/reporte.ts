import type { GeoPoint } from '@/lib/geo'

/** Espejo del esquema Mongoose `Reportes` (CLAUDE.md §7). */
export type TipoReporte = 'PERDIDO' | 'AVISTADO'
export type Especie = 'PERRO' | 'GATO'
export type EstadoReporte = 'ACTIVO' | 'ENCONTRADO'

export interface Reporte {
  _id: string
  tipo: TipoReporte
  especie: Especie
  estado: EstadoReporte
  /** Obligatorio en PERDIDO, opcional en avistamientos. */
  nombre_mascota?: string
  /** Máx. 300 caracteres. */
  descripcion?: string
  recompensa: number
  /** Formato +569XXXXXXXX. Obligatorio en PERDIDO, opcional en AVISTADO. */
  contacto_whatsapp?: string
  foto_url: string
  /** ¡Siempre [longitud, latitud]! */
  ubicacion: GeoPoint
  /** 1000 por defecto en PERDIDO, 0 en AVISTADO. */
  radio_metros: number
  /** Vector de la IA (Fase 3). La API no lo envía al frontend. */
  embedding?: number[]
  /** ISO 8601, como llega desde la API en JSON. */
  createdAt: string
}

export type FiltroReporte = 'TODOS' | TipoReporte
