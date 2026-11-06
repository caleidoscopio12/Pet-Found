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
  * **Rojo:** Mascota perdida (marcador central pulsante + círculo de radio de búsqueda).
  * **Verde:** Mascota avistada en la calle (marcador puntual).

## 4. Funciones Principales (Core App)
Toda la experiencia ocurre sobre el mapa interactivo:

1. **Vista Principal (Mapa en Vivo):** Al abrir la web, solicita permiso GPS, centra el mapa en la ciudad del usuario y carga todos los reportes activos cercanos. Permite filtrar rápidamente entre "Todos", "Perdidos" y "Avistados".
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
* **IA de Reconocimiento:** **`@huggingface/transformers` v3** (sucesor oficial de `@xenova/transformers`) con un modelo **CLIP** (ej. `Xenova/clip-vit-base-patch32`), ejecutándose en el backend para generar los vectores gratis sin pagar APIs externas. CLIP está hecho para comparar imágenes por similitud, por eso se prefiere sobre MobileNet.
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

## 8. Prevención de Errores Comunes (Guardrails Técnicos)
1. **Trampa de Coordenadas (Leaflet vs MongoDB):** Leaflet usa `[latitud, longitud]` en el frontend, pero MongoDB GeoJSON exige estrictamente `[longitud, latitud]`. Usa SIEMPRE las utilidades `toLeaflet` / `toGeoJSON` / `toGeoPoint` de `frontend/src/lib/geo.ts` y `backend/src/utils/geo.js` (con tests en `backend/src/utils/geo.test.js`).
2. **Bug de Iconos en React-Leaflet:** Al empaquetar con Vite, los iconos por defecto de Leaflet se rompen. Usar solo los `L.divIcon` con clases de Tailwind de `frontend/src/components/map/markerIcons.ts` (pin rojo pulsante para perdidos y verde para avistados). Nunca `L.Icon.Default`.
3. **Leaflet tapa los overlays:** los paneles de Leaflet usan z-index 400–1000. El contenedor del mapa usa `isolate` para que FAB, filtros y Drawers queden siempre encima.
4. **Compresión en el Cliente:** Antes de enviar cualquier foto al backend/Cloudinary, comprímela en el navegador (usando `browser-image-compression`) a un máximo de 800px de ancho y formato WebP/JPEG al 80% de calidad. La app debe funcionar rápido con señal 3G/4G inestable.
5. **Fricción Cero en Autenticación:** No obligues a crear cuenta con contraseña para mirar el mapa. Usa Firebase Auth (Google Sign-In) solo en el momento en que el usuario intenta publicar un reporte.

## 9. Variables de Entorno (.env.example)
- Backend (`backend/.env.example`): `PORT`, `MONGODB_URI`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- Frontend (`frontend/.env.example`): `VITE_API_URL`, `VITE_DEFAULT_LAT`, `VITE_DEFAULT_LNG` (centrar mapa por defecto en `[-35.333, -72.416]`), `VITE_CARTO_API_KEY`.
- Fase 4 agregará las llaves públicas de Firebase (`VITE_FIREBASE_*`) y la cuenta de servicio en el backend.

## 10. Plan de Construcción por Fases (Roadmap de Ejecución)
Avanza estrictamente en este orden y espera confirmación entre cada fase:

- **Fase 1 (Esqueleto y Mapa Mock) — ✅ hecha:** Monorepo (`/frontend` y `/backend`), mapa a pantalla completa con `react-leaflet` + CARTO Voyager, 3 mascotas de prueba (hardcoded, en formato GeoJSON) con círculos de radio, filtros, FAB expandible y bottom sheet de detalle con componentes de `21st`.
- **Fase 2 (Backend y Geo-Queries):** Conectar MongoDB, crear endpoints `POST /api/reportes` y `GET /api/reportes/cercanos` usando `$nearSphere`, formularios de pérdida/avistamiento (slider de radio) y subida de imágenes a Cloudinary con compresión en el cliente.
- **Fase 3 (Motor de IA Vectorial):** Extraer embeddings CLIP con `@huggingface/transformers` al subir una foto y configurar `$vectorSearch` en MongoDB para detectar coincidencias en el radio cercano.
- **Fase 4 (Autenticación y "Mis Reportes"):** Firebase Auth (Google) solo al publicar, validación del token en el backend, pestaña "Mis Reportes" para marcar "¡Encontrada!" y aviso en pantalla de coincidencias de la IA.
- **Fase 5 (PWA y Despliegue):** Manifest + service worker (`vite-plugin-pwa`), caché de teselas y de la app para señal inestable, notificaciones, y despliegue gratuito (frontend en Vercel/Netlify/Cloudflare Pages, backend en un host con RAM suficiente para el modelo CLIP).

## 11. Comandos
- `npm run install:all` — instala raíz, backend y frontend.
- `npm run dev` — levanta API (http://localhost:4000/api) y web (http://localhost:5173) juntas.
- `npm test` — tests del backend (`node --test`).
- `npm run build` — build de producción del frontend.
