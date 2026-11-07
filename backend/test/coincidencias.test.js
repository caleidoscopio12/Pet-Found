import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, test } from 'node:test'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { LlaveBorrado } from '../src/models/LlaveBorrado.js'
import { Reporte } from '../src/models/Reporte.js'
import { hace60Dias } from '../src/routes/reportes.js'
import { normalizarL2, similitudCoseno } from '../src/services/embeddings.js'

// ---- Vectores controlados (512 dims, normalizados) ----
const DIM = 512
/** Vector con componentes en los ejes indicados: vec({0: 0.95, 1: 0.31}) */
function vec(componentes) {
  const v = new Array(DIM).fill(0)
  for (const [i, x] of Object.entries(componentes)) v[Number(i)] = x
  return normalizarL2(v)
}
const V = {
  rocky: vec({ 0: 1 }),
  rockyOtraFoto: vec({ 0: 0.95, 1: Math.sqrt(1 - 0.95 ** 2) }), // coseno 0,95 con rocky
  parecido90: vec({ 0: 0.9, 2: Math.sqrt(1 - 0.81) }), //          coseno 0,90
  parecido87: vec({ 0: 0.87, 3: Math.sqrt(1 - 0.87 ** 2) }), //    coseno 0,87
  parecido80: vec({ 0: 0.8, 4: 0.6 }), //                          coseno 0,80 (bajo umbral)
  otro: vec({ 5: 1 }), //                                          coseno 0
}

// El embedder falso lee una etiqueta escrita en los bytes de la "foto".
const fotoCon = (etiqueta) =>
  Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from(etiqueta.padEnd(16, ' ')), Buffer.alloc(200)])
const embedderFalso = async (buf) => {
  const etiqueta = buf.toString('ascii', 4, 20).trim()
  if (etiqueta === 'ROMPER') throw new Error('modelo caído')
  const v = V[etiqueta]
  if (!v) throw new Error(`etiqueta desconocida: ${etiqueta}`)
  return v
}

const fotosFalsas = {
  subirFoto: async () => ({ url: `https://res.cloudinary.com/demo/image/upload/v1/pet-found/reportes/x${Math.random()}.webp`, publicId: 'x' }),
  borrarFoto: async () => {},
}

// Constitución. ~0,009° de latitud ≈ 1 km.
const C = { lat: -35.333, lng: -72.416 }
const KM = 0.009

let mongod
let app

before(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri(), { autoIndex: false })
  await Reporte.createIndexes()
  await LlaveBorrado.createIndexes()
  app = createApp({ ...fotosFalsas, calcularEmbedding: embedderFalso, umbralCoincidencia: 0.85, limitePublicaciones: 1000 })
})
after(async () => {
  await mongoose.disconnect()
  await mongod?.stop()
})
beforeEach(async () => {
  await Reporte.deleteMany({})
  await LlaveBorrado.deleteMany({})
})

/** Inserta un reporte existente directo en la BD, con su embedding. */
function existente({ tipo = 'PERDIDO', especie = 'PERRO', lat = C.lat, lng = C.lng, emb, radio = 1000, ...resto }) {
  return Reporte.create({
    tipo,
    especie,
    nombre_mascota: tipo === 'PERDIDO' ? (resto.nombre_mascota ?? 'Rocky') : undefined,
    contacto_whatsapp: tipo === 'PERDIDO' ? '+56911111111' : undefined,
    radio_metros: tipo === 'PERDIDO' ? radio : 0,
    foto_url: 'https://res.cloudinary.com/demo/x.webp',
    ubicacion: { type: 'Point', coordinates: [lng, lat] },
    embedding: emb,
    ...resto,
  })
}

/** Publica por la API (como el celular). */
function publicar({ tipo = 'AVISTADO', especie = 'PERRO', lat = C.lat, lng = C.lng, foto, radio }) {
  const req = request(app).post('/api/reportes')
  req.field('tipo', tipo).field('especie', especie).field('lat', String(lat)).field('lng', String(lng))
  if (tipo === 'PERDIDO') {
    req.field('nombre_mascota', 'Nuevo').field('contacto_whatsapp', '+56922222222')
    if (radio) req.field('radio_metros', String(radio))
  }
  return req.attach('foto', fotoCon(foto), { filename: 'f.jpg', contentType: 'image/jpeg' })
}

describe('Utilidades de embeddings', () => {
  test('normalizarL2 deja norma 1 y el coseno de vectores iguales es 1', () => {
    const v = normalizarL2([3, 4])
    assert.deepEqual(v, [0.6, 0.8])
    assert.equal(similitudCoseno(v, v), 1)
    assert.ok(Math.abs(similitudCoseno(V.rocky, V.rockyOtraFoto) - 0.95) < 0.001)
  })
})

