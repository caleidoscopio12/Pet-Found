import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, test } from 'node:test'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { Reporte } from '../src/models/Reporte.js'
import { hace60Dias } from '../src/routes/reportes.js'

// ---- Fakes de Cloudinary ----
const subidas = []
const borradas = []
const fotosFalsas = {
  subirFoto: async (buf) => {
    subidas.push(buf.length)
    return { url: `https://res.cloudinary.com/demo/image/upload/v1/pet-found/reportes/f${subidas.length}.webp`, publicId: `f${subidas.length}` }
  },
  borrarFoto: async (id) => borradas.push(id),
}

// Bytes mínimos con "firma" real de cada formato (el backend no decodifica la imagen).
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200)])
const NO_IMAGEN = Buffer.from('<?php echo "hola"; ?>'.padEnd(200, ' '))

// Constitución: Leaflet [lat, lng]
const CENTRO = { lat: -35.333, lng: -72.416 }

let mongod
let app

before(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri(), { autoIndex: false })
  await Reporte.createIndexes()
  app = createApp({ ...fotosFalsas, limitePublicaciones: 1000 })
})

after(async () => {
  await mongoose.disconnect()
  await mongod?.stop()
})

beforeEach(async () => {
  await Reporte.deleteMany({})
  subidas.length = 0
  borradas.length = 0
})

const perdidoValido = {
  tipo: 'PERDIDO',
  especie: 'PERRO',
  nombre_mascota: 'Rocky',
  descripcion: 'Beagle con collar negro',
  contacto_whatsapp: '+56911111111',
  recompensa: '50000',
  radio_metros: '1200',
  lat: String(CENTRO.lat),
  lng: String(CENTRO.lng),
}

function publicar(campos, foto = JPEG, mime = 'image/jpeg') {
  const req = request(app).post('/api/reportes')
  for (const [k, v] of Object.entries(campos)) req.field(k, v)
  if (foto) req.attach('foto', foto, { filename: 'foto.jpg', contentType: mime })
  return req
}

/** Inserta directo en la BD (para preparar escenarios de GET). */
function insertar({ lat, lng, ...resto }) {
  return Reporte.create({
    tipo: 'AVISTADO',
    especie: 'GATO',
    foto_url: 'https://res.cloudinary.com/demo/x.webp',
    ubicacion: { type: 'Point', coordinates: [lng, lat] },
    ...resto,
  })
}

