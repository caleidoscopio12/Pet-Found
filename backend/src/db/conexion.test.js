import assert from 'node:assert/strict'
import { test } from 'node:test'
import { uriTraeBase } from './conexion.js'

test('uriTraeBase detecta si la URI indica una base de datos', () => {
  assert.equal(uriTraeBase('mongodb+srv://u:p@c.mongodb.net/?retryWrites=true&w=majority'), false)
  assert.equal(uriTraeBase('mongodb+srv://u:p@c.mongodb.net'), false)
  assert.equal(uriTraeBase('mongodb+srv://u:p@c.mongodb.net/mascotas?retryWrites=true'), true)
  assert.equal(uriTraeBase('mongodb://localhost:27017/mascotas'), true)
  assert.equal(uriTraeBase('mongodb://h1:27017,h2:27017/?replicaSet=rs0'), false)
})
