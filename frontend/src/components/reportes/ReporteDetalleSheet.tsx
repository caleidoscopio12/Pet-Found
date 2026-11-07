import { useState } from 'react'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { FRACCION_FICHA_COMPACTA } from '@/lib/layout'
import { obtenerLlave } from '@/lib/misReportes'
import type { Reporte } from '@/types/reporte'
import { BorrarPublicacion } from './BorrarPublicacion'
import { TarjetaMascota } from './TarjetaMascota'

type Altura = number | string | null

const SNAP_POINTS = [FRACCION_FICHA_COMPACTA, 1]

interface Props {
  reporte: Reporte | null
  onClose: () => void
  /** Se llama cuando quien publicó borra el reporte. */
  onBorrado: (reporte: Reporte) => void
}

/**
 * Ficha de detalle tipo "peek" (como Google Maps): abre a media pantalla para que
 * el pin y su radio se vean arriba, y se arrastra hacia arriba para ver todo.
 * No es modal: el mapa sigue visible y se puede mover o tocar otro pin.
 */
export function ReporteDetalleSheet({ reporte, onClose, onBorrado }: Props) {
  // Se guarda el último reporte para que el contenido no desaparezca
  // mientras corre la animación de cierre.
  const [visible, setVisible] = useState<Reporte | null>(reporte)
  const [altura, setAltura] = useState<Altura>(FRACCION_FICHA_COMPACTA)
  if (reporte && reporte !== visible) {
    setVisible(reporte)
    setAltura(FRACCION_FICHA_COMPACTA) // cada mascota nueva abre compacta
  }

  const esMio = visible ? Boolean(obtenerLlave(visible._id)) : false

  return (
    <Drawer
      open={reporte !== null}
      onOpenChange={(abierto) => !abierto && onClose()}
      modal={false}
      disablePointerDismissal
      snapPoints={SNAP_POINTS}
      snapPoint={altura}
      onSnapPointChange={setAltura}
    >
      <DrawerContent srTitle={visible?.nombre_mascota ?? 'Detalle de la mascota'} fondo={false}>
        {visible && (
          <div className="flex flex-col gap-4 pb-1">
            <TarjetaMascota reporte={visible} esMio={esMio} />
            {esMio && (
              <BorrarPublicacion
                key={visible._id}
                reporteId={visible._id}
                onBorrado={() => onBorrado(visible)}
                onConfirmando={() => setAltura(1)}
              />
            )}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}
