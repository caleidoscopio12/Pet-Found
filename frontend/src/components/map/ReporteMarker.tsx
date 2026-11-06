import { Circle, Marker } from 'react-leaflet'
import { toLeaflet } from '@/lib/geo'
import type { Reporte } from '@/types/reporte'
import { iconoAvistado, iconoPerdido } from './markerIcons'

const estiloRadio = {
  color: '#dc2626', // red-600
  weight: 2,
  dashArray: '6 6',
  fillColor: '#ef4444', // red-500
  fillOpacity: 0.12,
}

interface Props {
  reporte: Reporte
  onSelect: (reporte: Reporte) => void
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
          pathOptions={estiloRadio}
          interactive={false}
        />
      )}
      <Marker
        position={centro}
        icon={esPerdido ? iconoPerdido : iconoAvistado}
        title={reporte.nombre_mascota ?? 'Mascota avistada'}
        eventHandlers={{ click: () => onSelect(reporte) }}
      />
    </>
  )
}
