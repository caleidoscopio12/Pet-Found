import { Circle, Marker } from 'react-leaflet'
import { toLeaflet } from '@/lib/geo'
import type { Reporte } from '@/types/reporte'
import { ESTILO_RADIO, iconoAvistado, iconoPerdido } from './markerIcons'

interface Props {
  reporte: Reporte
  /** Sin onSelect el pin no responde al toque (modo elegir ubicación). */
  onSelect?: (reporte: Reporte) => void
}

export function ReporteMarker({ reporte, onSelect }: Props) {
  // La API/Mongo entrega [lng, lat]; Leaflet necesita [lat, lng].
  const centro = toLeaflet(reporte.ubicacion.coordinates)
  const esPerdido = reporte.tipo === 'PERDIDO'

  return (
    <>
      {/* <Circle> usa METROS reales y escala con el zoom (a diferencia de CircleMarker). */}
      {esPerdido && reporte.radio_metros > 0 && (
        <Circle
          center={centro}
          radius={reporte.radio_metros}
          pathOptions={onSelect ? ESTILO_RADIO : { ...ESTILO_RADIO, opacity: 0.35, fillOpacity: 0.05 }}
          interactive={false}
        />
      )}
      <Marker
        position={centro}
        icon={esPerdido ? iconoPerdido : iconoAvistado}
        title={reporte.nombre_mascota ?? 'Mascota avistada'}
        opacity={onSelect ? 1 : 0.45}
        interactive={Boolean(onSelect)}
        eventHandlers={onSelect ? { click: () => onSelect(reporte) } : {}}
      />
    </>
  )
}
