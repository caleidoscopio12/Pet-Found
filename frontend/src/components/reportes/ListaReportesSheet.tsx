import { useMemo, useRef, useState } from 'react'
import { Cat, ChevronRight, Dog, Gift, MapPin, PawPrint, Search, X } from 'lucide-react'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { formatoCLP, formatoRadio, haceCuanto, normalizar } from '@/lib/formato'
import { cn } from '@/lib/utils'
import type { Especie, Reporte, TipoReporte } from '@/types/reporte'

type FiltroEspecie = 'TODAS' | Especie

const ESPECIES: { valor: FiltroEspecie; label: string; Icono: typeof Dog }[] = [
  { valor: 'TODAS', label: 'Todas', Icono: PawPrint },
  { valor: 'PERRO', label: 'Perros', Icono: Dog },
  { valor: 'GATO', label: 'Gatos', Icono: Cat },
]

const PESTANAS: Record<
  TipoReporte,
  { label: string; titulo: string; activo: string; punto: string; placeholder: string; vacio: string }
> = {
  PERDIDO: {
    label: 'Perdidos',
    titulo: 'Mascotas perdidas',
    activo: 'bg-red-600 text-white',
    punto: 'bg-red-600',
    placeholder: 'Buscar por nombre, raza, color…',
    vacio: 'No encontramos mascotas perdidas con esa búsqueda.',
  },
  AVISTADO: {
    label: 'Avistados',
    titulo: 'Mascotas avistadas',
    activo: 'bg-emerald-600 text-white',
    punto: 'bg-emerald-500',
    placeholder: 'Buscar por color, raza, lugar…',
    vacio: 'No encontramos avistamientos con esa búsqueda.',
  },
}

const NOMBRE_ESPECIE = { PERRO: 'Perro', GATO: 'Gato' } as const

interface Props {
  abierto: boolean
  /** Pestaña con la que se abre el panel. */
  tipoInicial: TipoReporte
  /** Reportes ACTIVOS de ambos tipos. */
  reportes: Reporte[]
  onClose: () => void
  onElegir: (reporte: Reporte) => void
}

/**
 * Panel con todas las mascotas perdidas y avistadas: cuando hay muchos puntos,
 * tocar pin por pin no escala. Pestañas Perdidos / Avistados + buscador + filtro de especie.
 */
