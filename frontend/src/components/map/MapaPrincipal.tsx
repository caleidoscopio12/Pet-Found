import { MapContainer, TileLayer } from 'react-leaflet'
import { CARTO_API_KEY, DEFAULT_CENTER } from '@/lib/config'
import type { Reporte } from '@/types/reporte'
import { ReporteMarker } from './ReporteMarker'

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

/**
 * CARTO Voyager: mejor contraste que el OSM estándar bajo el sol.
 * CARTO exige API key (gratis para proyectos sin fines de lucro, hasta 5M teselas/mes:
 * https://carto.com/basemaps/apikey). Sin key devuelve teselas con marca de agua,
 * así que en ese caso usamos el OSM estándar como respaldo.
 */
const TILES = CARTO_API_KEY
  ? {
      url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(CARTO_API_KEY)}`,
      attribution: `${OSM_ATTRIBUTION} &copy; <a href="https://carto.com/attributions">CARTO</a>`,
      subdomains: 'abcd',
      maxZoom: 20,
    }
  : {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: OSM_ATTRIBUTION,
      subdomains: 'abc',
      maxZoom: 19,
    }

if (!CARTO_API_KEY) {
  console.warn(
    '[mapa] Falta VITE_CARTO_API_KEY: usando teselas OSM estándar. Pide una key gratis en https://carto.com/basemaps/apikey',
  )
}

interface Props {
  reportes: Reporte[]
  onSelect: (reporte: Reporte) => void
}

/**
 * Mapa a pantalla completa. El contenedor padre (App) usa `isolate` para que
 * los paneles de Leaflet (z-index 400–1000) no tapen el FAB ni el Drawer.
 */
export function MapaPrincipal({ reportes, onSelect }: Props) {
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={14}
      zoomControl={false}
      className="h-full w-full"
    >
      <TileLayer
        url={TILES.url}
        attribution={TILES.attribution}
        subdomains={TILES.subdomains}
        maxZoom={TILES.maxZoom}
      />
      {reportes.map((r) => (
        <ReporteMarker key={r._id} reporte={r} onSelect={onSelect} />
      ))}
    </MapContainer>
  )
}
