import path from 'node:path'
import { AutoProcessor, CLIPVisionModelWithProjection, RawImage, env } from '@huggingface/transformers'

export const MODELO_POR_DEFECTO = 'Xenova/clip-vit-base-patch32'
export const DIMENSIONES = 512

// El modelo (~90 MB) se descarga una vez y queda en backend/.cache/modelos (ignorado por git).
env.cacheDir = path.resolve(import.meta.dirname, '../../.cache/modelos')

/** Normaliza a largo 1: así la similitud coseno es simplemente el producto punto. */
export function normalizarL2(v) {
  let suma = 0
  for (const x of v) suma += x * x
  const norma = Math.sqrt(suma) || 1
  return v.map((x) => Math.round((x / norma) * 1e6) / 1e6)
}

/** Similitud coseno entre dos vectores ya normalizados (producto punto). */
export function similitudCoseno(a, b) {
  if (!a || !b || a.length !== b.length) return 0
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

/**
 * Carga CLIP (solo la torre de visión, cuantizada q8) y devuelve un servicio
 * `calcular(buffer) → number[512]` normalizado. Llamar al arrancar el servidor
 * (precarga): la primera vez descarga el modelo.
 */
export async function crearServicioEmbeddings({ modelo = MODELO_POR_DEFECTO, dtype = 'q8' } = {}) {
  const processor = await AutoProcessor.from_pretrained(modelo)
  const vision = await CLIPVisionModelWithProjection.from_pretrained(modelo, { dtype })

  async function vectorDe(imagen) {
    const { image_embeds } = await vision(await processor(imagen))
    const vector = normalizarL2(Array.from(image_embeds.data))
    if (vector.length !== DIMENSIONES) {
      throw new Error(`El modelo devolvió ${vector.length} dimensiones (se esperaban ${DIMENSIONES}).`)
    }
    return vector
  }

  /** Embedding de una foto (bytes JPG/PNG/WebP). */
  async function calcular(buffer) {
    // .rgb(): PNG/WebP con transparencia (4 canales) o en escala de grises → 3 canales,
    // que es lo único que acepta el procesador de CLIP.
    const imagen = (await RawImage.fromBlob(new Blob([buffer]))).rgb()
    return vectorDe(imagen)
  }

  /** Primera inferencia (la más lenta) con una imagen gris generada en memoria. */
  async function calentar() {
    const lado = 224
    await vectorDe(new RawImage(new Uint8ClampedArray(lado * lado * 3).fill(128), lado, lado, 3))
  }

  return { modelo, dimensiones: DIMENSIONES, calcular, calentar }
}
