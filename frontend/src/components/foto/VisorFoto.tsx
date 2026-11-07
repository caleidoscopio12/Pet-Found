import { useEffect, useRef } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { X } from 'lucide-react'

interface Props {
  url: string
  alt: string
  abierto: boolean
  onCerrar: () => void
}

/**
 * Foto a pantalla completa sobre fondo negro. Se cierra con la X, tocando la foto,
 * con Escape o con el botón "atrás" del celular (sin salir de la app).
 * El zoom con dos dedos lo da el propio navegador.
 */
export function VisorFoto({ url, alt, abierto, onCerrar }: Props) {
  useBotonAtras(abierto, onCerrar)

  return (
    <Dialog.Root open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <Dialog.Portal>
        {/* El fondo negro va en el Popup: Base UI no dibuja el Backdrop de un diálogo
            anidado (el visor se abre dentro de un Drawer). Tocar el fondo también cierra. */}
        <Dialog.Popup
          onClick={(e) => e.target === e.currentTarget && onCerrar()}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black outline-none transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
        >
          <Dialog.Title className="sr-only">{alt}</Dialog.Title>
          <img
            src={url}
            alt={alt}
            onClick={onCerrar}
            className="max-h-dvh max-w-full object-contain"
            decoding="async"
          />
          <Dialog.Close
            aria-label="Cerrar foto"
            className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 flex size-12 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur active:scale-95"
          >
            <X className="size-7" strokeWidth={2.5} />
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/**
 * En Android, "atrás" con la foto abierta debe cerrarla, no salir de la app.
 * Se agrega una entrada al historial al abrir y se consume al cerrar.
 */
function useBotonAtras(abierto: boolean, onCerrar: () => void) {
  // Ref para no re-ejecutar el efecto (y tocar el historial) en cada render del padre.
  const cerrarRef = useRef(onCerrar)
  useEffect(() => {
    cerrarRef.current = onCerrar
  }, [onCerrar])

  useEffect(() => {
    if (!abierto) return
    history.pushState({ visorFoto: true }, '')
    // Solo cerrar si salimos de la entrada del visor (en dev, StrictMode monta dos veces).
    const alVolver = () => {
      if (!history.state?.visorFoto) cerrarRef.current()
    }
    window.addEventListener('popstate', alVolver)
    return () => {
      window.removeEventListener('popstate', alVolver)
      if (history.state?.visorFoto) history.back()
    }
  }, [abierto])
}
