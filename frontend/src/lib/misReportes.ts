/**
 * Llaves de borrado de los reportes publicados desde ESTE navegador.
 * Hasta la Fase 4 (login) es la única forma de probar que un reporte es tuyo:
 * si se borran los datos del navegador o se cambia de teléfono, la llave se pierde.
 */
const CLAVE = 'pet-found:llaves-borrado'

function leer(): Record<string, string> {
  try {
    const crudo = localStorage.getItem(CLAVE)
    const datos: unknown = crudo ? JSON.parse(crudo) : {}
    return datos && typeof datos === 'object' ? (datos as Record<string, string>) : {}
  } catch {
    return {}
  }
}

function escribir(datos: Record<string, string>) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(datos))
  } catch {
    // Navegación privada o almacenamiento lleno: no se podrá borrar luego desde aquí.
  }
}

export function guardarLlave(reporteId: string, llave: string) {
  escribir({ ...leer(), [reporteId]: llave })
}

export function obtenerLlave(reporteId: string): string | undefined {
  return leer()[reporteId]
}

export function olvidarLlave(reporteId: string) {
  const datos = leer()
  delete datos[reporteId]
  escribir(datos)
}
