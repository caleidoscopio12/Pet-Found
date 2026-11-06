import { useState } from 'react'
import { Cat, CircleCheck, Dog, LoaderCircle, MapPin, Send } from 'lucide-react'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { crearReporte, ErrorApi } from '@/lib/api'
import { formatoRadio } from '@/lib/formato'
import type { LatLng } from '@/lib/geo'
import { DIGITOS_WHATSAPP, MAX_DESCRIPCION, MAX_NOMBRE, PREFIJO_WHATSAPP } from '@/lib/reglas'
import { cn } from '@/lib/utils'
import type { Especie, Reporte, TipoReporte } from '@/types/reporte'
import { CampoFoto, type FotoLista } from './CampoFoto'

type Campo = 'foto' | 'especie' | 'nombre_mascota' | 'descripcion' | 'contacto_whatsapp' | 'recompensa'
type Errores = Partial<Record<Campo, string>>
type EstadoEnvio = 'editando' | 'enviando' | 'listo'

/** Orden visual de los campos (para enfocar el primer error). */
const ORDEN: Campo[] = ['foto', 'especie', 'nombre_mascota', 'descripcion', 'contacto_whatsapp', 'recompensa']
const ID_CAMPO: Record<Campo, string> = {
  foto: 'campo-foto',
  especie: 'campo-especie',
  nombre_mascota: 'campo-nombre',
  descripcion: 'campo-descripcion',
  contacto_whatsapp: 'campo-whatsapp',
  recompensa: 'campo-recompensa',
}

const soloDigitos = (s: string) => s.replace(/\D/g, '')
const miles = new Intl.NumberFormat('es-CL')

interface Props {
  abierto: boolean
  tipo: TipoReporte
  ubicacion: LatLng | null
  radio: number
  /** Volver al paso 1 (sin perder lo escrito). */
  onCambiarUbicacion: () => void
  onPublicado: (reporte: Reporte) => void
}

