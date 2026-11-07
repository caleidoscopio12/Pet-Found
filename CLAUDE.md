# Proyecto: App Web Colaborativa de Mascotas Perdidas (Mapa + IA)

> Fuente original: `contexto/contexto.md`. Este archivo es la versión vigente (stack actualizado y roadmap de 5 fases).

## 1. Contexto del Proyecto
Aplicación web progresiva (PWA) gratuita, sin fines de lucro y de impacto comunitario local en Chile para localizar perros y gatos perdidos.
Al entrar, la pantalla principal es directamente el mapa interactivo en tiempo real. Conecta a dueños y vecinos mediante geolocalización y reconocimiento visual con Inteligencia Artificial.

## 2. Público Objetivo (Target Audience)
1. **Dueños en situación de estrés:** Personas que acaban de perder a su mascota. Necesitan abrir la app en el celular y publicar la alerta con radio de búsqueda en menos de 1 minuto.
2. **Vecinos en tránsito:** Personas en la calle que ven un perro o gato desorientado y tienen 30 segundos para sacar una foto, fijar el pin en su ubicación actual y publicar sin fricción.

## 3. Tono de Comunicación y Diseño (UX/UI)
* **Tono de voz:** Empático, solidario, directo y claro (Español de Chile cercano). Cero tecnicismos.
* **Interfaz (UI):** 100% Mobile-First. El mapa ocupa toda la pantalla (`100dvh`, no `100vh`, para que la barra del navegador móvil no lo corte) con botones flotantes grandes (FAB) en la parte inferior para ser operados con el pulgar bajo la luz del sol.
* **Código de colores en el mapa:**
  * **Rojo:** Mascota perdida (marcador central pulsante). Su círculo de radio de búsqueda **no se muestra de partida** (no saturar el mapa): aparece al abrir su ficha o con el botón "Ver radios".
  * **Ficha de detalle tipo "peek"** (`ReporteDetalleSheet.tsx`): abre a media pantalla (`FRACCION_FICHA_COMPACTA` en `frontend/src/lib/layout.ts`), no es modal ni oscurece el mapa, y se arrastra hacia arriba para ver todo. Al abrirla, el mapa encuadra el pin y el círculo COMPLETO en la mitad libre de arriba (`VolarA` en `MapaPrincipal.tsx`).
  * **Verde:** Mascota avistada en la calle (marcador puntual).

## 4. Funciones Principales (Core App)
Toda la experiencia ocurre sobre el mapa interactivo:

1. **Vista Principal (Mapa en Vivo):** Al abrir la web, solicita permiso GPS, centra el mapa en la ciudad del usuario y carga todos los reportes activos cercanos. Permite filtrar rápidamente entre "Todos", "Perdidos" y "Avistados".
   * **Panel "Ver lista"** (botón inferior izquierdo, `ListaReportesSheet.tsx`): cuando hay muchos puntos, tocar pin por pin no escala. Pestañas **Perdidos / Avistados** (abre en Avistados si ese es el filtro superior activo), buscador (nombre/descripción, sin importar tildes ni mayúsculas) y filtro Todas / Perros / Gatos. Al elegir una mascota, el mapa vuela a su pin y se abre su detalle.
2. **Flujo 1 - Reportar Avistamiento ("Vi una mascota"):**
   * Botón flotante abre un modal rápido (Drawer/Bottom Sheet).
   * El usuario sube/toma foto, confirma su ubicación GPS actual en el mapa, añade un comentario corto y publica.
3. **Flujo 2 - Reportar Pérdida ("Perdí mi mascota"):**
   * El usuario selecciona el punto donde se perdió y ajusta un control deslizante (slider) para definir el radio de búsqueda en metros/kilómetros (dibujando un círculo en el mapa).
   * Sube foto, nombre, descripción, teléfono de contacto (botón directo a WhatsApp) y recompensa opcional.
4. **Motor de Coincidencia IA (En segundo plano):**
   * Al subir cualquier reporte con foto, el sistema extrae el vector de características visuales (Embedding).
   * Compara automáticamente la foto con los reportes activos dentro del radio geográfico cercano.
   * Si hay alta similitud visual (ej. > 80%), notifica inmediatamente en pantalla y por alerta al dueño sobre la posible coincidencia.
5. **Perfil Simple ("Mis Reportes"):** Una pestaña ligera donde el usuario autenticado puede marcar su mascota como "¡Encontrada!" para limpiar el mapa.

## 5. Stack Tecnológico Oficial
Todo el stack es gratuito o tiene un plan gratis suficiente para un proyecto sin fines de lucro.

