import { useState } from 'react'
import { LoaderCircle, Trash2 } from 'lucide-react'
import { borrarReporte, ErrorApi } from '@/lib/api'
import { obtenerLlave, olvidarLlave } from '@/lib/misReportes'

interface Props {
  reporteId: string
  onBorrado: () => void
  /** Al pedir confirmación: la ficha compacta se expande para que la confirmación se vea. */
  onConfirmando?: () => void
}

type Paso = 'inicial' | 'confirmando' | 'borrando'

/**
 * Solo aparece en el teléfono que publicó el reporte (tiene su llave de borrado).
 * Pide confirmación porque no se puede deshacer.
 */
export function BorrarPublicacion({ reporteId, onBorrado, onConfirmando }: Props) {
  const [paso, setPaso] = useState<Paso>('inicial')
  const [error, setError] = useState<string | null>(null)
  const [llave, setLlave] = useState(() => obtenerLlave(reporteId))

  if (!llave) return null

  async function borrar() {
    if (!llave) return
    setPaso('borrando')
    setError(null)
    try {
      await borrarReporte(reporteId, llave)
      olvidarLlave(reporteId)
      onBorrado()
    } catch (e) {
      if (e instanceof ErrorApi && e.status === 404) {
        // Ya no existe: para el usuario el resultado es el mismo.
        olvidarLlave(reporteId)
        onBorrado()
        return
      }
      if (e instanceof ErrorApi && e.status === 403) {
        olvidarLlave(reporteId)
        setLlave(undefined)
        return
      }
      setPaso('confirmando')
      setError(e instanceof ErrorApi ? e.message : 'No pudimos borrar la publicación. Intenta de nuevo.')
    }
  }

  if (paso === 'inicial') {
    return (
      <button
        type="button"
        onClick={() => {
          setPaso('confirmando')
          onConfirmando?.()
        }}
        className="flex h-12 items-center justify-center gap-2 rounded-2xl text-base font-bold text-red-700 ring-1 ring-red-200 active:bg-red-50"
      >
        <Trash2 className="size-5" aria-hidden />
        Borrar mi publicación
      </button>
    )
  }

  return (
    <div role="alertdialog" aria-labelledby="confirmar-borrado" className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-200">
      <p id="confirmar-borrado" className="text-base font-bold text-red-900">
        ¿Borrar esta publicación?
      </p>
      <p className="mt-1 text-[15px] text-red-900/90">Se quitará del mapa junto con su foto. No se puede deshacer.</p>
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setPaso('inicial')
            setError(null)
          }}
          disabled={paso === 'borrando'}
          className="h-12 flex-1 rounded-2xl bg-white text-base font-bold text-slate-900 ring-1 ring-slate-300"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={borrar}
          disabled={paso === 'borrando'}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 text-base font-bold text-white disabled:opacity-80"
        >
          {paso === 'borrando' ? (
            <LoaderCircle className="size-5 animate-spin" aria-hidden />
          ) : (
            <Trash2 className="size-5" aria-hidden />
          )}
          {paso === 'borrando' ? 'Borrando…' : 'Sí, borrar'}
        </button>
      </div>
    </div>
  )
}
