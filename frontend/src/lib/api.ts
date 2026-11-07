import { API_URL } from '@/lib/config'
import type { Coincidencia, Reporte } from '@/types/reporte'

/** Error de la API con mensaje en español y, si aplica, errores por campo del formulario. */
export class ErrorApi extends Error {
  status: number
  campos?: Record<string, string>
  constructor(status: number, message: string, campos?: Record<string, string>) {
    super(message)
    this.name = 'ErrorApi'
    this.status = status
    this.campos = campos
  }
}

const SIN_CONEXION = 'Sin conexión. Revisa tu señal e intenta de nuevo.'
const LENTO = 'La conexión está muy lenta. Intenta de nuevo en un momento.'

/** fetch con timeout + señal externa (para cancelar pedidos viejos al mover el mapa). */
async function pedir<T>(ruta: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs = 15_000, signal: externa, ...resto } = init
  const ctrl = new AbortController()
  let porTimeout = false
  const t = window.setTimeout(() => {
    porTimeout = true
    ctrl.abort()
  }, timeoutMs)
  const alAbortar = () => ctrl.abort()
  externa?.addEventListener('abort', alAbortar)

  let res: Response
  try {
    res = await fetch(`${API_URL}${ruta}`, { ...resto, signal: ctrl.signal })
  } catch (e) {
    if (externa?.aborted) throw e // cancelado a propósito: el llamador lo ignora
    throw new ErrorApi(0, porTimeout ? LENTO : SIN_CONEXION)
  } finally {
    window.clearTimeout(t)
    externa?.removeEventListener('abort', alAbortar)
  }

  const cuerpo = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ErrorApi(
      res.status,
      cuerpo?.error ?? 'Algo salió mal. Intenta de nuevo en un rato.',
      cuerpo?.campos,
    )
  }
  return cuerpo as T
}

/** GET /api/reportes/cercanos — reportes ACTIVOS de los últimos 60 días, más cercanos primero. */
export async function getCercanos(
  { lat, lng, maxKm }: { lat: number; lng: number; maxKm: number },
  signal?: AbortSignal,
): Promise<Reporte[]> {
  const q = new URLSearchParams({
    lat: lat.toFixed(6),
    lng: lng.toFixed(6),
    maxKm: maxKm.toFixed(2),
  })
  const { reportes } = await pedir<{ reportes: Reporte[] }>(`/reportes/cercanos?${q}`, { signal })
  return reportes
}

export interface RespuestaCrear {
  reporte: Reporte
  /** Se entrega una sola vez: hay que guardarla para poder borrar después. */
  llaveBorrado: string
  /** Posibles coincidencias visuales cercanas (vacío si no hay o si la IA no está activa). */
  coincidencias: Coincidencia[]
}

/** POST /api/reportes (multipart con la foto ya comprimida). */
export async function crearReporte(datos: FormData): Promise<RespuestaCrear> {
  return pedir<RespuestaCrear>('/reportes', {
    method: 'POST',
    body: datos,
    timeoutMs: 60_000, // la subida en 3G puede tardar
  })
}

/** DELETE /api/reportes/:id — solo con la llave que entregó el POST. */
export async function borrarReporte(id: string, llave: string): Promise<void> {
  await pedir<{ ok: true }>(`/reportes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'X-Llave-Borrado': llave },
  })
}

export function esCancelacion(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError'
}
