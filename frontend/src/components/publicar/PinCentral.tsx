import { cn } from '@/lib/utils'

/**
 * Pin fijo en el centro exacto de la pantalla (= centro del mapa).
 * El usuario arrastra el mapa por debajo; la punta del pin marca el punto elegido.
 */
export function PinCentral({ perdido }: { perdido: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-full"
    >
      <div className="flex flex-col items-center drop-shadow-lg">
        <span
          className={cn(
            'flex size-11 items-center justify-center rounded-full border-4 border-white',
            perdido ? 'bg-red-600' : 'bg-emerald-600',
          )}
        >
          <span className="size-3 rounded-full bg-white" />
        </span>
        <span className={cn('h-5 w-1 rounded-b-full', perdido ? 'bg-red-700' : 'bg-emerald-700')} />
      </div>
      {/* sombra en el punto exacto */}
      <span className="absolute -bottom-1 left-1/2 h-2 w-4 -translate-x-1/2 rounded-full bg-slate-900/40 blur-[1px]" />
    </div>
  )
}
