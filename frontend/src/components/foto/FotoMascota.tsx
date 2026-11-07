import { useState, type ReactNode } from 'react'
import { Expand } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VisorFoto } from './VisorFoto'

interface Props {
  url: string
  alt: string
  /** Tamaño del marco (ej. `aspect-video`, `rounded-2xl`). La foto nunca se recorta. */
  className?: string
  /** Tocar la foto la abre a pantalla completa. */
  ampliable?: boolean
  /** Insignias superpuestas (PERDIDO, "Tu foto"…). */
  children?: ReactNode
  fetchPriority?: 'high' | 'low' | 'auto'
}

/**
 * Foto de mascota SIN recortar: la imagen completa (`object-contain`) sobre un fondo
 * difuminado de la misma foto, para que no queden franjas vacías. Las fotos de celular
 * suelen ser verticales y con `object-cover` en un marco ancho se perdía la mascota.
 */
export function FotoMascota({ url, alt, className, ampliable = false, children, fetchPriority }: Props) {
  const [visorAbierto, setVisorAbierto] = useState(false)

  const imagen = (
    <>
      <img
        src={url}
        alt=""
        aria-hidden
        className="absolute inset-0 size-full scale-110 object-cover opacity-70 blur-xl"
        decoding="async"
      />
      <img
        src={url}
        alt={alt}
        className="relative size-full object-contain"
        decoding="async"
        fetchPriority={fetchPriority}
      />
    </>
  )

  return (
    <div className={cn('relative overflow-hidden bg-slate-300', className)}>
      {ampliable ? (
        <>
          <button
            type="button"
            onClick={() => setVisorAbierto(true)}
            aria-label={`Ver foto en grande: ${alt}`}
            className="absolute inset-0 block size-full cursor-zoom-in"
          >
            {imagen}
          </button>
          <span
            aria-hidden
            className="pointer-events-none absolute right-3 bottom-3 flex size-10 items-center justify-center rounded-full bg-slate-900/70 text-white shadow-md"
          >
            <Expand className="size-5" />
          </span>
          <VisorFoto url={url} alt={alt} abierto={visorAbierto} onCerrar={() => setVisorAbierto(false)} />
        </>
      ) : (
        imagen
      )}
      {/* Las insignias no deben robar el toque a la foto. */}
      {children && <div className="pointer-events-none absolute inset-0">{children}</div>}
    </div>
  )
}