* **Frontend:** React 19 + Vite + **TypeScript** + Tailwind CSS v4 + shadcn/ui.
  * Componentes móviles tipo *Drawer/FAB* obtenidos de `21st.dev` (CLI `21st`, ver §6).
  * Animaciones: `motion` (motion/react). Primitivas accesibles: `@base-ui/react`. Iconos: `lucide-react`.
* **Mapas:** `react-leaflet` v5 + `leaflet` 1.9.x (no usar la 2.0 alpha).
  * Teselas: **CARTO Voyager** (`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=…`) con atribución a OpenStreetMap y CARTO. Mejor contraste bajo el sol que el OSM estándar.
  * ⚠️ CARTO **exige API key** (sin ella sirve teselas con marca de agua "API KEY REQUIRED"). Es gratis para proyectos sin fines de lucro hasta 5M teselas/mes y se pide sin cuenta en https://carto.com/basemaps/apikey. Va en `VITE_CARTO_API_KEY`; si está vacía, `MapaPrincipal.tsx` usa OSM estándar como respaldo.
* **Backend:** Node.js 22+ con Express 5 (API REST, ESM).
* **Base de Datos:** MongoDB Atlas (plan M0 gratis) con Mongoose.
  * `GeoJSON` (`Point` e índice `2dsphere`) para coordenadas `[longitud, latitud]` y consultas con `$nearSphere`.
  * `MongoDB Atlas Vector Search` (disponible en M0) para buscar similitud de coseno entre los embeddings de las fotos.
* **Imágenes:** Cloudinary (con compresión en el cliente antes de subir para ahorrar datos móviles).
  * La foto se sube **a través del backend** (`multer` en memoria, máx 5 MB, se revisan los primeros bytes para confirmar que es imagen) → `cloudinary.uploader.upload_stream` a la carpeta `pet-found/reportes`. Así el backend tiene los bytes para el embedding de la Fase 3.
  * Cliente: `browser-image-compression` (800 px, calidad 0.8, WebP o JPEG si el navegador no codifica WebP) en `frontend/src/lib/comprimirFoto.ts`.
* **Validación backend:** `zod` para la entrada HTTP (`backend/src/validation/reporte.js`) + Mongoose `strict: 'throw'`. Errores `{ ok:false, error, campos }` en español. `helmet`, CORS por `CORS_ORIGIN` y `express-rate-limit` (10 publicaciones/15 min por IP mientras no haya login).
* **IA de Reconocimiento:** `@huggingface/transformers` (**v4.3**, misma API que v3) con **`Xenova/clip-vit-base-patch32`** (torre de visión, `q8`, 512 dims), en el backend y gratis. `backend/src/services/embeddings.js`:
  * Se **precarga al arrancar** (`server.js`, con inferencia de calentamiento) antes de abrir el puerto; el modelo queda en `backend/.cache/modelos` (ignorado por git). Si no carga, la API funciona sin IA (`/api/health` → `ia: "desactivada"`).
  * Convierte siempre a RGB (`.rgb()`): PNG/WebP con transparencia o en grises fallaban sin eso.
  * Embedding normalizado L2 (coseno = producto punto), ~80 ms por foto de celular.
* **Motor de coincidencias** (`backend/src/services/coincidencias.js`), en `POST /api/reportes`: embedding ANTES de subir a Cloudinary → guardar → `$geoNear` (2dsphere) + coseno exacto en Node → `coincidencias` (máx. 3, misma especie, ≥ `UMBRAL_COINCIDENCIA`).
  * AVISTADO → PERDIDOS cuyo **propio radio** cubre el punto. PERDIDO → AVISTADOS dentro de su radio.
  * No se usa `$vectorSearch` en el POST: debe ser la 1.ª etapa y no admite filtro geoespacial. El índice `embedding_vector` (Atlas Vector Search, 512, coseno, filtros tipo/especie/estado/createdAt) existe y lo usa `db:similares` (búsqueda amplia). Ojo: su `score` es `(1+coseno)/2`.
  * Si la IA falla, el reporte se publica igual (sin embedding ni coincidencias).
  * Frontend: `CoincidenciaSheet.tsx` (alerta modal "¡Posible coincidencia!" tras publicar, fotos lado a lado, WhatsApp al dueño o al vecino).
* **Autenticación:** **Firebase Auth** (Google Sign-In, plan Spark gratis y sin pausas por inactividad). El backend valida el ID token con `firebase-admin`.

