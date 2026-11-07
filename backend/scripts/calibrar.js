/**
 * npm run db:calibrar [-- <carpeta>]   (por defecto: backend/calibracion)
 *
 * Calibra UMBRAL_COINCIDENCIA con fotos reales. Estructura: UNA carpeta por animal,
 * con prefijo de especie y 2+ fotos distintas del mismo animal:
 *
 *   calibracion/
 *     perro-rocky/      foto1.jpg  foto2.jpg  foto3.jpg
 *     perro-negro-toby/ a.jpg  b.jpg
 *     gato-michi/       1.jpg  2.jpg
 *
 * Compara todos los pares y muestra, para cada umbral posible, qué % de "mismo animal"
 * detectaría y qué % de "otro animal de la misma especie" daría falsa alarma.
 * No necesita MongoDB ni Cloudinary: solo el modelo.
 */
import fs from 'node:fs'
import path from 'node:path'
import { crearServicioEmbeddings, similitudCoseno } from '../src/services/embeddings.js'

const carpeta = path.resolve(process.argv[2] ?? path.join(import.meta.dirname, '../calibracion'))
const EXT = /\.(jpe?g|png|webp)$/i

if (!fs.existsSync(carpeta)) {
  console.error(`No existe la carpeta ${carpeta}. Lee backend/calibracion/LEEME.md`)
  process.exit(1)
}

const animales = fs
  .readdirSync(carpeta, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => {
    const especie = d.name.toLowerCase().startsWith('gato') ? 'GATO' : d.name.toLowerCase().startsWith('perro') ? 'PERRO' : null
    const fotos = fs.readdirSync(path.join(carpeta, d.name)).filter((f) => EXT.test(f))
    return { nombre: d.name, especie, fotos: fotos.map((f) => path.join(carpeta, d.name, f)) }
  })

const sinEspecie = animales.filter((a) => !a.especie)
if (sinEspecie.length) {
  console.error(`Estas carpetas deben empezar con "perro-" o "gato-": ${sinEspecie.map((a) => a.nombre).join(', ')}`)
  process.exit(1)
}
const total = animales.reduce((s, a) => s + a.fotos.length, 0)
if (animales.length < 2 || total < 4) {
  console.error('Se necesitan al menos 2 animales y 4 fotos en total (ideal: 5+ animales con 2-4 fotos cada uno).')
  process.exit(1)
}

console.log(`Cargando modelo… (${animales.length} animales, ${total} fotos)`)
const ia = await crearServicioEmbeddings()
const fotos = []
for (const a of animales) {
  for (const archivo of a.fotos) {
    try {
      fotos.push({ animal: a.nombre, especie: a.especie, archivo: path.relative(carpeta, archivo), v: await ia.calcular(fs.readFileSync(archivo)) })
    } catch (e) {
      console.warn(`  (se omite ${archivo}: ${e.message})`)
    }
  }
}

const grupos = { mismo: [], otroMismaEspecie: [], otraEspecie: [] }
for (let i = 0; i < fotos.length; i++) {
  for (let j = i + 1; j < fotos.length; j++) {
    const a = fotos[i]
    const b = fotos[j]
    const par = { s: similitudCoseno(a.v, b.v), a: a.archivo, b: b.archivo }
    if (a.animal === b.animal) grupos.mismo.push(par)
    else if (a.especie === b.especie) grupos.otroMismaEspecie.push(par)
    else grupos.otraEspecie.push(par)
  }
}

const pct = (arr, p) => {
  if (!arr.length) return NaN
  const s = [...arr].sort((x, y) => x - y)
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]
}
const f = (x) => (Number.isNaN(x) ? '  -  ' : x.toFixed(3))
const resumen = (nombre, pares) => {
  const s = pares.map((p) => p.s)
  console.log(
    `${nombre.padEnd(30)} n=${String(s.length).padStart(4)}  min ${f(Math.min(...s))}  p10 ${f(pct(s, 10))}  mediana ${f(pct(s, 50))}  p90 ${f(pct(s, 90))}  max ${f(Math.max(...s))}`,
  )
}

console.log('\n=== Similitud coseno por grupo ===')
resumen('Mismo animal (debe ser ALTA)', grupos.mismo)
resumen('Otro animal, misma especie', grupos.otroMismaEspecie)
resumen('Distinta especie', grupos.otraEspecie)

console.log('\n=== ¿Qué pasa con cada umbral? ===')
console.log('umbral | detecta mismo animal | falsa alarma (otro animal, misma especie)')
const tasa = (pares, u) => (pares.length ? (100 * pares.filter((p) => p.s >= u).length) / pares.length : NaN)
let sugerido = null
for (let u = 0.75; u <= 0.951; u += 0.01) {
  const det = tasa(grupos.mismo, u)
  const fa = tasa(grupos.otroMismaEspecie, u)
  if (sugerido === null && fa <= 5) sugerido = u
  console.log(` ${u.toFixed(2)}  |        ${det.toFixed(0).padStart(3)} %          |   ${Number.isNaN(fa) ? ' - ' : fa.toFixed(0).padStart(3)} %`)
}

const top = (pares, n, desc) => [...pares].sort((x, y) => (desc ? y.s - x.s : x.s - y.s)).slice(0, n)
console.log('\nPares de animales DISTINTOS más parecidos (riesgo de falsa alarma):')
for (const p of top(grupos.otroMismaEspecie, 5, true)) console.log(`  ${p.s.toFixed(3)}  ${p.a}  ↔  ${p.b}`)
console.log('\nFotos del MISMO animal menos parecidas (riesgo de no detectarlo):')
for (const p of top(grupos.mismo, 5, false)) console.log(`  ${p.s.toFixed(3)}  ${p.a}  ↔  ${p.b}`)

if (sugerido !== null) {
  console.log(
    `\nUmbral sugerido: ${sugerido.toFixed(2)} (el más bajo con ≤ 5 % de falsas alarmas; detecta ${tasa(grupos.mismo, sugerido).toFixed(0)} % del mismo animal).`,
  )
  console.log('Para aplicarlo: UMBRAL_COINCIDENCIA=' + sugerido.toFixed(2) + ' en backend/.env y reinicia la API.')
}
