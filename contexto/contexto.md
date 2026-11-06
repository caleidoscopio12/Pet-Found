# Proyecto: App Web Colaborativa de Mascotas Perdidas (Mapa + IA)

## 1. Contexto del Proyecto
Aplicación web progresiva (PWA) gratuita y de impacto comunitario local en Chile para localizar perros y gatos perdidos. 
Al entrar, la pantalla principal es directamente el mapa interactivo en tiempo real. Conecta a dueños y vecinos mediante geolocalización y reconocimiento visual con Inteligencia Artificial.

## 2. Público Objetivo (Target Audience)
1. **Dueños en situación de estrés:** Personas que acaban de perder a su mascota. Necesitan abrir la app en el celular y publicar la alerta con radio de búsqueda en menos de 1 minuto.
2. **Vecinos en tránsito:** Personas en la calle que ven un perro o gato desorientado y tienen 30 segundos para sacar una foto, fijar el pin en su ubicación actual y publicar sin fricción.

## 3. Tono de Comunicación y Diseño (UX/UI)
* **Tono de voz:** Empático, solidario, directo y claro (Español de Chile cercano). Cero tecnicismos.
* **Interfaz (UI):** 100% Mobile-First. El mapa ocupa toda la pantalla (`100vh`) con botones flotantes grandes (FAB) en la parte inferior para ser operados con el pulgar bajo la luz del sol.
* **Código de colores en el mapa:**
  * **Rojo:** Mascota perdida (marcador central + círculo de radio de búsqueda).
  * **Verde / Amarillo:** Mascota avistada en la calle (marcador puntual).

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
* **Frontend:** React.js (con Vite), Tailwind CSS y componentes móviles tipo *Drawer/Modal* obtenidos mediante el MCP de `21st.dev`.
* **Mapas:** `react-leaflet` con OpenStreetMap.
* **Backend:** Node.js con Express (API REST).
* **Base de Datos:** MongoDB Atlas con Mongoose.
  * `GeoJSON` (`Point` e índice `2dsphere`) para coordenadas `[longitud, latitud]` y consultas con `$nearSphere`.
  * `MongoDB Atlas Vector Search` para buscar similitud de coseno entre los embeddings de las fotos.
* **Imágenes:** Cloudinary (con compresión en el cliente antes de subir para ahorrar datos móviles).
* **IA de Reconocimiento:** `@tensorflow/tfjs-node` o `@xenova/transformers` (usando modelos ligeros como `MobileNet` o `CLIP`) ejecutándose en el backend para generar los vectores gratis sin pagar APIs externas.

## 6. Reglas de Ejecución para Claude Code
1. Estructura el proyecto en dos carpetas claras dentro del mismo repositorio: `/frontend` y `/backend`.
2. Usa el MCP de `21st` para crear modales flotantes y tarjetas de mascotas que se vean como una app nativa en celulares.
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

## 8. Prevención de Errores Comunes (Guardrails Técnicos)
1. **Trampa de Coordenadas (Leaflet vs MongoDB):** Leaflet usa `[latitud, longitud]` en el frontend, pero MongoDB GeoJSON exige estrictamente `[longitud, latitud]`. Crea una función utilitaria clara para invertirlas antes de guardar o leer de la API.
2. **Bug de Iconos en React-Leaflet:** Al empaquetar con Vite, los iconos por defecto de Leaflet suelen romperse. Configura desde el inicio iconos personalizados con `L.divIcon` usando clases de Tailwind CSS (ej. un pin rojo pulsante para perdidos y verde para avistados).
3. **Compresión en el Cliente:** Antes de enviar cualquier foto al backend/Cloudinary, comprímela en el navegador (usando `browser-image-compression`) a un máximo de 800px de ancho y formato WebP/JPEG al 80% de calidad. La app debe funcionar rápido con señal 3G/4G inestable.
4. **Fricción Cero en Autenticación:** No obligues a crear cuenta con contraseña para mirar el mapa. Usa autenticación rápida (Google Auth con Firebase/Supabase o un Magic Link / sesión local simplificada) solo en el momento en que el usuario intenta publicar un reporte.

## 9. Variables de Entorno (.env.example)
Genera desde el inicio los archivos `.env.example` en `/frontend` y `/backend` dejando claras las llaves necesarias:
- Backend: `PORT`, `MONGODB_URI`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- Frontend: `VITE_API_URL`, `VITE_DEFAULT_LAT`, `VITE_DEFAULT_LNG` (Centrar mapa por defecto en `[-35.333, -72.416]`).

## 10. Plan de Construcción por Fases (Roadmap de Ejecución)
No programes la Inteligencia Artificial ni Cloudinary en el primer paso. Avanza estrictamente en este orden y espera mi confirmación entre cada fase:
- **Fase 1 (Esqueleto y Mapa Mock):** Inicializar monorepo (`/frontend` y `/backend`), renderizar el mapa a pantalla completa con `react-leaflet` y mostrar 3 mascotas de prueba (hardcoded) con sus círculos de radio y modales de detalle usando componentes de `21st`.
- **Fase 2 (Backend y Geo-Queries):** Conectar MongoDB, crear endpoints `POST /api/reportes` y `GET /api/reportes/cercanos` usando `$nearSphere`, y conectar el formulario del frontend con subida de imágenes.
- **Fase 3 (Motor de IA Vectorial):** Integrar la extracción de embeddings al subir una foto y configurar el pipeline de agregación `$vectorSearch` en MongoDB para detectar coincidencias en el radio cercano.