## 6. Reglas de Ejecución para Claude Code
1. Estructura el proyecto en dos carpetas claras dentro del mismo repositorio: `/frontend` y `/backend`.
2. Usa `21st.dev` para modales flotantes y tarjetas de mascotas que se vean como una app nativa en celulares.
   * Se usa el **CLI `21st`** (`21st search`, `21st get <id>`). En Windows `21st add` falla (no encuentra `npx`): usar `21st get <id> --json` y escribir el componente en `frontend/src/components/ui/`.
   * Plan gratis: **2 descargas de código por día** (`21st usage` para revisar). Las búsquedas son libres.
   * Componentes ya integrados: Drawer (wensity, id 31360) y FAB (motiondotdev, id 24691). Pendientes sugeridos: Slider (34775) para el radio en Fase 2.
3. Usa el MCP de `mongodb` para comprobar que los índices `2dsphere` estén bien creados.
4. Prioriza la velocidad de carga y la simplicidad: menos clics es siempre mejor.

## 7. Esquema Exacto de Base de Datos (Mongoose)
No inventes campos nuevos sin consultar. Usa estrictamente esta estructura para la colección `Reportes`:

- `tipo`: String, enum `['PERDIDO', 'AVISTADO']`, requerido.
- `especie`: String, enum `['PERRO', 'GATO']`, requerido.
- `estado`: String, enum `['ACTIVO', 'ENCONTRADO']`, default `'ACTIVO'`.
- `nombre_mascota`: String (opcional para avistamientos).
- `descripcion`: String, max 300 caracteres.
- `recompensa`: Number, default 0.
- `contacto_whatsapp`: String (formato `+569XXXXXXXX`).
- `foto_url`: String, requerido.
- `ubicacion`: {
    `type`: { type: String, enum: ['Point'], default: 'Point' },
    `coordinates`: { type: [Number], required: true } // ¡CRÍTICO!: Siempre guardar como [longitud, latitud]
  }
- `radio_metros`: Number (default 1000 para PERDIDO, 0 para AVISTADO).
- `embedding`: [Number] (Array de dimensiones generado por el modelo de IA para Vector Search).
- `createdAt`: Date, default Date.now (Configurar índice TTL o filtro para ocultar reportes mayores a 60 días).

El tipo TypeScript espejo vive en `frontend/src/types/reporte.ts`.

**Colección auxiliar `llaves_borrado`** (aprobada por el usuario, NO es parte de `Reportes`): `{ reporte: ObjectId (único), hash: sha256 hex, createdAt }`. Al publicar, `POST /api/reportes` devuelve `llaveBorrado` UNA sola vez; el teléfono la guarda en `localStorage` (`frontend/src/lib/misReportes.ts`) y `DELETE /api/reportes/:id` exige el header `X-Llave-Borrado`. Borra reporte, llave y foto de Cloudinary. Solo funciona desde el mismo navegador que publicó; los reportes sin llave (seed o publicados antes de este cambio) no se pueden borrar por la API. En la Fase 4 se reemplaza por el dueño autenticado.

## 8. Prevención de Errores Comunes (Guardrails Técnicos)
1. **Trampa de Coordenadas (Leaflet vs MongoDB):** Leaflet usa `[latitud, longitud]` en el frontend, pero MongoDB GeoJSON exige estrictamente `[longitud, latitud]`. Usa SIEMPRE las utilidades `toLeaflet` / `toGeoJSON` / `toGeoPoint` de `frontend/src/lib/geo.ts` y `backend/src/utils/geo.js` (con tests en `backend/src/utils/geo.test.js`).
2. **Bug de Iconos en React-Leaflet:** Al empaquetar con Vite, los iconos por defecto de Leaflet se rompen. Usar solo los `L.divIcon` con clases de Tailwind de `frontend/src/components/map/markerIcons.ts` (pin rojo pulsante para perdidos y verde para avistados). Nunca `L.Icon.Default`.
3. **Conexión a Atlas en Windows:** en esta máquina Node toma `127.0.0.1` como DNS y la búsqueda SRV de `mongodb+srv://` falla (`querySrv ECONNREFUSED`). `backend/src/db/conexion.js` reintenta solo en ese caso con 1.1.1.1/8.8.8.8. Si la URI no trae base, usa `mascotas` (no `test`).
4. **Teselas en señal inestable:** `MapaPrincipal.tsx` reintenta hasta 2 veces cada tesela que falla (Leaflet por defecto la deja en blanco).
5. **Leaflet tapa los overlays:** los paneles de Leaflet usan z-index 400–1000. El contenedor del mapa usa `isolate` para que FAB, filtros y Drawers queden siempre encima.
6. **Compresión en el Cliente:** Antes de enviar cualquier foto al backend/Cloudinary, comprímela en el navegador (usando `browser-image-compression`) a un máximo de 800px de ancho y formato WebP/JPEG al 80% de calidad. La app debe funcionar rápido con señal 3G/4G inestable.
7. **Fricción Cero en Autenticación:** No obligues a crear cuenta con contraseña para mirar el mapa. Usa Firebase Auth (Google Sign-In) solo en el momento en que el usuario intenta publicar un reporte.

