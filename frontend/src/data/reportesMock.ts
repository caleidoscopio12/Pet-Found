import type { Reporte } from '@/types/reporte'

/**
 * 3 reportes de prueba (Fase 1), en el MISMO formato que devolverá la API:
 * `ubicacion.coordinates` va en [longitud, latitud], como en MongoDB.
 * El mapa los convierte con `toLeaflet()` antes de dibujarlos.
 * Los teléfonos son ficticios.
 */

const haceHoras = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString()

/** Fotos estáticas de Unsplash (800px, compresión automática). */
const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?w=800&q=80&auto=format&fit=crop`

export const reportesMock: Reporte[] = [
  {
    _id: 'mock-001',
    tipo: 'PERDIDO',
    especie: 'PERRO',
    estado: 'ACTIVO',
    nombre_mascota: 'Rocky',
    descripcion:
      'Beagle de 3 años, muy cariñoso. Llevaba collar negro. Se arrancó asustado por unos fuegos artificiales cerca de la plaza.',
    recompensa: 50000,
    contacto_whatsapp: '+56911111111',
    foto_url: unsplash('photo-1543466835-00a7907e9de1'),
    ubicacion: { type: 'Point', coordinates: [-72.416, -35.333] },
    radio_metros: 1000,
    createdAt: haceHoras(2),
  },
  {
    _id: 'mock-002',
    tipo: 'PERDIDO',
    especie: 'GATO',
    estado: 'ACTIVO',
    nombre_mascota: 'Michi',
    descripcion:
      'Gato blanco con negro, ojos verdes. Es tímido, si lo ven no lo persigan: avísenme y voy al tiro.',
    recompensa: 0,
    contacto_whatsapp: '+56922222222',
    foto_url: unsplash('photo-1514888286974-6c03e2ca1dba'),
    ubicacion: { type: 'Point', coordinates: [-72.405, -35.34] },
    radio_metros: 500,
    createdAt: haceHoras(20),
  },
  {
    _id: 'mock-003',
    tipo: 'AVISTADO',
    especie: 'PERRO',
    estado: 'ACTIVO',
    descripcion:
      'Perrito de pelo largo café con blanco, se ve desorientado. Está dando vueltas cerca de la costanera.',
    recompensa: 0,
    contacto_whatsapp: '+56933333333',
    foto_url: unsplash('photo-1587300003388-59208cc962cb'),
    ubicacion: { type: 'Point', coordinates: [-72.425, -35.327] },
    radio_metros: 0,
    createdAt: haceHoras(0.5),
  },
]
