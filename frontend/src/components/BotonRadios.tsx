import { CircleDashed } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  activo: boolean
  onToggle: () => void
}

/** Muestra u oculta el círculo de búsqueda de todas las mascotas perdidas. */
export function BotonRadios({ activo, onToggle }: Props) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onToggle}
      className={cn(
        'fixed right-5 bottom-[calc(7.5rem+env(safe-area-inset-bottom))] z-10 flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-bold shadow-lg ring-1 transition-colors active:scale-[0.97]',
        activo ? 'bg-red-600 text-white ring-red-600' : 'bg-white text-slate-900 ring-slate-900/10',
      )}
    >
      <CircleDashed className="size-5" strokeWidth={2.5} aria-hidden />
      {activo ? 'Ocultar radios' : 'Ver radios'}
    </button>
  )
}
