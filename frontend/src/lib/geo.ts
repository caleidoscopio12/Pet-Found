/**
 * Utilidades de coordenadas: Leaflet vs GeoJSON/MongoDB.
 *
 *   Leaflet            → [latitud, longitud]   (LatLng)
 *   GeoJSON / MongoDB  → [longitud, latitud]   (LngLat)
 *
 * REGLA: todo lo que entra o sale de la API pasa por estas funciones.
 * Los componentes del mapa trabajan SOLO con LatLng.
 */

/** Orden Leaflet: [latitud, longitud] */
export type LatLng = [lat: number, lng: number]

/** Orden GeoJSON / MongoDB: [longitud, latitud] */
export type LngLat = [lng: number, lat: number]

/** Punto GeoJSON tal como se guarda en MongoDB (`ubicacion`). */
export interface GeoPoint {
  type: 'Point'
  coordinates: LngLat
}

/** GeoJSON [lng, lat] → Leaflet [lat, lng] */
export function toLeaflet([lng, lat]: LngLat): LatLng {
  return [lat, lng]
}

/** Leaflet [lat, lng] → GeoJSON [lng, lat] */
export function toGeoJSON([lat, lng]: LatLng): LngLat {
  return [lng, lat]
}

/** Leaflet [lat, lng] → `{ type: 'Point', coordinates: [lng, lat] }` listo para la API. */
export function toGeoPoint(latlng: LatLng): GeoPoint {
  assertLatLng(latlng)
  return { type: 'Point', coordinates: toGeoJSON(latlng) }
}

/** Lanza un error si la coordenada está fuera de rango (lat ±90, lng ±180). */
export function assertLatLng([lat, lng]: LatLng): void {
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

/**
 * Chile continental está aprox. entre lat -17 y -56, lng -66 y -76.
 * Si un punto cae fuera, lo más probable es que las coordenadas estén invertidas.
 * Útil para avisos en desarrollo (no bloquea).
 */
export function pareceEnChile([lat, lng]: LatLng): boolean {
  return lat <= -17 && lat >= -56 && lng <= -66 && lng >= -76
}
