/**
 * FAB expandible.
 *
 * Fuente: 21st.dev — motiondotdev/motion-floating-action-button (id 24691).
 * Se conserva su lógica de animación (springs de motion/react, aparición
 * escalonada y "+" que rota 45°). El componente original importaba un CSS
 * (`motion-floating-action-button-utils/index.css`) que el registro no entrega,
 * así que los estilos se reescribieron con Tailwind y las acciones ahora llegan
 * por props, con etiquetas grandes siempre visibles (uso con el pulgar).
 */

import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonTransition = { type: 'spring' as const, stiffness: 500, damping: 30 }
const itemTransition = { type: 'spring' as const, stiffness: 400, damping: 22 }

export interface FabAccion {
  label: string
  icon: ReactNode
  onClick: () => void
  /** Clases de color del botón (ej. "bg-red-600 text-white"). */
  className?: string
}

interface Props {
  acciones: FabAccion[]
  staggerInterval?: number
  className?: string
  labelAbrir?: string
  labelCerrar?: string
}

export function FabExpandible({
  acciones,
  staggerInterval = 0.05,
  className,
  labelAbrir = 'Abrir menú',
  labelCerrar = 'Cerrar menú',
}: Props) {
  const [open, setOpen] = useState(false)

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      {/* Velo: tocar fuera cierra el menú */}
      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            aria-label={labelCerrar}
            className="fixed inset-0 z-20 cursor-default bg-slate-950/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className={cn('fixed z-30 flex flex-col items-end gap-3', className)}>
        <AnimatePresence>
          {open &&
            acciones.map((accion, index) => {
              // la acción más cercana al FAB aparece primero
              const orden = acciones.length - 1 - index
              return (
                <motion.button
                  key={accion.label}
                  type="button"
                  initial={{ opacity: 0, y: 24, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 24, scale: 0.6 }}
                  transition={{ ...itemTransition, delay: orden * staggerInterval }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    setOpen(false)
                    accion.onClick()
                  }}
                  className={cn(
                    'flex h-14 origin-bottom-right items-center gap-3 rounded-full pl-5 pr-4',
                    'text-base font-bold shadow-xl ring-2 ring-white/80',
                    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white',
                    accion.className ?? 'bg-white text-slate-900',
                  )}
                >
                  <span>{accion.label}</span>
                  <span className="flex size-9 items-center justify-center rounded-full bg-white/20">
                    {accion.icon}
                  </span>
                </motion.button>
              )
            })}
        </AnimatePresence>

        <motion.button
          type="button"
          animate={{ rotate: open ? 45 : 0 }}
          transition={buttonTransition}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? labelCerrar : labelAbrir}
          aria-expanded={open}
          className={cn(
            'flex size-16 items-center justify-center rounded-full',
            'bg-slate-900 text-white shadow-2xl ring-4 ring-white',
            'focus-visible:outline-none focus-visible:ring-sky-400',
          )}
        >
          <Plus className="size-8" strokeWidth={2.5} />
        </motion.button>
      </div>
    </>
  )
}
