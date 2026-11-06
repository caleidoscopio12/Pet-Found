import { useCallback, useRef, useState } from 'react'
import { ErrorApi, esCancelacion, getCercanos } from '@/lib/api'
import { distanciaMetros, type LatLng } from '@/lib/geo'
import type { Reporte } from '@/types/reporte'

/** Zona visible del mapa: centro y radio (km) hasta la esquina de la pantalla. */
export interface AreaMapa {
  centro: LatLng
  maxKm: number
}

/** Pedimos un poco más que lo visible para que mover el mapa un poco no dispare otra carga. */
const MARGEN = 1.5
const MAX_KM = 50
/** Debe coincidir con el límite del backend: si llegó lleno, puede faltar algo más lejos. */
const LIMITE_BACKEND = 300

export type EstadoCarga = 'inicial' | 'cargando' | 'listo' | 'error'

/**
 * Carga reportes reales desde GET /api/reportes/cercanos según la zona visible.
 * Solo vuelve a pedir si la zona nueva se sale de lo ya cargado.
 */
export function useReportesCercanos() {
  const [reportes, setReportes] = useState<Reporte[]>([])
  const [estado, setEstado] = useState<EstadoCarga>('inicial')
  const [error, setError] = useState<string | null>(null)

  const cargada = useRef<{ area: AreaMapa; completa: boolean } | null>(null)
  const ultimaPedida = useRef<AreaMapa | null>(null)
  const enCurso = useRef<AbortController | null>(null)

  const cargar = useCallback(async (area: AreaMapa, forzar = false) => {
    ultimaPedida.current = area
    const prev = cargada.current
    if (
      !forzar &&
      prev?.completa &&
      distanciaMetros(prev.area.centro, area.centro) / 1000 + area.maxKm <= prev.area.maxKm
    ) {
      return // la zona visible ya está cubierta
    }

    enCurso.current?.abort()
    const ctrl = new AbortController()
    enCurso.current = ctrl

    const maxKm = Math.min(MAX_KM, area.maxKm * MARGEN)
    setEstado('cargando')
    try {
      const datos = await getCercanos(
        { lat: area.centro[0], lng: area.centro[1], maxKm },
        ctrl.signal,
      )
      cargada.current = { area: { centro: area.centro, maxKm }, completa: datos.length < LIMITE_BACKEND }
      setReportes(datos)
      setEstado('listo')
      setError(null)
    } catch (e) {
      if (esCancelacion(e) || ctrl.signal.aborted) return
      setEstado('error')
      setError(e instanceof ErrorApi ? e.message : 'No pudimos cargar los reportes.')
    }
  }, [])

  const reintentar = useCallback(() => {
    if (ultimaPedida.current) void cargar(ultimaPedida.current, true)
  }, [cargar])

  /** Agrega un reporte recién publicado sin esperar otra carga. */
  const agregar = useCallback((nuevo: Reporte) => {
    setReportes((prev) => [nuevo, ...prev.filter((r) => r._id !== nuevo._id)])
  }, [])

  return { reportes, estado, error, cargar, reintentar, agregar }
}
