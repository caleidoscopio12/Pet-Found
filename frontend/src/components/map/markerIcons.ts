import L from 'leaflet'

/**
 * Pines con L.divIcon + Tailwind.
 * - NUNCA usamos L.Icon.Default: con Vite sus PNG (marker-icon.png) se rompen.
 * - `className: ''` anula el estilo .leaflet-div-icon (cuadro blanco con borde).
 * - Las clases van escritas completas para que Tailwind v4 las detecte al escanear.
 * - Se crean una sola vez (a nivel de módulo), no en cada render.
 */

const TAMANO = 44 // área táctil cómoda para el pulgar

/** Estilo del círculo de radio de búsqueda (reportes y vista previa al publicar). */
export const ESTILO_RADIO = {
  color: '#dc2626', // red-600
  weight: 2,
  dashArray: '6 6',
  fillColor: '#ef4444', // red-500
  fillOpacity: 0.12,
}

export const ESTILO_RADIO_PREVIEW = { ...ESTILO_RADIO, weight: 3, fillOpacity: 0.18 }

export const iconoPerdido = L.divIcon({
  className: '',
  iconSize: [TAMANO, TAMANO],
  iconAnchor: [TAMANO / 2, TAMANO / 2],
  html: `
    <span class="relative flex size-11 items-center justify-center" aria-label="Mascota perdida">
      <span class="absolute inline-flex size-8 animate-ping rounded-full bg-red-500 opacity-60"></span>
      <span class="relative inline-flex size-6 rounded-full border-[3px] border-white bg-red-600 shadow-lg shadow-red-900/40"></span>
    </span>`,
})

export const iconoAvistado = L.divIcon({
  className: '',
  iconSize: [TAMANO, TAMANO],
  iconAnchor: [TAMANO / 2, TAMANO / 2],
  html: `
    <span class="relative flex size-11 items-center justify-center" aria-label="Mascota avistada">
      <span class="relative inline-flex size-6 rounded-full border-[3px] border-white bg-emerald-500 shadow-lg shadow-emerald-900/40"></span>
    </span>`,
})
