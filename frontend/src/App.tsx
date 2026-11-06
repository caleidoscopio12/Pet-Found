import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BotonLista } from '@/components/BotonLista'
import { EstadoCarga } from '@/components/EstadoCarga'
import { FabAcciones } from '@/components/FabAcciones'
import { FiltrosReporte } from '@/components/FiltrosReporte'
import { MapaPrincipal, type EnfoqueMapa, type SeleccionMapa } from '@/components/map/MapaPrincipal'
import { FormularioReporteSheet } from '@/components/publicar/FormularioReporteSheet'
import { SelectorUbicacion, type EstadoGps } from '@/components/publicar/SelectorUbicacion'
import { ListaReportesSheet } from '@/components/reportes/ListaReportesSheet'
import { ReporteDetalleSheet } from '@/components/reportes/ReporteDetalleSheet'
import { useReportesCercanos } from '@/hooks/useReportesCercanos'
import { DEFAULT_CENTER } from '@/lib/config'
import { toLeaflet, type LatLng } from '@/lib/geo'
import { pedirUbicacion } from '@/lib/geolocalizacion'
import { RADIO_DEFAULT } from '@/lib/reglas'
import type { FiltroReporte, Reporte, TipoReporte } from '@/types/reporte'

/** Tiempo para que un panel termine de cerrarse antes de abrir otro. */
const PAUSA_ENTRE_PANELES_MS = 280

interface Publicacion {
  tipo: TipoReporte
  paso: 'ubicacion' | 'formulario'
}

