import dns from 'node:dns'
import mongoose from 'mongoose'
import { LlaveBorrado } from '../models/LlaveBorrado.js'
import { Reporte } from '../models/Reporte.js'

/**
 * Conecta a MongoDB y asegura los índices (incluido `ubicacion_2dsphere`).
 * `autoIndex: false` + createIndexes() explícito: los índices se crean una vez,
 * al arrancar, y si fallan lo sabemos de inmediato.
 */
/** Base por defecto si la URI no trae una (si no, MongoDB usaría "test"). */
export const BD_POR_DEFECTO = 'mascotas'

/** ¿La URI indica una base? ej: ...mongodb.net/mascotas?retryWrites=true */
export function uriTraeBase(uri) {
  const sinEsquema = uri.replace(/^mongodb(\+srv)?:\/\//, '')
  const ruta = sinEsquema.split('?')[0].split('/')[1]
  return Boolean(ruta)
}

/** Resolvers públicos de respaldo para la búsqueda SRV de `mongodb+srv://`. */
const DNS_RESPALDO = ['1.1.1.1', '8.8.8.8']

const esLoopback = (ip) => ip === '::1' || ip.startsWith('127.')

/**
 * En algunos Windows, Node queda apuntando a un DNS local (127.0.0.1) que no existe
 * y la búsqueda SRV de Atlas falla con `querySrv ECONNREFUSED`, aunque el sistema
 * resuelva bien. Solo en ese caso exacto reintentamos con resolvers públicos.
 */
function debeReintentarConDnsPublico(err, uri) {
  return (
    uri.startsWith('mongodb+srv://') &&
    err?.syscall === 'querySrv' &&
    ['ECONNREFUSED', 'ETIMEOUT', 'ESERVFAIL'].includes(err.code) &&
    dns.getServers().every(esLoopback)
  )
}

export async function conectarBD(uri) {
  mongoose.set('strictQuery', true)
  const opciones = {
    serverSelectionTimeoutMS: 10_000,
    autoIndex: false,
    ...(uriTraeBase(uri) ? {} : { dbName: BD_POR_DEFECTO }),
  }
  try {
    await mongoose.connect(uri, opciones)
  } catch (err) {
    if (!debeReintentarConDnsPublico(err, uri)) throw err
    console.warn(
      `[db] Node usa un DNS local (${dns.getServers().join(', ')}) que no responde; reintentando con ${DNS_RESPALDO.join(', ')}.`,
    )
    dns.setServers(DNS_RESPALDO)
    await mongoose.connect(uri, opciones)
  }
  await Reporte.createIndexes()
  await LlaveBorrado.createIndexes()
  return mongoose.connection
}

export function desconectarBD() {
  return mongoose.disconnect()
}