describe('POST /api/reportes', () => {
  test('crea un PERDIDO y guarda las coordenadas como [lng, lat]', async () => {
    const res = await publicar(perdidoValido)
    assert.equal(res.status, 201, JSON.stringify(res.body))
    assert.deepEqual(res.body.reporte.ubicacion, { type: 'Point', coordinates: [CENTRO.lng, CENTRO.lat] })
    assert.equal(res.body.reporte.radio_metros, 1200)
    assert.equal(res.body.reporte.recompensa, 50000)
    assert.equal(res.body.reporte.estado, 'ACTIVO')
    assert.equal(res.body.reporte.embedding, undefined)

    const enBD = await Reporte.findById(res.body.reporte._id).lean()
    assert.deepEqual(enBD.ubicacion.coordinates, [-72.416, -35.333])
    assert.equal(subidas.length, 1)
  })

  test('PERDIDO sin radio usa 1000 m por defecto', async () => {
    const { radio_metros: _r, ...sinRadio } = perdidoValido
    const res = await publicar(sinRadio)
    assert.equal(res.status, 201)
    assert.equal(res.body.reporte.radio_metros, 1000)
  })

  test('AVISTADO sin teléfono ni nombre se acepta; radio y recompensa quedan en 0', async () => {
    const res = await publicar({
      tipo: 'AVISTADO',
      especie: 'PERRO',
      descripcion: 'Café con blanco, cerca de la costanera',
      recompensa: '9999',
      radio_metros: '800',
      lat: '-35.327',
      lng: '-72.425',
    })
    assert.equal(res.status, 201, JSON.stringify(res.body))
    assert.equal(res.body.reporte.contacto_whatsapp, undefined)
    assert.equal(res.body.reporte.radio_metros, 0)
    assert.equal(res.body.reporte.recompensa, 0)
  })

  test('PERDIDO sin nombre ni WhatsApp → 400 con mensajes por campo, sin subir foto', async () => {
    const { nombre_mascota: _n, contacto_whatsapp: _w, ...incompleto } = perdidoValido
    const res = await publicar(incompleto)
    assert.equal(res.status, 400)
    assert.equal(res.body.campos.nombre_mascota, 'Escribe el nombre de tu mascota.')
    assert.equal(res.body.campos.contacto_whatsapp, 'Deja un WhatsApp para que puedan avisarte.')
    assert.equal(subidas.length, 0, 'no debe subir la foto si los datos son inválidos')
  })

  test('WhatsApp con formato incorrecto → 400', async () => {
    const res = await publicar({ ...perdidoValido, contacto_whatsapp: '912345678' })
    assert.equal(res.status, 400)
    assert.match(res.body.campos.contacto_whatsapp, /\+569XXXXXXXX/)
  })

  test('descripción de más de 300 caracteres → 400', async () => {
    const res = await publicar({ ...perdidoValido, descripcion: 'a'.repeat(301) })
    assert.equal(res.status, 400)
    assert.ok(res.body.campos.descripcion)
  })

  test('radio fuera de rango → 400', async () => {
    const res = await publicar({ ...perdidoValido, radio_metros: '20000' })
    assert.equal(res.status, 400)
    assert.ok(res.body.campos.radio_metros)
  })

  test('latitud inválida → 400', async () => {
    const res = await publicar({ ...perdidoValido, lat: '-120' })
    assert.equal(res.status, 400)
    assert.equal(res.body.campos.lat, 'Latitud inválida.')
  })

  test('campo no permitido → 400', async () => {
    const res = await publicar({ ...perdidoValido, estado: 'ENCONTRADO' })
    assert.equal(res.status, 400)
    assert.equal(res.body.campos.estado, 'Campo no permitido.')
  })

  test('sin foto → 400', async () => {
    const res = await publicar(perdidoValido, null)
    assert.equal(res.status, 400)
    assert.equal(res.body.campos.foto, 'Falta la foto de la mascota.')
  })

  test('archivo que dice ser JPEG pero no es imagen → 400', async () => {
    const res = await publicar(perdidoValido, NO_IMAGEN, 'image/jpeg')
    assert.equal(res.status, 400)
    assert.ok(res.body.campos.foto)
    assert.equal(subidas.length, 0)
  })

  test('formato no permitido (gif) → 400', async () => {
    const res = await publicar(perdidoValido, JPEG, 'image/gif')
    assert.equal(res.status, 400)
  })

  test('foto de más de 5 MB → 413', async () => {
    const grande = Buffer.concat([JPEG, Buffer.alloc(5 * 1024 * 1024)])
    const res = await publicar(perdidoValido, grande)
    assert.equal(res.status, 413)
  })

  test('si Cloudinary falla → 502 y no se guarda nada', async () => {
    const appRota = createApp({
      subirFoto: async () => {
        throw new Error('timeout')
      },
      borrarFoto: async () => {},
      limitePublicaciones: 1000,
    })
    const req = request(appRota).post('/api/reportes')
    for (const [k, v] of Object.entries(perdidoValido)) req.field(k, v)
    const res = await req.attach('foto', JPEG, { filename: 'f.jpg', contentType: 'image/jpeg' })
    assert.equal(res.status, 502)
    assert.equal(await Reporte.countDocuments(), 0)
  })

  test('límite de publicaciones por IP → 429', async () => {
    const appLimitada = createApp({ ...fotosFalsas, limitePublicaciones: 1 })
    const enviar = () => {
      const req = request(appLimitada).post('/api/reportes')
      for (const [k, v] of Object.entries(perdidoValido)) req.field(k, v)
      return req.attach('foto', JPEG, { filename: 'f.jpg', contentType: 'image/jpeg' })
    }
    assert.equal((await enviar()).status, 201)
    const segunda = await enviar()
    assert.equal(segunda.status, 429)
    assert.match(segunda.body.error, /Espera unos minutos/)
  })
})

