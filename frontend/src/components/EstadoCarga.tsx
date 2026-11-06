import { CloudOff, LoaderCircle, PawPrint, RotateCw } from 'lucide-react'
import type { EstadoCarga as Estado } from '@/hooks/useReportesCercanos'

interface Props {
  estado: Estado
  error: string | null
  hayReportes: boolean
  onReintentar: () => void
}

/** Aviso pequeño bajo los filtros: cargando, error con reintentar, o zona sin reportes. */
export function EstadoCarga({ estado, error, hayReportes, onReintentar }: Props) {
  let contenido: React.ReactNode = null

  if (estado === 'cargando' || estado === 'inicial') {
    contenido = (
      <span className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-800">
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
        Buscando reportes…
      </span>
    )
  } else if (estado === 'error') {
    contenido = (
      <span className="flex items-center gap-2 py-1.5 pr-1.5 pl-4 text-sm font-semibold text-red-800">
        <CloudOff className="size-4 shrink-0" aria-hidden />
        {error ?? 'No pudimos cargar los reportes.'}
        <button
          type="button"
          onClick={onReintentar}
          className="ml-1 inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-red-600 px-3 font-bold text-white"
        >
          <RotateCw className="size-4" aria-hidden />
          Reintentar
        </button>
      </span>
    )
  } else if (!hayReportes) {
    contenido = (
      <span className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-800">
        <PawPrint className="size-4" aria-hidden />
        No hay reportes en esta zona
      </span>
    )
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[calc(4.75rem+env(safe-area-inset-top))] z-10 flex justify-center px-3"
    >
      {contenido && (
        <div className="pointer-events-auto max-w-md rounded-full bg-white/95 shadow-md ring-1 ring-slate-900/10">
          {contenido}
        </div>
      )}
    </div>
  )
}
