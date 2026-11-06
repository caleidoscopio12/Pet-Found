import { Eye, Search } from 'lucide-react'
import { FabExpandible } from '@/components/ui/fab-expandible'
import type { TipoReporte } from '@/types/reporte'

interface Props {
  onAccion: (tipo: TipoReporte) => void
}

/** Las 2 acciones principales: avistamiento (verde) y pérdida (rojo). */
export function FabAcciones({ onAccion }: Props) {
  return (
    <FabExpandible
      className="right-4 bottom-[calc(2rem+env(safe-area-inset-bottom))]"
      labelAbrir="Publicar un reporte"
      labelCerrar="Cerrar"
      acciones={[
        {
          label: 'Perdí mi mascota',
          icon: <Search className="size-5" strokeWidth={2.5} />,
          className: 'bg-red-600 text-white',
          onClick: () => onAccion('PERDIDO'),
        },
        {
          label: 'Vi una mascota',
          icon: <Eye className="size-5" strokeWidth={2.5} />,
          className: 'bg-emerald-600 text-white',
          onClick: () => onAccion('AVISTADO'),
        },
      ]}
    />
  )
}
