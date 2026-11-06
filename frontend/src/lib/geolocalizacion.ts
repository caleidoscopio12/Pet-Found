import type { LatLng } from '@/lib/geo'

/**
 * Pide la ubicación GPS del dispositivo. Devuelve [lat, lng] (orden Leaflet).
 * Ojo: el navegador solo la entrega en HTTPS o en localhost.
 */
export function pedirUbicacion(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Tu navegador no permite usar la ubicación. Mueve el mapa a mano.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve([p.coords.latitude, p.coords.longitude]),
      (e) =>
        reject(
          new Error(
            e.code === e.PERMISSION_DENIED
              ? 'No diste permiso para usar tu ubicación. Puedes mover el mapa a mano.'
              : 'No pudimos encontrar tu ubicación. Mueve el mapa a mano.',
          ),
        ),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  })
}
