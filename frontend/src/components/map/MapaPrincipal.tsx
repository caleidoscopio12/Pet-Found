import L, { type TileErrorEvent } from 'leaflet'
import { useEffect, useState } from 'react'
import { Circle, MapContainer, TileLayer, useMap } from 'react-leaflet'
import type { AreaMapa } from '@/hooks/useReportesCercanos'
import { CARTO_API_KEY, DEFAULT_CENTER } from '@/lib/config'
import type { LatLng } from '@/lib/geo'
import type { Reporte } from '@/types/reporte'
import { ESTILO_RADIO_PREVIEW } from './markerIcons'
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

/**
 * Con señal inestable (3G/4G) una tesela puede fallar y Leaflet la deja en blanco para siempre.
 * Reintentamos hasta 2 veces con espera creciente.
 */
const MAX_REINTENTOS = 2
function reintentarTesela(e: TileErrorEvent) {
  const img = e.tile as HTMLImageElement & { reintentos?: number }
  const n = (img.reintentos ?? 0) + 1
  if (n > MAX_REINTENTOS) return
  img.reintentos = n
  const src = img.src.replace(/([?&])reintento=\d+&?/, '$1').replace(/[?&]$/, '')
  window.setTimeout(() => {
    img.src = `${src}${src.includes('?') ? '&' : '?'}reintento=${n}`
  }, 1000 * n)
}

if (!CARTO_API_KEY) {
  console.warn(
    '[mapa] Falta VITE_CARTO_API_KEY: usando teselas OSM estándar. Pide una key gratis en https://carto.com/basemaps/apikey',
  )
}

/** Punto al que debe volar el mapa. `id` cambia en cada pedido para poder repetir el mismo punto. */
export interface EnfoqueMapa {
  centro: LatLng
  id: number
  /** Zoom mínimo al llegar (default 15). */
  zoom?: number
  /**
   * true (default): deja el punto en el tercio superior porque abajo se abre un Drawer.
   * false: lo deja en el centro exacto (GPS / elegir ubicación).
   */
  desplazar?: boolean
}

function VolarA({ enfoque }: { enfoque: EnfoqueMapa | null }) {
  const map = useMap()
  useEffect(() => {
    if (!enfoque) return
    const zoom = Math.max(map.getZoom(), enfoque.zoom ?? 15)
    let destino = L.latLng(enfoque.centro)
    if (enfoque.desplazar !== false) {
      const punto = map.project(destino, zoom).add([0, map.getSize().y * 0.22])
      destino = map.unproject(punto, zoom)
    }
    map.flyTo(destino, zoom, { duration: 0.8 })
  }, [enfoque, map])
  return null
}

/** Avisa la zona visible (centro + km a la esquina) cada vez que el mapa deja de moverse. */
function CargadorArea({ onArea }: { onArea: (area: AreaMapa) => void }) {
  const map = useMap()
  useEffect(() => {
    let t: number | undefined
    const emitir = () => {
      window.clearTimeout(t)
      t = window.setTimeout(() => {
        const c = map.getCenter()
        const km = map.distance(c, map.getBounds().getNorthEast()) / 1000
        onArea({ centro: [c.lat, c.lng], maxKm: Math.min(50, Math.max(1, km)) })
      }, 400)
    }
    emitir()
    map.on('moveend', emitir)
    return () => {
      window.clearTimeout(t)
      map.off('moveend', emitir)
    }
  }, [map, onArea])
  return null
}

/** Modo "elegir ubicación": el punto elegido es siempre el centro del mapa. */
export interface SeleccionMapa {
  /** Radio en metros para previsualizar (solo PERDIDO); null = sin círculo. */
  radio: number | null
  /** Se llama con el centro actual mientras el mapa se mueve. */
  onCentro: (centro: LatLng) => void
  /** Cambia cuando se suelta el slider: si el círculo no cabe, se aleja el zoom. */
  ajusteId: number
}

/**
 * Círculo de radio en tiempo real, siempre centrado en el centro del mapa.
 * Se actualiza como máximo una vez por frame mientras el usuario arrastra.
 */
function SeleccionCentro({ radio, onCentro, ajusteId }: SeleccionMapa) {
  const map = useMap()
  const [centro, setCentro] = useState<LatLng>(() => {
    const c = map.getCenter()
    return [c.lat, c.lng]
  })
  // onCentro debe ser estable (useCallback en App) para no re-suscribir en cada render.
  useEffect(() => {
    let frame = 0
    const leer = () => {
      frame = 0
      const c = map.getCenter()
      const nuevo: LatLng = [c.lat, c.lng]
      setCentro(nuevo)
      onCentro(nuevo)
    }
    const alMover = () => {
      if (!frame) frame = requestAnimationFrame(leer)
    }
    onCentro([map.getCenter().lat, map.getCenter().lng])
    map.on('move', alMover)
    return () => {
      cancelAnimationFrame(frame)
      map.off('move', alMover)
    }
  }, [map, onCentro])

  // Al soltar el slider: si el círculo no cabe en pantalla, alejar.
  useEffect(() => {
    if (!radio || ajusteId === 0) return
    const limites = L.latLng(map.getCenter()).toBounds(radio * 2)
    if (!map.getBounds().contains(limites)) {
      map.flyToBounds(limites, { padding: [24, 24], duration: 0.5 })
    }
  }, [ajusteId]) // eslint-disable-line react-hooks/exhaustive-deps

  return radio ? (
    <Circle center={centro} radius={radio} pathOptions={ESTILO_RADIO_PREVIEW} interactive={false} />
  ) : null
}

interface Props {
  reportes: Reporte[]
  /** Sin onSelect los pines no se pueden tocar (modo elegir ubicación). */
  onSelect?: (reporte: Reporte) => void
  enfoque?: EnfoqueMapa | null
  onArea: (area: AreaMapa) => void
  seleccion?: SeleccionMapa | null
}

/**
 * Mapa a pantalla completa. El contenedor padre (App) usa `isolate` para que
 * los paneles de Leaflet (z-index 400–1000) no tapen el FAB ni el Drawer.
 */
export function MapaPrincipal({ reportes, onSelect, enfoque = null, onArea, seleccion = null }: Props) {
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
        eventHandlers={{ tileerror: reintentarTesela }}
      />
      {reportes.map((r) => (
        <ReporteMarker key={r._id} reporte={r} onSelect={onSelect} />
      ))}
      <VolarA enfoque={enfoque} />
      <CargadorArea onArea={onArea} />
      {seleccion && <SeleccionCentro {...seleccion} />}
    </MapContainer>
  )
}
