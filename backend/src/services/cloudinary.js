import { v2 as cloudinary } from 'cloudinary'

export const CARPETA_FOTOS = 'pet-found/reportes'

const opcionesSubida = {
  folder: CARPETA_FOTOS,
  resource_type: 'image',
  allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
}

/**
 * Servicio de fotos sobre Cloudinary. Se inyecta en createApp() para que los
 * tests puedan usar una versión falsa sin tocar la cuenta real.
 */
export function crearServicioFotos({ cloudName, apiKey, apiSecret }) {
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true })

  return {
    /** Sube un buffer (foto ya comprimida en el celular). */
    subirFoto: (buffer) =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(opcionesSubida, (err, r) =>
          err ? reject(err) : resolve({ url: r.secure_url, publicId: r.public_id }),
        )
        stream.end(buffer)
      }),

    /** Sube una imagen desde una URL pública (usado por el seed). */
    subirDesdeUrl: async (url) => {
      const r = await cloudinary.uploader.upload(url, {
        ...opcionesSubida,
        transformation: [{ width: 800, crop: 'limit', quality: 'auto' }],
      })
      return { url: r.secure_url, publicId: r.public_id }
    },

    borrarFoto: (publicId) => cloudinary.uploader.destroy(publicId),
  }
}

/** Extrae el public_id desde una URL de Cloudinary (para limpiar fotos de prueba). */
export function publicIdDesdeUrl(url) {
  const m = /\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?(pet-found\/.+)\.[a-z0-9]+$/i.exec(url)
  return m ? m[1] : null
}
