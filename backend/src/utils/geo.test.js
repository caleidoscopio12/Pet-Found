import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assertLatLng, pareceEnChile, toGeoJSON, toGeoPoint, toLeaflet } from './geo.js'

const constitucion = [-35.333, -72.416] // Leaflet [lat, lng]

test('toGeoJSON invierte [lat, lng] → [lng, lat]', () => {
  assert.deepEqual(toGeoJSON(constitucion), [-72.416, -35.333])
})

test('toLeaflet invierte [lng, lat] → [lat, lng]', () => {
  assert.deepEqual(toLeaflet([-72.416, -35.333]), constitucion)
})

test('ida y vuelta devuelve el mismo punto', () => {
  assert.deepEqual(toLeaflet(toGeoJSON(constitucion)), constitucion)
})

test('toGeoPoint arma el GeoJSON que espera Mongo', () => {
  assert.deepEqual(toGeoPoint(constitucion), {
    type: 'Point',
    coordinates: [-72.416, -35.333],
  })
})

test('assertLatLng detecta coordenadas fuera de rango', () => {
  assert.throws(() => assertLatLng([-100, -72]), RangeError)
  assert.throws(() => assertLatLng([Number.NaN, 0]), TypeError)
  assert.doesNotThrow(() => assertLatLng(constitucion))
})

test('pareceEnChile delata coordenadas invertidas', () => {
  assert.equal(pareceEnChile(constitucion), true)
  assert.equal(pareceEnChile([-72.416, -35.333]), false) // invertida
})
