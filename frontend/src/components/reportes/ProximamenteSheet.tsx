import { useState } from 'react'
import { Eye, Search } from 'lucide-react'
import { Drawer, DrawerClose, DrawerContent } from '@/components/ui/drawer'
import { cn } from '@/lib/utils'
import type { TipoReporte } from '@/types/reporte'

const TEXTOS: Record<TipoReporte, { titulo: string; cuerpo: string }> = {
  PERDIDO: {
    titulo: 'Perdí mi mascota',
    cuerpo:
      'Muy pronto vas a poder marcar dónde se perdió, elegir el radio de búsqueda y avisar a todos tus vecinos en menos de un minuto.',
  },
  AVISTADO: {
    titulo: 'Vi una mascota',
    cuerpo:
      'Muy pronto vas a poder sacarle una foto, fijar tu ubicación y publicar el avistamiento en 30 segundos.',
  },
}

interface Props {
  tipo: TipoReporte | null
  onClose: () => void
}

/** Fase 1: los formularios aún no existen (llegan en la Fase 2). */
export function ProximamenteSheet({ tipo, onClose }: Props) {
  // Se guarda el último tipo para que el contenido no desaparezca al cerrar.
  const [visible, setVisible] = useState<TipoReporte | null>(tipo)
  if (tipo && tipo !== visible) setVisible(tipo)

  const texto = visible ? TEXTOS[visible] : null
  const esPerdido = visible === 'PERDIDO'
  const Icono = esPerdido ? Search : Eye

  return (
    <Drawer open={tipo !== null} onOpenChange={(abierto) => !abierto && onClose()}>
      <DrawerContent srTitle={texto?.titulo} showClose={false}>
        {texto && (
          <div className="flex flex-col items-center gap-4 pb-2 text-center">
            <span
              className={cn(
                'flex size-16 items-center justify-center rounded-full text-white',
                esPerdido ? 'bg-red-600' : 'bg-emerald-600',
              )}
            >
              <Icono className="size-8" strokeWidth={2.5} aria-hidden />
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900">{texto.titulo}</h2>
            <p className="text-base leading-relaxed text-slate-800">{texto.cuerpo}</p>
            <DrawerClose className="mt-2 h-14 w-full rounded-2xl bg-slate-900 text-lg font-bold text-white">
              Entendido
            </DrawerClose>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}