describe('GET /api/reportes/cercanos', () => {
  test('devuelve solo ACTIVOS, recientes y dentro de maxKm, del más cercano al más lejano', async () => {
    await insertar({ ...CENTRO, lat: CENTRO.lat - 0.02, descripcion: 'a ~2,2 km' })
    await insertar({ ...CENTRO, lat: CENTRO.lat - 0.005, descripcion: 'a ~550 m' })
    await insertar({ ...CENTRO, descripcion: 'en el centro' })
    await insertar({ ...CENTRO, descripcion: 'encontrado', estado: 'ENCONTRADO' })
    await insertar({ ...CENTRO, descripcion: 'viejo', createdAt: new Date(hace60Dias().getTime() - 86_400_000) })
    await insertar({ lat: -33.45, lng: -70.66, descripcion: 'Santiago, muy lejos' })
    await Reporte.updateOne({ descripcion: 'en el centro' }, { $set: { embedding: [0.1, 0.2] } })

    const res = await request(app).get('/api/reportes/cercanos').query({ ...CENTRO, maxKm: 5 })
    assert.equal(res.status, 200)
    assert.deepEqual(
      res.body.reportes.map((r) => r.descripcion),
      ['en el centro', 'a ~550 m', 'a ~2,2 km'],
    )
    assert.ok(res.body.reportes.every((r) => r.embedding === undefined), 'embedding nunca sale en la API')
  })

  test('maxKm limita el radio', async () => {
    await insertar({ ...CENTRO, lat: CENTRO.lat - 0.02, descripcion: 'a ~2,2 km' })
    const res = await request(app).get('/api/reportes/cercanos').query({ ...CENTRO, maxKm: 1 })
    assert.equal(res.status, 200)
    assert.equal(res.body.reportes.length, 0)
  })

  test('maxKm por defecto es 10 km', async () => {
    await insertar({ ...CENTRO, lat: CENTRO.lat - 0.08, descripcion: 'a ~8,9 km' })
    await insertar({ ...CENTRO, lat: CENTRO.lat - 0.1, descripcion: 'a ~11 km' })
    const res = await request(app).get('/api/reportes/cercanos').query(CENTRO)
    assert.deepEqual(res.body.reportes.map((r) => r.descripcion), ['a ~8,9 km'])
  })

  test('lat inválida o faltante → 400', async () => {
    const r1 = await request(app).get('/api/reportes/cercanos').query({ lat: 'abc', lng: -72 })
    assert.equal(r1.status, 400)
    const r2 = await request(app).get('/api/reportes/cercanos').query({ lng: -72 })
    assert.equal(r2.status, 400)
    assert.ok(r2.body.campos.lat)
  })

  test('maxKm fuera de rango → 400', async () => {
    const res = await request(app).get('/api/reportes/cercanos').query({ ...CENTRO, maxKm: 500 })
    assert.equal(res.status, 400)
  })
})

describe('Modelo Reporte', () => {
  test('existe el índice 2dsphere en ubicacion', async () => {
    const indices = await Reporte.collection.listIndexes().toArray()
    assert.ok(indices.some((i) => i.key.ubicacion === '2dsphere'))
  })

  test('rechaza coordenadas fuera de rango (probables lat/lng invertidas en otro sistema)', async () => {
    await assert.rejects(
      Reporte.create({
        tipo: 'AVISTADO',
        especie: 'GATO',
        foto_url: 'https://res.cloudinary.com/demo/x.webp',
        ubicacion: { type: 'Point', coordinates: [-35.3, -172.4] }, // lat fuera de ±90
      }),
      /Coordenadas inválidas/,
    )
  })

  test('rechaza campos que no están en el esquema', async () => {
    await assert.rejects(
      Reporte.create({
        tipo: 'AVISTADO',
        especie: 'GATO',
        foto_url: 'https://res.cloudinary.com/demo/x.webp',
        ubicacion: { type: 'Point', coordinates: [-72.4, -35.3] },
        raza: 'beagle',
      }),
    )
  })
})
