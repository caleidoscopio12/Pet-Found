/**
 * Test del modelo CLIP REAL (lento: carga ~90 MB). No corre con `npm test`;
 * usar `npm run test:modelo`. Fotos de prueba: Unsplash (licencia libre).
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { before, test } from 'node:test'
import { crearServicioEmbeddings, similitudCoseno } from '../src/services/embeddings.js'

const foto = (n) => fs.readFileSync(path.join(import.meta.dirname, 'fixtures', n))
let ia

before(async () => {
  ia = await crearServicioEmbeddings()
})

test('devuelve 512 dimensiones normalizadas (norma 1)', async () => {
  const v = await ia.calcular(foto('perro-beagle.jpg'))
  assert.equal(v.length, 512)
  const norma = Math.sqrt(v.reduce((s, x) => s + x * x, 0))
  assert.ok(Math.abs(norma - 1) < 1e-3, `norma ${norma}`)
})

test('es determinista: la misma foto da el mismo vector (coseno ≈ 1)', async () => {
  const a = await ia.calcular(foto('perro-collie.jpg'))
  const b = await ia.calcular(foto('perro-collie.jpg'))
  assert.ok(similitudCoseno(a, b) > 0.999)
})

test('animales distintos quedan bajo el umbral por defecto (0,85)', async () => {
  const beagle = await ia.calcular(foto('perro-beagle.jpg'))
  const collie = await ia.calcular(foto('perro-collie.jpg'))
  const gato = await ia.calcular(foto('gato-blanco-negro.jpg'))
  for (const [nombre, s] of [
    ['beagle vs collie', similitudCoseno(beagle, collie)],
    ['beagle vs gato', similitudCoseno(beagle, gato)],
    ['collie vs gato', similitudCoseno(collie, gato)],
  ]) {
    assert.ok(s < 0.85, `${nombre}: ${s.toFixed(3)}`)
  }
})

test('acepta PNG con transparencia (4 canales) y en escala de grises', async () => {
  // sharp viene como dependencia de @huggingface/transformers.
  const { default: sharp } = await import('sharp')
  const rgba = await sharp({ create: { width: 32, height: 32, channels: 4, background: { r: 200, g: 120, b: 40, alpha: 0.5 } } })
    .png()
    .toBuffer()
  const gris = await sharp({ create: { width: 32, height: 32, channels: 3, background: { r: 90, g: 90, b: 90 } } })
    .toColourspace('b-w')
    .png()
    .toBuffer()
  assert.equal((await sharp(rgba).metadata()).channels, 4)
  assert.equal((await ia.calcular(rgba)).length, 512)
  assert.equal((await ia.calcular(gris)).length, 512)
})

test('rechaza bytes que no son una imagen', async () => {
  await assert.rejects(ia.calcular(Buffer.from('no soy una imagen')))
})
