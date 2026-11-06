/**
 * Utilidades de coordenadas: Leaflet vs GeoJSON/MongoDB.
 * Espejo de frontend/src/lib/geo.ts.
 *
 *   Leaflet            → [latitud, longitud]
 *   GeoJSON / MongoDB  → [longitud, latitud]   ← SIEMPRE así en la BD
 */

/** GeoJSON [lng, lat] → Leaflet [lat, lng] */
export function toLeaflet([lng, lat]) {
  return [lat, lng]
}

/** Leaflet [lat, lng] → GeoJSON [lng, lat] */
export function toGeoJSON([lat, lng]) {
  return [lng, lat]
}

/** Leaflet [lat, lng] → { type: 'Point', coordinates: [lng, lat] } */
export function toGeoPoint(latlng) {
  assertLatLng(latlng)
  return { type: 'Point', coordinates: toGeoJSON(latlng) }
}

/** Lanza un error si la coordenada está fuera de rango (lat ±90, lng ±180). */
export function assertLatLng([lat, lng]) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new TypeError(`Coordenada no numérica: [${lat}, ${lng}]`)
  }
  if (lat < -90 || lat > 90) {
    throw new RangeError(`Latitud fuera de rango (${lat}). ¿Coordenadas invertidas?`)
  }
  if (lng < -180 || lng > 180) {
    throw new RangeError(`Longitud fuera de rango (${lng}).`)
  }
}

/** Chile continental: lat -17 a -56, lng -66 a -76. Fuera de eso, sospecha de inversión. */
export function pareceEnChile([lat, lng]) {
  return lat <= -17 && lat >= -56 && lng <= -66 && lng >= -76
}
