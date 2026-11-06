/**
 * Reglas de validación del formulario. Deben coincidir con el backend
 * (backend/src/models/Reporte.js y backend/src/validation/reporte.js).
 */
export const RADIO_MIN = 100
export const RADIO_MAX = 5000
export const RADIO_PASO = 100
export const RADIO_DEFAULT = 1000

export const MAX_NOMBRE = 40
export const MAX_DESCRIPCION = 300

/** Se guarda como +569XXXXXXXX; el usuario solo escribe los 8 dígitos finales. */
export const PREFIJO_WHATSAPP = '+569'
export const DIGITOS_WHATSAPP = 8
