import { useRef, useState } from 'react'
import { Camera, CircleCheck, ImagePlus, LoaderCircle, RefreshCw } from 'lucide-react'
import { FotoMascota } from '@/components/foto/FotoMascota'
import { comprimirFoto, formatoPeso } from '@/lib/comprimirFoto'
import { cn } from '@/lib/utils'

export interface FotoLista {
  archivo: File
  /** Peso antes de comprimir (para mostrar el ahorro). */
  pesoOriginal: number
  /** Object URL para la vista previa. */
  url: string
}

interface Props {
  foto: FotoLista | null
  onFoto: (foto: FotoLista | null) => void
  onComprimiendo: (comprimiendo: boolean) => void
  error?: string
}

/**
 * Foto obligatoria: "Tomar foto" (abre la cámara trasera) o "Galería".
 * Se comprime apenas se elige, así al publicar solo queda subirla.
 */
export function CampoFoto({ foto, onFoto, onComprimiendo, error }: Props) {
  const camaraRef = useRef<HTMLInputElement>(null)
  const galeriaRef = useRef<HTMLInputElement>(null)
  const [comprimiendo, setComprimiendo] = useState(false)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const vistaPrevia = foto?.url ?? null

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const original = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir la misma foto
    if (!original) return
    setErrorLocal(null)
    setComprimiendo(true)
    onComprimiendo(true)
    try {
      const archivo = await comprimirFoto(original)
      if (foto) URL.revokeObjectURL(foto.url) // liberar la vista previa anterior
      onFoto({ archivo, pesoOriginal: original.size, url: URL.createObjectURL(archivo) })
    } catch (err) {
      setErrorLocal(err instanceof Error ? err.message : 'No pudimos procesar la foto. Prueba con otra.')
    } finally {
      setComprimiendo(false)
      onComprimiendo(false)
    }
  }

  const mensajeError = errorLocal ?? error

  return (
    <div>
      <p id="foto-label" className="mb-2 text-base font-bold text-slate-900">
        Foto <span className="text-red-600">*</span>
      </p>

      <input ref={camaraRef} type="file" accept="image/*" capture="environment" hidden onChange={elegir} />
      <input ref={galeriaRef} type="file" accept="image/*" hidden onChange={elegir} />

      {foto || comprimiendo ? (
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-200">
          {/* Completa, sin recortar: así ves exactamente lo que verán los vecinos. */}
          {vistaPrevia && <FotoMascota url={vistaPrevia} alt="Foto elegida" className="size-full" />}
          {comprimiendo ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/55 text-white">
              <LoaderCircle className="size-8 animate-spin" aria-hidden />
              <span className="text-base font-semibold">Optimizando foto…</span>
            </div>
          ) : (
            foto && (
              <>
                <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-sm font-bold text-emerald-800 shadow">
                  <CircleCheck className="size-4" aria-hidden />
                  Lista · {formatoPeso(foto.archivo.size)}
                </span>
                <button
                  type="button"
                  onClick={() => galeriaRef.current?.click()}
                  className="absolute right-3 bottom-3 inline-flex h-11 items-center gap-2 rounded-full bg-white/95 px-4 text-sm font-bold text-slate-900 shadow"
                >
                  <RefreshCw className="size-4" aria-hidden />
                  Cambiar foto
                </button>
              </>
            )
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="foto-label">
          <button
            id="campo-foto"
            type="button"
            onClick={() => camaraRef.current?.click()}
            className={cn(
              'flex h-24 flex-col items-center justify-center gap-1.5 rounded-2xl bg-slate-900 text-base font-bold text-white',
              mensajeError && 'ring-4 ring-red-300',
            )}
          >
            <Camera className="size-7" aria-hidden />
            Tomar foto
          </button>
          <button
            type="button"
            onClick={() => galeriaRef.current?.click()}
            className="flex h-24 flex-col items-center justify-center gap-1.5 rounded-2xl bg-slate-100 text-base font-bold text-slate-900 ring-1 ring-slate-300"
          >
            <ImagePlus className="size-7" aria-hidden />
            Galería
          </button>
        </div>
      )}

      {mensajeError && (
        <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
          {mensajeError}
        </p>
      )}
    </div>
  )
}
