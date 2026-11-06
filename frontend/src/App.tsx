import { useMemo, useState } from 'react'
import { FabAcciones } from '@/components/FabAcciones'
import { FiltrosReporte } from '@/components/FiltrosReporte'
import { MapaPrincipal } from '@/components/map/MapaPrincipal'
import { ProximamenteSheet } from '@/components/reportes/ProximamenteSheet'
import { ReporteDetalleSheet } from '@/components/reportes/ReporteDetalleSheet'
import { reportesMock } from '@/data/reportesMock'
import type { FiltroReporte, Reporte, TipoReporte } from '@/types/reporte'

// Fase 1: datos de prueba. En Fase 2 vendrán de GET /api/reportes/cercanos.
const reportes = reportesMock.filter((r) => r.estado === 'ACTIVO')

export default function App() {
  const [filtro, setFiltro] = useState<FiltroReporte>('TODOS')
  const [seleccionado, setSeleccionado] = useState<Reporte | null>(null)
  const [publicando, setPublicando] = useState<TipoReporte | null>(null)

  const conteo = useMemo<Record<FiltroReporte, number>>(
    () => ({
      TODOS: reportes.length,
      PERDIDO: reportes.filter((r) => r.tipo === 'PERDIDO').length,
      AVISTADO: reportes.filter((r) => r.tipo === 'AVISTADO').length,
    }),
    [],
  )

  const visibles = filtro === 'TODOS' ? reportes : reportes.filter((r) => r.tipo === filtro)

  return (
    // `isolate`: Leaflet queda en su propio stacking context y no tapa el FAB ni el Drawer.
    <main className="relative isolate h-dvh w-full overflow-hidden bg-slate-200">
      <div className="absolute inset-0 z-0">
        <MapaPrincipal reportes={visibles} onSelect={setSeleccionado} />
      </div>

      <FiltrosReporte valor={filtro} onChange={setFiltro} conteo={conteo} />
      <FabAcciones onAccion={setPublicando} />

      <ReporteDetalleSheet reporte={seleccionado} onClose={() => setSeleccionado(null)} />
      <ProximamenteSheet tipo={publicando} onClose={() => setPublicando(null)} />
    </main>
  )
}