export default function App() {
  const { reportes, estado, error, cargar, reintentar, agregar } = useReportesCercanos()

  const [filtro, setFiltro] = useState<FiltroReporte>('TODOS')
  const [seleccionado, setSeleccionado] = useState<Reporte | null>(null)
  const [listaAbierta, setListaAbierta] = useState(false)
  const [enfoque, setEnfoque] = useState<EnfoqueMapa | null>(null)
  const temporizador = useRef<number | undefined>(undefined)

  // ---- Publicar ----
  const [publicando, setPublicando] = useState<Publicacion | null>(null)
  /** La sesión del formulario sobrevive a "Cancelar" para que el Drawer anime su cierre. */
  const [sesion, setSesion] = useState<{ id: number; tipo: TipoReporte }>({ id: 0, tipo: 'PERDIDO' })
  const [radio, setRadio] = useState(RADIO_DEFAULT)
  const [ajusteId, setAjusteId] = useState(0)
  const [ubicacion, setUbicacion] = useState<LatLng | null>(null)
  const [gps, setGps] = useState<EstadoGps>('inactivo')
  const [errorGps, setErrorGps] = useState<string | null>(null)
  const centroRef = useRef<LatLng>(DEFAULT_CENTER)

  // Al abrir: pedir GPS y centrar en el usuario (si lo permite).
  const gpsInicialPedido = useRef(false)
  useEffect(() => {
    if (gpsInicialPedido.current) return
    gpsInicialPedido.current = true
    pedirUbicacion()
      .then((centro) => setEnfoque({ centro, id: Date.now(), zoom: 14, desplazar: false }))
      .catch(() => {}) // sin permiso: queda el centro por defecto
  }, [])

  const conteo = useMemo<Record<FiltroReporte, number>>(() => {
    const perdidos = reportes.filter((r) => r.tipo === 'PERDIDO').length
    return { TODOS: reportes.length, PERDIDO: perdidos, AVISTADO: reportes.length - perdidos }
  }, [reportes])

  const visibles = filtro === 'TODOS' ? reportes : reportes.filter((r) => r.tipo === filtro)

  /** Cerrar paneles → volar al pin → abrir su detalle. */
  function mostrarReporte(reporte: Reporte) {
    if (filtro !== 'TODOS' && filtro !== reporte.tipo) setFiltro('TODOS') // que el pin se vea
    setEnfoque({ centro: toLeaflet(reporte.ubicacion.coordinates), id: Date.now() })
    window.clearTimeout(temporizador.current)
    temporizador.current = window.setTimeout(() => setSeleccionado(reporte), PAUSA_ENTRE_PANELES_MS)
  }

  function elegirDesdeLista(reporte: Reporte) {
    setListaAbierta(false)
    mostrarReporte(reporte)
  }

  async function usarGps() {
    setGps('buscando')
    setErrorGps(null)
    try {
      const centro = await pedirUbicacion()
      setEnfoque({ centro, id: Date.now(), zoom: 17, desplazar: false })
      setGps('inactivo')
    } catch (e) {
      setGps('error')
      setErrorGps(e instanceof Error ? e.message : 'No pudimos encontrar tu ubicación.')
    }
  }

  function iniciarPublicacion(tipo: TipoReporte) {
    setSeleccionado(null)
    setListaAbierta(false)
    setSesion({ id: Date.now(), tipo })
    setRadio(RADIO_DEFAULT)
    setUbicacion(null)
    setGps('inactivo')
    setErrorGps(null)
    setPublicando({ tipo, paso: 'ubicacion' })
    // Avistamiento: casi siempre es "aquí mismo" → GPS de inmediato (meta: 30 s).
    if (tipo === 'AVISTADO') void usarGps()
  }

  function confirmarUbicacion() {
    setUbicacion(centroRef.current)
    setPublicando((p) => p && { ...p, paso: 'formulario' })
  }

  function volverAUbicacion() {
    setPublicando((p) => p && { ...p, paso: 'ubicacion' })
  }

  function cancelarPublicacion() {
    setPublicando(null)
  }

  function alPublicar(reporte: Reporte) {
    agregar(reporte)
    setPublicando(null)
    mostrarReporte(reporte)
  }

  const alMoverCentro = useCallback((c: LatLng) => {
    centroRef.current = c
  }, [])

  const seleccion = useMemo<SeleccionMapa | null>(
    () =>
      publicando?.paso === 'ubicacion'
        ? { radio: publicando.tipo === 'PERDIDO' ? radio : null, onCentro: alMoverCentro, ajusteId }
        : null,
    [publicando, radio, ajusteId, alMoverCentro],
  )

  const eligiendoUbicacion = publicando?.paso === 'ubicacion'

  return (
    // `isolate`: Leaflet queda en su propio stacking context y no tapa el FAB ni el Drawer.
    <main className="relative isolate h-dvh w-full overflow-hidden bg-slate-200">
      <div className="absolute inset-0 z-0">
        <MapaPrincipal
          reportes={visibles}
          onSelect={publicando ? undefined : setSeleccionado}
          enfoque={enfoque}
          onArea={cargar}
          seleccion={seleccion}
        />
      </div>

      {!publicando && (
        <>
          <FiltrosReporte valor={filtro} onChange={setFiltro} conteo={conteo} />
          <EstadoCarga estado={estado} error={error} hayReportes={reportes.length > 0} onReintentar={reintentar} />
          <BotonLista
            perdidos={conteo.PERDIDO}
            avistados={conteo.AVISTADO}
            onClick={() => setListaAbierta(true)}
          />
          <FabAcciones onAccion={iniciarPublicacion} />
        </>
      )}

      {eligiendoUbicacion && (
        <SelectorUbicacion
          tipo={publicando.tipo}
          radio={radio}
          onRadio={setRadio}
          onSoltarRadio={() => setAjusteId((n) => n + 1)}
          gps={gps}
          errorGps={errorGps}
          onUsarGps={usarGps}
          onConfirmar={confirmarUbicacion}
          onCancelar={cancelarPublicacion}
        />
      )}

      <ListaReportesSheet
        abierto={listaAbierta}
        tipoInicial={filtro === 'AVISTADO' ? 'AVISTADO' : 'PERDIDO'}
        reportes={reportes}
        onClose={() => setListaAbierta(false)}
        onElegir={elegirDesdeLista}
      />
      <ReporteDetalleSheet reporte={seleccionado} onClose={() => setSeleccionado(null)} />
      {sesion.id > 0 && (
        <FormularioReporteSheet
          key={sesion.id}
          abierto={publicando?.paso === 'formulario'}
          tipo={sesion.tipo}
          ubicacion={ubicacion}
          radio={radio}
          onCambiarUbicacion={volverAUbicacion}
          onPublicado={alPublicar}
        />
      )}
    </main>
  )
}
