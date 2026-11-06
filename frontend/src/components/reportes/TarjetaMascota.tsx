import { Clock, Gift, MapPin, MessageCircle, MessageCircleOff } from 'lucide-react'
import { formatoCLP, formatoRadio, haceCuanto, linkWhatsApp } from '@/lib/formato'
import { cn } from '@/lib/utils'
import type { Reporte } from '@/types/reporte'

const ESPECIE = { PERRO: 'Perro', GATO: 'Gato' } as const

/**
 * Tarjeta de detalle. Sigue el patrón de "Product Card" (deltacomponents, 21st id 28199):
 * foto arriba con badge superpuesto, título y pie con datos y acción principal.
 */
export function TarjetaMascota({ reporte }: { reporte: Reporte }) {
  const esPerdido = reporte.tipo === 'PERDIDO'
  const especie = ESPECIE[reporte.especie]
  const titulo = reporte.nombre_mascota ?? `${especie} avistado`

  const mensaje = esPerdido
    ? `Hola, vi tu aviso de ${titulo} en el mapa de mascotas perdidas. Te escribo por si te puedo ayudar.`
    : `Hola, vi en el mapa que avistaste un ${especie.toLowerCase()}. Creo que podría ser mi mascota, ¿me puedes contar más?`

  return (
    <article className="flex flex-col gap-4">
      <div className="relative -mx-5 -mt-4 aspect-video overflow-hidden bg-slate-200">
        <img
          src={reporte.foto_url}
          alt={`Foto de ${titulo}`}
          className="size-full object-cover"
          decoding="async"
          fetchPriority="high"
        />
        <span
          className={cn(
            'absolute top-3 left-3 rounded-full px-3 py-1 text-sm font-extrabold tracking-wide text-white shadow-md',
            esPerdido ? 'bg-red-600' : 'bg-emerald-600',
          )}
        >
          {esPerdido ? 'PERDIDO' : 'AVISTADO'}
        </span>
      </div>

      <header>
        <h2 className="text-2xl leading-tight font-extrabold text-slate-900">{titulo}</h2>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] font-medium text-slate-700">
          <span>{especie}</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-4" aria-hidden />
            {haceCuanto(reporte.createdAt)}
          </span>
          {esPerdido && reporte.radio_metros > 0 && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-4" aria-hidden />
              Buscando en {formatoRadio(reporte.radio_metros)}
            </span>
          )}
        </p>
      </header>

      {reporte.descripcion && (
        <p className="text-base leading-relaxed text-slate-900">{reporte.descripcion}</p>
      )}

      {reporte.recompensa > 0 && (
        <p className="flex items-center gap-2 rounded-xl bg-amber-100 px-4 py-3 text-base font-bold text-amber-950 ring-1 ring-amber-300">
          <Gift className="size-5 shrink-0" aria-hidden />
          Recompensa: {formatoCLP(reporte.recompensa)}
        </p>
      )}

      {reporte.contacto_whatsapp ? (
        <a
          href={linkWhatsApp(reporte.contacto_whatsapp, mensaje)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#1f9e4f] text-lg font-bold text-white shadow-lg active:scale-[0.98]"
        >
          <MessageCircle className="size-6" aria-hidden />
          Escribir por WhatsApp
        </a>
      ) : (
        <p className="flex items-start gap-3 rounded-2xl bg-slate-100 px-4 py-3 text-[15px] leading-snug text-slate-800">
          <MessageCircleOff className="mt-0.5 size-5 shrink-0 text-slate-600" aria-hidden />
          Este vecino no dejó teléfono. Pronto podrás escribirle por chat desde la app.
        </p>
      )}
    </article>
  )
}
