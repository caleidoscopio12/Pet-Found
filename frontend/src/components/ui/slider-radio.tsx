import { formatoRadio } from '@/lib/formato'
import { RADIO_MAX, RADIO_MIN, RADIO_PASO } from '@/lib/reglas'
import { cn } from '@/lib/utils'

const ATAJOS = [500, 1000, 2000, 5000]

interface Props {
  valor: number
  onChange: (metros: number) => void
  /** Al soltar el slider o tocar un atajo (para ajustar el zoom del mapa). */
  onSoltar?: () => void
  id?: string
}

/**
 * Slider de radio de búsqueda: <input type="range"> nativo (accesible, funciona con
 * teclado y lectores de pantalla) estilizado con Tailwind para el pulgar.
 */
export function SliderRadio({ valor, onChange, onSoltar, id = 'radio-busqueda' }: Props) {
  const pct = ((valor - RADIO_MIN) / (RADIO_MAX - RADIO_MIN)) * 100

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-base font-bold text-slate-900">
          Radio de búsqueda
        </label>
        <output htmlFor={id} className="text-2xl font-extrabold text-red-600 tabular-nums">
          {formatoRadio(valor)}
        </output>
      </div>

      <input
        id={id}
        type="range"
        min={RADIO_MIN}
        max={RADIO_MAX}
        step={RADIO_PASO}
        value={valor}
        aria-valuetext={formatoRadio(valor)}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onSoltar}
        onKeyUp={onSoltar}
        style={{ background: `linear-gradient(to right, #dc2626 ${pct}%, #fee2e2 ${pct}%)` }}
        className={cn(
          'mt-3 h-3 w-full cursor-pointer appearance-none rounded-full outline-none',
          'focus-visible:ring-4 focus-visible:ring-red-200',
          '[&::-webkit-slider-thumb]:size-8 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:shadow-lg',
          '[&::-moz-range-thumb]:size-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4',
          '[&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-red-600 [&::-moz-range-thumb]:shadow-lg',
        )}
      />

      <div className="mt-3 flex gap-2" role="group" aria-label="Atajos de radio">
        {ATAJOS.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={valor === m}
            onClick={() => {
              onChange(m)
              onSoltar?.()
            }}
            className={cn(
              'h-10 flex-1 rounded-full text-sm font-bold ring-1 transition-colors',
              valor === m ? 'bg-red-600 text-white ring-red-600' : 'bg-white text-slate-800 ring-slate-300',
            )}
          >
            {formatoRadio(m)}
          </button>
        ))}
      </div>
    </div>
  )
}
