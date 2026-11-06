import imageCompression from 'browser-image-compression'

/** Fotos de más de esto ni se intentan (probablemente no son fotos de celular). */
export const MAX_BYTES_ORIGINAL = 25 * 1024 * 1024

let soportaWebp: boolean | undefined

/** Algunos iOS no saben codificar WebP desde canvas: en ese caso usamos JPEG. */
function puedeCodificarWebp(): boolean {
  if (soportaWebp === undefined) {
    const c = document.createElement('canvas')
    c.width = c.height = 1
    soportaWebp = c.toDataURL('image/webp').startsWith('data:image/webp')
  }
  return soportaWebp
}

/**
 * Comprime en el celular antes de subir (CLAUDE.md §8): máx 800 px, calidad 0.8,
 * WebP (o JPEG si no se puede), ~≤ 500 KB. Corrige la orientación EXIF y elimina
 * los metadatos (incluida la ubicación GPS de la foto).
 */
export async function comprimirFoto(original: File): Promise<File> {
  if (!original.type.startsWith('image/')) {
    throw new Error('El archivo no es una imagen.')
  }
  if (original.size > MAX_BYTES_ORIGINAL) {
    throw new Error('La foto es demasiado grande (más de 25 MB).')
  }
  const tipo = puedeCodificarWebp() ? 'image/webp' : 'image/jpeg'
  const blob = await imageCompression(original, {
    maxWidthOrHeight: 800,
    initialQuality: 0.8,
    maxSizeMB: 0.5,
    fileType: tipo,
    useWebWorker: true,
  })
  return new File([blob], tipo === 'image/webp' ? 'foto.webp' : 'foto.jpg', { type: tipo })
}

export function formatoPeso(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toLocaleString('es-CL', { maximumFractionDigits: 1 })} MB`
}