describe('AVISTADO nuevo → PERDIDOS cuyo radio lo cubre', () => {
  test('dentro del radio y parecido → posible coincidencia con similitud y distancia', async () => {
    const rocky = await existente({ emb: V.rocky, radio: 1000 })
    const res = await publicar({ foto: 'rockyOtraFoto', lat: C.lat - 0.5 * KM })
    assert.equal(res.status, 201, JSON.stringify(res.body))
    assert.equal(res.body.coincidencias.length, 1)
    const [c] = res.body.coincidencias
    assert.equal(c.reporte._id, rocky._id.toString())
    assert.equal(c.reporte.nombre_mascota, 'Rocky')
    assert.ok(Math.abs(c.similitud - 0.95) < 0.002)
    assert.ok(c.distanciaMetros > 450 && c.distanciaMetros < 650, `distancia ${c.distanciaMetros}`)
    assert.equal(c.reporte.embedding, undefined, 'embedding nunca sale en la API')
  })

  test('fuera del radio PROPIO del perdido (aunque a menos de 5 km) → no coincide', async () => {
    await existente({ emb: V.rocky, radio: 1000 })
    const res = await publicar({ foto: 'rockyOtraFoto', lat: C.lat - 1.5 * KM }) // ~1,7 km
    assert.equal(res.status, 201)
    assert.deepEqual(res.body.coincidencias, [])
  })

  test('el mismo punto SÍ coincide si el perdido tiene un radio mayor', async () => {
    await existente({ emb: V.rocky, radio: 2000 })
    const res = await publicar({ foto: 'rockyOtraFoto', lat: C.lat - 1.5 * KM })
    assert.equal(res.body.coincidencias.length, 1)
  })

  test('distinta especie → no coincide aunque la foto sea parecida', async () => {
    await existente({ emb: V.rocky, especie: 'GATO' })
    const res = await publicar({ foto: 'rockyOtraFoto', especie: 'PERRO' })
    assert.deepEqual(res.body.coincidencias, [])
  })

  test('similitud bajo el umbral (0,80 < 0,85) → no coincide', async () => {
    await existente({ emb: V.rocky })
    const res = await publicar({ foto: 'parecido80' })
    assert.deepEqual(res.body.coincidencias, [])
  })

  test('perdidos ENCONTRADOS o de más de 60 días no cuentan', async () => {
    await existente({ emb: V.rocky, estado: 'ENCONTRADO' })
    await existente({ emb: V.rocky, createdAt: new Date(hace60Dias().getTime() - 86_400_000) })
    const res = await publicar({ foto: 'rockyOtraFoto' })
    assert.deepEqual(res.body.coincidencias, [])
  })

  test('otros AVISTADOS no cuentan (solo se buscan PERDIDOS)', async () => {
    await existente({ tipo: 'AVISTADO', emb: V.rocky })
    const res = await publicar({ foto: 'rockyOtraFoto' })
    assert.deepEqual(res.body.coincidencias, [])
  })

  test('máximo 3 coincidencias, de mayor a menor similitud', async () => {
    await existente({ emb: V.parecido87, nombre_mascota: 'B' })
    await existente({ emb: V.rocky, nombre_mascota: 'A' })
    await existente({ emb: V.parecido90, nombre_mascota: 'C' })
    await existente({ emb: V.rockyOtraFoto, nombre_mascota: 'D' })
    await existente({ emb: V.otro, nombre_mascota: 'E' })
    const res = await publicar({ foto: 'rocky' })
    assert.deepEqual(
      res.body.coincidencias.map((c) => c.reporte.nombre_mascota),
      ['A', 'D', 'C'],
    )
  })
})

describe('PERDIDO nuevo → AVISTADOS dentro de su radio (dirección inversa)', () => {
  test('encuentra avistamientos parecidos dentro de su radio, no los de fuera', async () => {
    const cerca = await existente({ tipo: 'AVISTADO', emb: V.rockyOtraFoto, lat: C.lat + 0.8 * KM, descripcion: 'cerca' })
    await existente({ tipo: 'AVISTADO', emb: V.rockyOtraFoto, lat: C.lat + 2 * KM, descripcion: 'lejos' })
    await existente({ tipo: 'PERDIDO', emb: V.rocky, nombre_mascota: 'Otro perdido' }) // no se compara con perdidos
    const res = await publicar({ tipo: 'PERDIDO', foto: 'rocky', radio: 1000 })
    assert.equal(res.status, 201, JSON.stringify(res.body))
    assert.deepEqual(res.body.coincidencias.map((c) => c.reporte._id), [cerca._id.toString()])
  })
})

describe('Tolerancia a fallos y almacenamiento', () => {
  test('si el modelo falla, se publica igual: 201, sin embedding y sin coincidencias', async () => {
    await existente({ emb: V.rocky })
    const res = await publicar({ foto: 'ROMPER' })
    assert.equal(res.status, 201)
    assert.deepEqual(res.body.coincidencias, [])
    const enBD = await Reporte.findById(res.body.reporte._id).select('+embedding').lean()
    assert.equal(enBD.embedding, undefined)
  })

  test('el embedding se guarda en la BD (512 dims) pero nunca sale en GET', async () => {
    const res = await publicar({ foto: 'rocky' })
    const enBD = await Reporte.findById(res.body.reporte._id).select('+embedding').lean()
    assert.equal(enBD.embedding.length, 512)
    assert.equal(res.body.reporte.embedding, undefined)
    const get = await request(app).get('/api/reportes/cercanos').query(C)
    assert.ok(get.body.reportes.every((r) => r.embedding === undefined))
  })

  test('sin IA configurada (calcularEmbedding null) → coincidencias vacías', async () => {
    const appSinIa = createApp({ ...fotosFalsas, limitePublicaciones: 1000 })
    await existente({ emb: V.rocky })
    const res = await request(appSinIa)
      .post('/api/reportes')
      .field('tipo', 'AVISTADO').field('especie', 'PERRO').field('lat', String(C.lat)).field('lng', String(C.lng))
      .attach('foto', fotoCon('rocky'), { filename: 'f.jpg', contentType: 'image/jpeg' })
    assert.equal(res.status, 201)
    assert.deepEqual(res.body.coincidencias, [])
  })

  test('el modelo rechaza embeddings de largo incorrecto', async () => {
    await assert.rejects(existente({ emb: [0.1, 0.2, 0.3] }), /512 dimensiones/)
  })
})
