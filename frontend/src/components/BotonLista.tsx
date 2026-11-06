import { List } from 'lucide-react'

interface Props {
  perdidos: number
  avistados: number
  onClick: () => void
}

/** Botón flotante inferior izquierdo: abre el panel con la lista de perdidos y avistados. */
export function BotonLista({ perdidos, avistados, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ver lista: ${perdidos} perdidos y ${avistados} avistados`}
      className="fixed bottom-[calc(2.5rem+env(safe-area-inset-bottom))] left-4 z-10 flex h-14 items-center gap-2 rounded-full bg-white pr-4 pl-4 text-base font-bold text-slate-900 shadow-xl ring-1 ring-slate-900/10 active:scale-[0.97]"
    >
      <List className="size-6" strokeWidth={2.5} aria-hidden />
      Ver lista
      <span className="flex items-center gap-1" aria-hidden>
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-sm font-extrabold text-white">
          {perdidos}
        </span>
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-sm font-extrabold text-white">
          {avistados}
        </span>
      </span>
    </button>
  )
}
