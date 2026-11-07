import { RADIO_MAX, Reporte } from '../models/Reporte.js'
import { similitudCoseno } from './embeddings.js'

export const UMBRAL_POR_DEFECTO = 0.85
export const MAX_COINCIDENCIAS = 3
const MAX_CANDIDATOS = 200
const DIAS_VISIBLE = 60

const hace60Dias = () => new Date(Date.now() - DIAS_VISIBLE * 24 * 60 * 60 * 1000)

/**
 * Candidatos geográficos para un reporte recién creado:
 *  - AVISTADO → PERDIDOS cuyo PROPIO radio cubre el punto del avistamiento.
 *  - PERDIDO  → AVISTADOS dentro del radio del perdido.
 * Siempre misma especie, ACTIVOS, de los últimos 60 días y con embedding.
 *
 * $geoNear (usa el índice 2dsphere) va primero; por eso no se usa $vectorSearch
 * aquí: debe ser la primera etapa y no acepta filtros geoespaciales.
 */
function candidatosGeo(reporte) {
  const esAvistado = reporte.tipo === 'AVISTADO'
  const pipeline = [
    {
      $geoNear: {
        near: reporte.ubicacion, // GeoJSON [lng, lat]
        distanceField: 'distanciaMetros',
        spherical: true,
        maxDistance: esAvistado ? RADIO_MAX : reporte.radio_metros,
        query: {
          _id: { $ne: reporte._id },
          tipo: esAvistado ? 'PERDIDO' : 'AVISTADO',
          estado: 'ACTIVO',
          especie: reporte.especie,
          createdAt: { $gte: hace60Dias() },
          embedding: { $exists: true, $ne: [] },
        },
      },
    },
  ]
  if (esAvistado) {
    // Cada perdido tiene su radio: el avistamiento debe caer DENTRO de ese radio.
    pipeline.push({ $match: { $expr: { $lte: ['$distanciaMetros', '$radio_metros'] } } })
  }
  pipeline.push({ $limit: MAX_CANDIDATOS })
  return Reporte.aggregate(pipeline)
}

/**
 * Busca posibles coincidencias visuales para un reporte recién publicado.
 * @returns {Promise<Array<{ reporte: object, similitud: number, distanciaMetros: number }>>}
 */
export async function buscarCoincidencias(reporte, embedding, { umbral = UMBRAL_POR_DEFECTO } = {}) {
  if (!embedding?.length) return []

  const candidatos = await candidatosGeo(reporte)

  return candidatos
    .map(({ embedding: emb, distanciaMetros, ...resto }) => ({
      reporte: resto,
      similitud: Math.round(similitudCoseno(embedding, emb) * 1000) / 1000,
      distanciaMetros: Math.round(distanciaMetros),
    }))
    .filter((c) => c.similitud >= umbral)
    .sort((a, b) => b.similitud - a.similitud)
    .slice(0, MAX_COINCIDENCIAS)
}