export function ListaReportesSheet({ abierto, tipoInicial, reportes, onClose, onElegir }: Props) {
  const [tipo, setTipo] = useState<TipoReporte>(tipoInicial)
  const [especie, setEspecie] = useState<FiltroEspecie>('TODAS')
  const [texto, setTexto] = useState('')
  const tituloRef = useRef<HTMLHeadingElement>(null)

  // Cada vez que se abre, arranca en la pestaña pedida (ajuste de estado durante el render).
  const [abiertoAntes, setAbiertoAntes] = useState(abierto)
  if (abierto !== abiertoAntes) {
    setAbiertoAntes(abierto)
    if (abierto) setTipo(tipoInicial)
  }

  const conteoTipo = useMemo(
    () => ({
      PERDIDO: reportes.filter((r) => r.tipo === 'PERDIDO').length,
      AVISTADO: reportes.filter((r) => r.tipo === 'AVISTADO').length,
    }),
    [reportes],
  )

  const delTipo = useMemo(() => reportes.filter((r) => r.tipo === tipo), [reportes, tipo])

  const conteoEspecie = useMemo(
    () => ({
      TODAS: delTipo.length,
      PERRO: delTipo.filter((r) => r.especie === 'PERRO').length,
      GATO: delTipo.filter((r) => r.especie === 'GATO').length,
    }),
    [delTipo],
  )

  const resultados = useMemo(() => {
    const q = normalizar(texto)
    return delTipo
      .filter((r) => especie === 'TODAS' || r.especie === especie)
      .filter(
        (r) =>
          !q ||
          normalizar(r.nombre_mascota ?? '').includes(q) ||
          normalizar(r.descripcion ?? '').includes(q),
      )
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  }, [delTipo, especie, texto])

  const p = PESTANAS[tipo]

  return (
    <Drawer open={abierto} onOpenChange={(v) => !v && onClose()}>
      {/* Altura fija: la hoja no "salta" al filtrar. El foco va al título, no al buscador (no abre el teclado solo). */}
      <DrawerContent srTitle={p.titulo} className="h-[85dvh]" initialFocus={tituloRef}>
        <div className="sticky -top-4 z-10 -mx-5 -mt-4 bg-white px-5 pt-1 pb-3">
          <h2 ref={tituloRef} tabIndex={-1} className="sr-only">
            {p.titulo}
          </h2>

          {/* Pestañas Perdidos / Avistados */}
          <div
            role="tablist"
            aria-label="Tipo de reporte"
            className="mr-12 flex gap-1 rounded-full bg-slate-100 p-1"
          >
            {(Object.keys(PESTANAS) as TipoReporte[]).map((t) => {
              const activo = t === tipo
              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={activo}
                  onClick={() => setTipo(t)}
                  className={cn(
                    'flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-base font-bold transition-colors',
                    activo ? PESTANAS[t].activo : 'text-slate-800',
                  )}
                >
                  {!activo && <span className={cn('size-2.5 rounded-full', PESTANAS[t].punto)} />}
                  {PESTANAS[t].label}
                  <span className={cn('text-sm', activo ? 'text-white/85' : 'text-slate-500')}>
                    {conteoTipo[t]}
                  </span>
                </button>
              )
            })}
          </div>

          <label className="relative mt-3 block">
            <span className="sr-only">Buscar en {p.label.toLowerCase()}</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-slate-500"
              aria-hidden
            />
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={p.placeholder}
              className="h-12 w-full rounded-2xl bg-slate-100 pr-11 pl-12 text-base text-slate-900 placeholder:text-slate-500 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {texto && (
              <button
                type="button"
                onClick={() => setTexto('')}
                aria-label="Borrar búsqueda"
                className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-600"
              >
                <X className="size-5" />
              </button>
            )}
          </label>

          <div role="group" aria-label="Filtrar por especie" className="mt-3 flex gap-2">
            {ESPECIES.map(({ valor, label, Icono }) => {
              const activo = especie === valor
              return (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setEspecie(valor)}
                  className={cn(
                    'flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-[15px] font-semibold ring-1 transition-colors',
                    activo
                      ? 'bg-slate-900 text-white ring-slate-900'
                      : 'bg-white text-slate-800 ring-slate-300',
                  )}
                >
                  <Icono className="size-4.5" aria-hidden />
                  {label}
                  <span className={cn('text-xs', activo ? 'text-white/80' : 'text-slate-500')}>
                    {conteoEspecie[valor]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {resultados.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <PawPrint className="size-10 text-slate-400" aria-hidden />
            <p className="text-base font-semibold text-slate-800">{p.vacio}</p>
            <p className="text-sm text-slate-600">Prueba con otra palabra o cambia el filtro.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2 pb-2" role="tabpanel" aria-label={p.titulo}>
            {resultados.map((r) => (
              <li key={r._id}>
                <FilaReporte reporte={r} onClick={() => onElegir(r)} />
              </li>
            ))}
          </ul>
        )}
      </DrawerContent>
    </Drawer>
  )
}

function FilaReporte({ reporte: r, onClick }: { reporte: Reporte; onClick: () => void }) {
  const esPerdido = r.tipo === 'PERDIDO'
  const especie = NOMBRE_ESPECIE[r.especie]
  const titulo = r.nombre_mascota ?? `${especie} avistado`

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl p-2 text-left ring-1 ring-slate-200 active:bg-slate-100"
    >
      <span className="relative shrink-0">
        <img
          src={r.foto_url}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-16 rounded-xl bg-slate-200 object-cover"
        />
        <span
          className={cn(
            'absolute -top-1 -left-1 size-4 rounded-full ring-2 ring-white',
            esPerdido ? 'bg-red-600' : 'bg-emerald-500',
          )}
          aria-hidden
        />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-lg font-bold text-slate-900">{titulo}</span>
        <span className="block text-sm font-medium text-slate-700">
          {esPerdido ? especie : 'Visto'} · {haceCuanto(r.createdAt)}
        </span>
        {esPerdido ? (
          <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-slate-700">
            {r.radio_metros > 0 && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden />
                {formatoRadio(r.radio_metros)}
              </span>
            )}
            {r.recompensa > 0 && (
              <span className="inline-flex items-center gap-1 font-bold text-amber-800">
                <Gift className="size-3.5" aria-hidden />
                {formatoCLP(r.recompensa)}
              </span>
            )}
          </span>
        ) : (
          // En un avistamiento lo que identifica a la mascota es la descripción.
          r.descripcion && <span className="mt-0.5 line-clamp-2 text-sm text-slate-700">{r.descripcion}</span>
        )}
      </span>

      <ChevronRight className="size-5 shrink-0 text-slate-400" aria-hidden />
    </button>
  )
}
