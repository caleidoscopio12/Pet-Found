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

/**
 * En modo "movil" (npm run dev:movil) se usa la ruta relativa /api: Vite la reenvía al
 * backend, así el celular no llama a "localhost" ni a HTTP desde una página HTTPS.
 */
export const API_URL: string =
  import.meta.env.MODE === 'movil' ? '/api' : (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api')

/** Key gratuita de CARTO Basemaps (https://carto.com/basemaps/apikey). Vacía → teselas OSM. */
export const CARTO_API_KEY: string = import.meta.env.VITE_CARTO_API_KEY?.trim() ?? ''