## 9. Variables de Entorno (.env.example)
- Backend (`backend/.env.example`): `PORT`, `CORS_ORIGIN`, `UMBRAL_COINCIDENCIA` (default 0.85, calibrar con `db:calibrar`), `MONGODB_URI`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. `backend/src/config/env.js` las valida al arrancar.
- Frontend (`frontend/.env.example`): `VITE_API_URL`, `VITE_DEFAULT_LAT`, `VITE_DEFAULT_LNG` (centrar mapa por defecto en `[-35.333, -72.416]`), `VITE_CARTO_API_KEY`.
- Fase 4 agregará las llaves públicas de Firebase (`VITE_FIREBASE_*`) y la cuenta de servicio en el backend.

## 10. Plan de Construcción por Fases (Roadmap de Ejecución)
Avanza estrictamente en este orden y espera confirmación entre cada fase:

- **Fase 1 (Esqueleto y Mapa Mock) — ✅ hecha:** Monorepo (`/frontend` y `/backend`), mapa a pantalla completa con `react-leaflet` + CARTO Voyager, 3 mascotas de prueba (hardcoded, en formato GeoJSON) con círculos de radio, filtros, FAB expandible y bottom sheet de detalle con componentes de `21st`.
- **Fase 2 (Backend y Geo-Queries) — ✅ hecha:** MongoDB (`2dsphere`), `POST /api/reportes` y `GET /api/reportes/cercanos` (`$nearSphere`, solo `ACTIVO` y de los últimos 60 días por filtro, sin TTL), subida a Cloudinary con compresión en el cliente, y flujo de publicación: pin central fijo + "Mi ubicación" (GPS), slider de radio con círculo en vivo (PERDIDO) y formulario en Drawer. WhatsApp obligatorio en PERDIDO, opcional en AVISTADO.
- **Fase 3 (Motor de IA Vectorial) — ✅ implementada, falta fijar el umbral:** embeddings CLIP al publicar, coincidencias geo + coseno en ambas direcciones, índice `$vectorSearch` en Atlas y alerta en el frontend. Pendiente: correr `db:calibrar` con fotos reales (incluidas mascotas negras) y fijar `UMBRAL_COINCIDENCIA`.
- **Fase 4 (Autenticación y "Mis Reportes"):** Firebase Auth (Google) solo al publicar, validación del token en el backend, pestaña "Mis Reportes" para marcar "¡Encontrada!", aviso en pantalla de coincidencias de la IA y **chat interno vecino ↔ dueño** para avistamientos sin teléfono (propuesta: Firestore, gratis y en tiempo real).
- **Fase 5 (PWA y Despliegue):** Manifest + service worker (`vite-plugin-pwa`), caché de teselas y de la app para señal inestable, notificaciones, y despliegue gratuito (frontend en Vercel/Netlify/Cloudflare Pages, backend en un host con RAM suficiente para el modelo CLIP).

## 11. Comandos
- `npm run install:all` — instala raíz, backend y frontend.
- `npm run dev` — levanta API (http://localhost:4000/api) y web (http://localhost:5173) juntas.
- `npm run dev:movil` — igual, pero la web en **HTTPS** (certificado autofirmado de `@vitejs/plugin-basic-ssl`) y expuesta en la red local, para probar GPS y cámara desde el celular: `https://<IP-Wi-Fi-del-PC>:5173`. En ese modo el frontend llama a `/api` y Vite lo reenvía al backend (sin contenido mixto ni "localhost" del teléfono).
- `npm test` — tests del backend (`node --test` + supertest + mongodb-memory-server; Cloudinary falso).
- `npm --prefix backend run db:indices` — verifica el índice `2dsphere` y que `$nearSphere` lo use.
- `npm --prefix backend run db:seed` — carga los 3 reportes de prueba (sube sus fotos a Cloudinary).
- `npm --prefix backend run test:modelo` — tests con el modelo CLIP real (lento; no entra en `npm test`).
- `npm --prefix backend run db:calibrar [-- <carpeta>]` — matriz de similitud y umbral sugerido con fotos reales (`backend/calibracion/LEEME.md`).
- `npm --prefix backend run db:indice-vectorial` — crea/verifica el índice Atlas Vector Search `embedding_vector`.
- `npm --prefix backend run db:embeddings [-- --todos]` — calcula embeddings faltantes (o todos).
- `npm --prefix backend run db:similares -- <id> [--tipo=PERDIDO]` — búsqueda por parecido con `$vectorSearch`.
- `npm run build` — build de producción del frontend.
