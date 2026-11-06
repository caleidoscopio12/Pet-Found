import type { LatLng } from '@/lib/geo'

const num = (valor: string | undefined, respaldo: number) => {
  const n = Number(valor)
  return valor !== undefined && valor !== '' && Number.isFinite(n) ? n : respaldo
}

/** Centro por defecto del mapa (Constitución, Región del Maule). */
export const DEFAULT_CENTER: LatLng = [
  num(import.meta.env.VITE_DEFAULT_LAT, -35.333),
  num(import.meta.env.VITE_DEFAULT_LNG, -72.416),
]

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

/** Key gratuita de CARTO Basemaps (https://carto.com/basemaps/apikey). Vacía → teselas OSM. */
export const CARTO_API_KEY: string = import.meta.env.VITE_CARTO_API_KEY?.trim() ?? ''
