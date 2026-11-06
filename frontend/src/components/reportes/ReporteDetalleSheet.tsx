import { useState } from 'react'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import type { Reporte } from '@/types/reporte'
import { TarjetaMascota } from './TarjetaMascota'

interface Props {
  reporte: Reporte | null
  onClose: () => void
}

/** Bottom sheet (Drawer de 21st) con el detalle del reporte seleccionado. */
export function ReporteDetalleSheet({ reporte, onClose }: Props) {
  // Se guarda el último reporte para que el contenido no desaparezca
  // mientras corre la animación de cierre.
  const [visible, setVisible] = useState<Reporte | null>(reporte)
  if (reporte && reporte !== visible) setVisible(reporte)

  return (
    <Drawer open={reporte !== null} onOpenChange={(abierto) => !abierto && onClose()}>
      <DrawerContent srTitle={visible?.nombre_mascota ?? 'Detalle de la mascota'}>
        {visible && <TarjetaMascota reporte={visible} />}
      </DrawerContent>
    </Drawer>
  )
}
