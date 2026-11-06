import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import type { FiltroReporte } from '@/types/reporte'

const OPCIONES: { valor: FiltroReporte; label: string; punto?: string }[] = [
  { valor: 'TODOS', label: 'Todos' },
  { valor: 'PERDIDO', label: 'Perdidos', punto: 'bg-red-600' },
  { valor: 'AVISTADO', label: 'Avistados', punto: 'bg-emerald-500' },
]

interface Props {
  valor: FiltroReporte
  onChange: (valor: FiltroReporte) => void
  conteo: Record<FiltroReporte, number>
}

/** Control segmentado flotante en la parte superior del mapa. */
export function FiltrosReporte({ valor, onChange, conteo }: Props) {
  return (
    <nav
      aria-label="Filtrar reportes"
      className="pointer-events-none fixed inset-x-0 top-0 z-10 flex justify-center px-3 pt-[calc(0.75rem+env(safe-area-inset-top))]"
    >
      <div className="pointer-events-auto flex w-full max-w-md gap-1 rounded-full bg-white p-1.5 shadow-lg ring-1 ring-slate-900/10">
        {OPCIONES.map((op) => {
          const activo = op.valor === valor
          return (
            <button
              key={op.valor}
              type="button"
              aria-pressed={activo}
              onClick={() => onChange(op.valor)}
              className={cn(
                'relative flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-[15px] font-semibold transition-colors',
                activo ? 'text-white' : 'text-slate-800',
              )}
            >
              {activo && (
                <motion.span
                  layoutId="filtro-activo"
                  className="absolute inset-0 rounded-full bg-slate-900"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              {op.punto && (
                <span className={cn('relative size-2.5 rounded-full ring-2 ring-white', op.punto)} />
              )}
              <span className="relative">{op.label}</span>
              <span className={cn('relative text-xs', activo ? 'text-white/80' : 'text-slate-500')}>
                {conteo[op.valor]}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
