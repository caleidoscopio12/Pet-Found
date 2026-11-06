const rtf = new Intl.RelativeTimeFormat('es-CL', { numeric: 'auto' })
const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })

/** "hace 2 horas", "hace 30 minutos", "ayer"… */
export function haceCuanto(iso: string, ahora = Date.now()): string {
  const seg = Math.round((new Date(iso).getTime() - ahora) / 1000)
  const abs = Math.abs(seg)
  if (abs < 60) return 'recién'
  if (abs < 3600) return rtf.format(Math.round(seg / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(seg / 3600), 'hour')
  return rtf.format(Math.round(seg / 86400), 'day')
}

/** 50000 → "$50.000" */
export const formatoCLP = (monto: number) => clp.format(monto)

/** 1000 → "1 km", 500 → "500 m", 1500 → "1,5 km" */
export function formatoRadio(metros: number): string {
  if (metros < 1000) return `${metros} m`
  const km = metros / 1000
  return `${km.toLocaleString('es-CL', { maximumFractionDigits: 1 })} km`
}

/** Minúsculas y sin tildes, para buscar "Michí" escribiendo "michi". */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

/** Link directo a WhatsApp con mensaje prellenado. "+56911111111" → wa.me/56911111111 */
export function linkWhatsApp(numero: string, mensaje: string): string {
  return `https://wa.me/${numero.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`
}
