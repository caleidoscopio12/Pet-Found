import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CircleCheck } from 'lucide-react'

interface Props {
  mensaje: string | null
  onCerrar: () => void
  duracionMs?: number
}

/** Mensaje breve de confirmación arriba de la pantalla (se cierra solo). */
export function Aviso({ mensaje, onCerrar, duracionMs = 3000 }: Props) {
  useEffect(() => {
    if (!mensaje) return
    const t = window.setTimeout(onCerrar, duracionMs)
    return () => window.clearTimeout(t)
  }, [mensaje, onCerrar, duracionMs])

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[calc(4.75rem+env(safe-area-inset-top))] z-[150] flex justify-center px-3"
    >
      <AnimatePresence>
        {mensaje && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-[15px] font-semibold text-white shadow-lg"
          >
            <CircleCheck className="size-5 text-emerald-400" aria-hidden />
            {mensaje}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
