import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/** Llave aleatoria de 256 bits (43 caracteres base64url). */
export function generarLlave() {
  return randomBytes(32).toString('base64url')
}

export function huella(llave) {
  return createHash('sha256').update(String(llave)).digest('hex')
}

/** Compara la llave recibida con la huella guardada, en tiempo constante. */
export function llaveCoincide(llave, hashGuardado) {
  if (typeof llave !== 'string' || llave.length === 0 || llave.length > 200) return false
  const a = Buffer.from(huella(llave), 'hex')
  const b = Buffer.from(hashGuardado, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}
