import { Check, Hand, LoaderCircle, LocateFixed, X } from 'lucide-react'
import { SliderRadio } from '@/components/ui/slider-radio'
import { cn } from '@/lib/utils'
import type { TipoReporte } from '@/types/reporte'
import { PinCentral } from './PinCentral'

export type EstadoGps = 'inactivo' | 'buscando' | 'error'

interface Props {
  tipo: TipoReporte
  radio: number
  onRadio: (metros: number) => void
  onSoltarRadio: () => void
  gps: EstadoGps
  errorGps: string | null
  onUsarGps: () => void
  onConfirmar: () => void
  onCancelar: () => void
}

/**
 * Paso 1 de publicar: el usuario mueve el mapa bajo un pin fijo.
 * Panel inferior NO modal: el mapa sigue respondiendo al dedo.
 */
export function SelectorUbicacion({
  tipo,
  radio,
  onRadio,
  onSoltarRadio,
  gps,
  errorGps,
  onUsarGps,
  onConfirmar,
  onCancelar,
}: Props) {
  const perdido = tipo === 'PERDIDO'

  return (
    <>
      <PinCentral perdido={perdido} />

      {/* Instrucción arriba */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex justify-center px-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-white p-3 pl-4 shadow-lg ring-1 ring-slate-900/10">
          <Hand className="size-6 shrink-0 text-slate-700" aria-hidden />
          <p className="flex-1 text-[15px] leading-snug font-semibold text-slate-900">
            {perdido
              ? 'Mueve el mapa para marcar dónde se perdió tu mascota.'
              : 'Mueve el mapa para marcar dónde viste a la mascota.'}
          </p>
          <button
            type="button"
            onClick={onCancelar}
            aria-label="Cancelar publicación"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700"
          >
            <X className="size-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Panel inferior */}
      <section
        aria-label="Elegir ubicación"
        className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md rounded-t-[1.25rem] bg-white px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.18)]"
      >
        {perdido && (
          <div className="mb-4">
            <SliderRadio valor={radio} onChange={onRadio} onSoltar={onSoltarRadio} />
          </div>
        )}

        {errorGps && (
          <p role="alert" className="mb-3 rounded-xl bg-amber-100 px-3 py-2 text-sm font-medium text-amber-950">
            {errorGps}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onUsarGps}
            disabled={gps === 'buscando'}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 text-base font-bold text-slate-900 ring-1 ring-slate-300 disabled:opacity-70"
          >
            {gps === 'buscando' ? (
              <LoaderCircle className="size-5 animate-spin" aria-hidden />
            ) : (
              <LocateFixed className="size-5" aria-hidden />
            )}
            <span>{gps === 'buscando' ? 'Buscando…' : 'Mi ubicación'}</span>
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className={cn(
              'flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl text-lg font-bold text-white shadow-lg active:scale-[0.98]',
              perdido ? 'bg-red-600' : 'bg-emerald-600',
            )}
          >
            <Check className="size-6" strokeWidth={3} aria-hidden />
            Confirmar
          </button>
        </div>
      </section>
    </>
  )
}
