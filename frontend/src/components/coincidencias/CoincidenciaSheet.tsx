import { useEffect, useState } from 'react'
import { Clock, Gift, MapPin, MessageCircle, MessageCircleOff, ScanSearch } from 'lucide-react'
import { FotoMascota } from '@/components/foto/FotoMascota'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { formatoCLP, formatoRadio, haceCuanto, linkWhatsApp } from '@/lib/formato'
import { cn } from '@/lib/utils'
import type { Coincidencia, Reporte } from '@/types/reporte'

const ESPECIE = { PERRO: 'perro', GATO: 'gato' } as const

/** Etiqueta humana del parecido (la similitud coseno sola no le dice nada a un vecino). */
function nivelParecido(s: number) {
  if (s >= 0.93) return { texto: 'Muy parecida', clase: 'bg-emerald-600 text-white' }
  if (s >= 0.88) return { texto: 'Bastante parecida', clase: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300' }
  return { texto: 'Parecida', clase: 'bg-amber-100 text-amber-950 ring-1 ring-amber-300' }
}

export interface DatosCoincidencias {
  /** El reporte que se acaba de publicar. */
  propio: Reporte
  /** Máx. 3, de mayor a menor similitud. */
  lista: Coincidencia[]
}

interface Props {
  datos: DatosCoincidencias | null
  onCerrar: () => void
  onVerEnMapa: (reporte: Reporte) => void
}

/**
 * Alerta "¡Posible coincidencia!" justo después de publicar (Fase 3).
 * Modal y grande: es un momento importante. Compara tu foto con la del otro reporte
 * y ofrece contactar al dueño (si publicaste un avistamiento) o al vecino (si publicaste una pérdida).
 */
export function CoincidenciaSheet({ datos, onCerrar, onVerEnMapa }: Props) {
  // Conservar el contenido durante la animación de cierre.
  const [visible, setVisible] = useState<DatosCoincidencias | null>(datos)
  if (datos && datos !== visible) setVisible(datos)

  // Vibración corta al aparecer (si el teléfono lo permite).
  useEffect(() => {
    if (datos) navigator.vibrate?.([120, 80, 120])
  }, [datos])

  const publiqueAvistamiento = visible?.propio.tipo === 'AVISTADO'
  const varias = (visible?.lista.length ?? 0) > 1

  return (
    <Drawer open={datos !== null} onOpenChange={(v) => !v && onCerrar()}>
      <DrawerContent srTitle="Posible coincidencia" className="max-h-[92dvh]">
        {visible && (
          <div className="flex flex-col gap-5 pb-1">
            <header className="flex items-start gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-amber-400 text-amber-950">
                <ScanSearch className="size-7" strokeWidth={2.5} aria-hidden />
              </span>
              <div className="pr-10">
                <h2 className="text-2xl leading-tight font-extrabold text-slate-900">
                  {varias ? '¡Posibles coincidencias!' : '¡Posible coincidencia!'}
                </h2>
                <p className="mt-1 text-[15px] leading-snug text-slate-700">
                  {publiqueAvistamiento
                    ? 'La mascota que viste se parece a una que están buscando cerca.'
                    : 'Unos vecinos vieron una mascota parecida cerca de donde se perdió.'}
                </p>
              </div>
            </header>

            {visible.lista.map((c) => (
              <TarjetaCoincidencia
                key={c.reporte._id}
                coincidencia={c}
                propio={visible.propio}
                onVerEnMapa={() => onVerEnMapa(c.reporte)}
              />
            ))}

            <p className="text-center text-sm text-slate-600">
              La app compara las fotos automáticamente; puede equivocarse. Confírmalo conversando.
            </p>
            <button
              type="button"
              onClick={onCerrar}
              className="h-12 rounded-2xl text-base font-bold text-slate-700 ring-1 ring-slate-300"
            >
              {publiqueAvistamiento ? 'No es la misma, cerrar' : 'No es mi mascota, cerrar'}
            </button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}

function TarjetaCoincidencia({
  coincidencia: { reporte: otro, similitud, distanciaMetros },
  propio,
  onVerEnMapa,
}: {
  coincidencia: Coincidencia
  propio: Reporte
  onVerEnMapa: () => void
}) {
  const nivel = nivelParecido(similitud)
  const publiqueAvistamiento = propio.tipo === 'AVISTADO'
  const especie = ESPECIE[otro.especie]
  const nombre = otro.nombre_mascota ?? `${especie[0].toUpperCase()}${especie.slice(1)} avistado`
  const distancia = formatoRadio(distanciaMetros)

  const mensaje = publiqueAvistamiento
    ? `Hola, vi en Pet-Found tu aviso de ${nombre}. Acabo de publicar un avistamiento de un ${especie} muy parecido, a ${distancia} de donde se perdió. ¿Podría ser tu mascota?`
    : `Hola, vi en Pet-Found que avistaste un ${especie} parecido a mi mascota ${propio.nombre_mascota ?? ''}. ¿Me puedes contar dónde y cuándo lo viste?`

  return (
    <article className="rounded-3xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <div className="grid grid-cols-2 gap-2">
        <Foto url={propio.foto_url} etiqueta={publiqueAvistamiento ? 'Tu foto' : 'Tu mascota'} />
        <Foto url={otro.foto_url} etiqueta={publiqueAvistamiento ? 'La que buscan' : 'La que vieron'} />
      </div>

      <div className="mt-3 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xl font-extrabold text-slate-900">{nombre}</h3>
          <span className={cn('rounded-full px-2.5 py-0.5 text-sm font-bold', nivel.clase)}>
            {nivel.texto} · {Math.round(similitud * 100)} %
          </span>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] font-medium text-slate-700">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-4" aria-hidden />a {distancia}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-4" aria-hidden />
            {haceCuanto(otro.createdAt)}
          </span>
          {otro.recompensa > 0 && (
            <span className="inline-flex items-center gap-1 font-bold text-amber-800">
              <Gift className="size-4" aria-hidden />
              {formatoCLP(otro.recompensa)}
            </span>
          )}
        </p>
        {otro.descripcion && <p className="mt-2 line-clamp-2 text-[15px] text-slate-800">{otro.descripcion}</p>}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {otro.contacto_whatsapp ? (
          <a
            href={linkWhatsApp(otro.contacto_whatsapp, mensaje)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#1f9e4f] text-lg font-bold text-white shadow-lg active:scale-[0.98]"
          >
            <MessageCircle className="size-6" aria-hidden />
            {publiqueAvistamiento ? 'Avisar al dueño por WhatsApp' : 'Escribir al vecino'}
          </a>
        ) : (
          <p className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3 text-[15px] leading-snug text-slate-800 ring-1 ring-slate-200">
            <MessageCircleOff className="mt-0.5 size-5 shrink-0 text-slate-600" aria-hidden />
            Este vecino no dejó teléfono. Pronto podrás escribirle por chat desde la app.
          </p>
        )}
        <button
          type="button"
          onClick={onVerEnMapa}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white text-base font-bold text-slate-900 ring-1 ring-slate-300"
        >
          <MapPin className="size-5" aria-hidden />
          Ver en el mapa
        </button>
      </div>
    </article>
  )
}

function Foto({ url, etiqueta }: { url: string; etiqueta: string }) {
  return (
    <FotoMascota url={url} alt={etiqueta} className="aspect-[3/4] rounded-2xl" ampliable>
      <span
        aria-hidden
        className="absolute bottom-2 left-2 rounded-full bg-slate-900/80 px-2.5 py-0.5 text-sm font-bold text-white"
      >
        {etiqueta}
      </span>
    </FotoMascota>
  )
}