/** Paso 2 de publicar: foto + datos. Mismas reglas que valida el backend. */
export function FormularioReporteSheet({ abierto, tipo, ubicacion, radio, onCambiarUbicacion, onPublicado }: Props) {
  const perdido = tipo === 'PERDIDO'

  const [foto, setFoto] = useState<FotoLista | null>(null)
  const [comprimiendo, setComprimiendo] = useState(false)
  const [especie, setEspecie] = useState<Especie | null>(null)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [whatsapp, setWhatsapp] = useState('') // solo los 8 dígitos
  const [recompensa, setRecompensa] = useState('') // solo dígitos
  const [errores, setErrores] = useState<Errores>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [envio, setEnvio] = useState<EstadoEnvio>('editando')

  function validar(): Errores {
    const e: Errores = {}
    if (!foto) e.foto = 'Agrega una foto: es lo que más ayuda a reconocerla.'
    if (!especie) e.especie = 'Indica si es perro o gato.'
    if (perdido && !nombre.trim()) e.nombre_mascota = 'Escribe el nombre de tu mascota.'
    if (nombre.trim().length > MAX_NOMBRE) e.nombre_mascota = `Máximo ${MAX_NOMBRE} caracteres.`
    if (descripcion.trim().length > MAX_DESCRIPCION) e.descripcion = `Máximo ${MAX_DESCRIPCION} caracteres.`
    if (perdido && !whatsapp) e.contacto_whatsapp = 'Deja un WhatsApp para que puedan avisarte.'
    else if (whatsapp && whatsapp.length !== DIGITOS_WHATSAPP)
      e.contacto_whatsapp = `Escribe los ${DIGITOS_WHATSAPP} dígitos después del +56 9.`
    return e
  }

  function enfocarPrimerError(e: Errores) {
    const primero = ORDEN.find((c) => e[c])
    if (primero) document.getElementById(ID_CAMPO[primero])?.focus()
  }

  async function publicar(ev: React.FormEvent) {
    ev.preventDefault()
    if (envio !== 'editando' || comprimiendo) return
    setErrorGeneral(null)

    const e = validar()
    setErrores(e)
    if (Object.keys(e).length > 0 || !ubicacion || !foto || !especie) {
      enfocarPrimerError(e)
      return
    }

    const datos = new FormData()
    datos.append('tipo', tipo)
    datos.append('especie', especie)
    // Leaflet [lat, lng] → se mandan con nombre; el backend arma el GeoJSON [lng, lat].
    datos.append('lat', String(ubicacion[0]))
    datos.append('lng', String(ubicacion[1]))
    if (nombre.trim()) datos.append('nombre_mascota', nombre.trim())
    if (descripcion.trim()) datos.append('descripcion', descripcion.trim())
    if (whatsapp) datos.append('contacto_whatsapp', `${PREFIJO_WHATSAPP}${whatsapp}`)
    if (perdido) {
      datos.append('radio_metros', String(radio))
      if (recompensa) datos.append('recompensa', recompensa)
    }
    datos.append('foto', foto.archivo)

    setEnvio('enviando')
    try {
      const reporte = await crearReporte(datos)
      setEnvio('listo')
      window.setTimeout(() => onPublicado(reporte), 700)
    } catch (err) {
      setEnvio('editando')
      if (err instanceof ErrorApi) {
        const deCampos: Errores = {}
        for (const c of ORDEN) if (err.campos?.[c]) deCampos[c] = err.campos[c]
        setErrores(deCampos)
        setErrorGeneral(err.message)
        enfocarPrimerError(deCampos)
      } else {
        setErrorGeneral('No pudimos publicar. Intenta de nuevo.')
      }
    }
  }

  const textoBoton =
    envio === 'listo'
      ? '¡Publicado!'
      : envio === 'enviando'
        ? 'Publicando…'
        : comprimiendo
          ? 'Optimizando foto…'
          : 'Publicar'

  return (
    <Drawer open={abierto} onOpenChange={(v) => !v && envio !== 'enviando' && onCambiarUbicacion()}>
      <DrawerContent srTitle={perdido ? 'Perdí mi mascota' : 'Vi una mascota'} className="h-[92dvh]" showClose={false}>
        <form noValidate onSubmit={publicar} className="flex flex-col gap-5 pb-2">
          <header className="flex items-center gap-3">
            <span className={cn('size-3 rounded-full', perdido ? 'bg-red-600' : 'bg-emerald-500')} aria-hidden />
            <h2 className="text-2xl font-extrabold text-slate-900">
              {perdido ? 'Perdí mi mascota' : 'Vi una mascota'}
            </h2>
          </header>

          {/* Resumen de ubicación */}
          <div className="flex items-center gap-3 rounded-2xl bg-slate-100 p-3">
            <MapPin className={cn('size-6 shrink-0', perdido ? 'text-red-600' : 'text-emerald-600')} aria-hidden />
            <p className="flex-1 text-[15px] font-semibold text-slate-900">
              Ubicación marcada
              {perdido && <span className="font-normal text-slate-700"> · radio {formatoRadio(radio)}</span>}
            </p>
            <button
              type="button"
              onClick={onCambiarUbicacion}
              disabled={envio !== 'editando'}
              className="h-10 rounded-full bg-white px-4 text-sm font-bold text-slate-900 ring-1 ring-slate-300"
            >
              Cambiar
            </button>
          </div>

          <CampoFoto
            foto={foto}
            onFoto={(f) => {
              setFoto(f)
              setErrores((e) => ({ ...e, foto: undefined }))
            }}
            onComprimiendo={setComprimiendo}
            error={errores.foto}
          />

          {/* Especie */}
          <fieldset>
            <legend className="mb-2 text-base font-bold text-slate-900">
              ¿Es perro o gato? <span className="text-red-600">*</span>
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['PERRO', 'Perro', Dog],
                  ['GATO', 'Gato', Cat],
                ] as const
              ).map(([valor, label, Icono], i) => (
                <button
                  key={valor}
                  id={i === 0 ? ID_CAMPO.especie : undefined}
                  type="button"
                  aria-pressed={especie === valor}
                  onClick={() => {
                    setEspecie(valor)
                    setErrores((e) => ({ ...e, especie: undefined }))
                  }}
                  className={cn(
                    'flex h-14 items-center justify-center gap-2 rounded-2xl text-lg font-bold ring-1 transition-colors',
                    especie === valor ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-900 ring-slate-300',
                    errores.especie && 'ring-2 ring-red-500',
                  )}
                >
                  <Icono className="size-6" aria-hidden />
                  {label}
                </button>
              ))}
            </div>
            <ErrorCampo mensaje={errores.especie} />
          </fieldset>

          {/* Nombre (solo PERDIDO) */}
          {perdido && (
            <Campo id={ID_CAMPO.nombre_mascota} label="Nombre" requerido error={errores.nombre_mascota}>
              <input
                id={ID_CAMPO.nombre_mascota}
                type="text"
                autoComplete="off"
                maxLength={MAX_NOMBRE}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Rocky"
                aria-invalid={Boolean(errores.nombre_mascota)}
                className={claseInput(errores.nombre_mascota)}
              />
            </Campo>
          )}

          {/* Descripción */}
          <Campo
            id={ID_CAMPO.descripcion}
            label={perdido ? 'Descripción' : '¿Cómo es y dónde está?'}
            error={errores.descripcion}
            extra={
              <span className={cn('text-sm tabular-nums', descripcion.length > MAX_DESCRIPCION - 20 ? 'text-red-700' : 'text-slate-500')}>
                {descripcion.length}/{MAX_DESCRIPCION}
              </span>
            }
          >
            <textarea
              id={ID_CAMPO.descripcion}
              rows={3}
              maxLength={MAX_DESCRIPCION}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder={
                perdido
                  ? 'Raza, color, collar, si es tímido o se acerca…'
                  : 'Color, tamaño, collar, hacia dónde iba…'
              }
              aria-invalid={Boolean(errores.descripcion)}
              className={cn(claseInput(errores.descripcion), 'h-auto resize-none py-3 leading-snug')}
            />
          </Campo>

          {/* WhatsApp */}
          <Campo
            id={ID_CAMPO.contacto_whatsapp}
            label="WhatsApp"
            requerido={perdido}
            ayuda={perdido ? undefined : 'Opcional: si lo dejas, el dueño te podrá escribir.'}
            error={errores.contacto_whatsapp}
          >
            <div className={cn(claseInput(errores.contacto_whatsapp), 'flex items-center gap-2 px-0 focus-within:ring-2 focus-within:ring-slate-900')}>
              <span className="pl-4 text-base font-bold text-slate-700 select-none">+56 9</span>
              <input
                id={ID_CAMPO.contacto_whatsapp}
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={DIGITOS_WHATSAPP}
                value={whatsapp}
                onChange={(e) => setWhatsapp(soloDigitos(e.target.value).slice(0, DIGITOS_WHATSAPP))}
                placeholder="1234 5678"
                aria-invalid={Boolean(errores.contacto_whatsapp)}
                className="h-full min-w-0 flex-1 bg-transparent pr-4 text-base text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
          </Campo>

          {/* Recompensa (solo PERDIDO) */}
          {perdido && (
            <Campo id={ID_CAMPO.recompensa} label="Recompensa" ayuda="Opcional." error={errores.recompensa}>
              <div className={cn(claseInput(errores.recompensa), 'flex items-center gap-1 px-0 focus-within:ring-2 focus-within:ring-slate-900')}>
                <span className="pl-4 text-base font-bold text-slate-700 select-none">$</span>
                <input
                  id={ID_CAMPO.recompensa}
                  type="text"
                  inputMode="numeric"
                  value={recompensa ? miles.format(Number(recompensa)) : ''}
                  onChange={(e) => setRecompensa(soloDigitos(e.target.value).slice(0, 9))}
                  placeholder="0"
                  className="h-full min-w-0 flex-1 bg-transparent pr-4 text-base text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </Campo>
          )}

          {errorGeneral && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-base font-semibold text-red-800 ring-1 ring-red-200">
              {errorGeneral}
            </p>
          )}

          {/* Botón siempre visible; el degradado evita que el texto se asome detrás. */}
          <div className="sticky -bottom-4 -mx-5 -mb-4 bg-linear-to-t from-white from-75% to-white/0 px-5 pt-5 pb-4">
          <button
            type="submit"
            disabled={envio !== 'editando' || comprimiendo}
            className={cn(
              'flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-bold text-white shadow-lg transition-colors',
              envio === 'listo' ? 'bg-emerald-600' : perdido ? 'bg-red-600' : 'bg-emerald-600',
              'disabled:cursor-wait',
            )}
          >
            {envio === 'listo' ? (
              <CircleCheck className="size-6" aria-hidden />
            ) : envio === 'enviando' || comprimiendo ? (
              <LoaderCircle className="size-6 animate-spin" aria-hidden />
            ) : (
              <Send className="size-5" aria-hidden />
            )}
            {textoBoton}
          </button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  )
}

function claseInput(error?: string) {
  return cn(
    'h-12 w-full rounded-2xl bg-slate-100 px-4 text-base text-slate-900 placeholder:text-slate-400',
    'focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none focus-within:bg-white',
    error && 'bg-red-50 ring-2 ring-red-500',
  )
}

function ErrorCampo({ mensaje }: { mensaje?: string }) {
  return mensaje ? (
    <p role="alert" className="mt-1.5 text-sm font-semibold text-red-700">
      {mensaje}
    </p>
  ) : null
}

function Campo({
  id,
  label,
  requerido,
  ayuda,
  error,
  extra,
  children,
}: {
  id: string
  label: string
  requerido?: boolean
  ayuda?: string
  error?: string
  extra?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label htmlFor={id} className="text-base font-bold text-slate-900">
          {label} {requerido && <span className="text-red-600">*</span>}
        </label>
        {extra}
      </div>
      {children}
      {ayuda && !error && <p className="mt-1.5 text-sm text-slate-600">{ayuda}</p>}
      <ErrorCampo mensaje={error} />
    </div>
  )
}
