# Front — Portal del servicio ENAHO

Portal web (React + Vite + ECharts) que consume la API del back y muestra los indicadores de la
ENAHO: tarjeta KPI, barras Sí/No, mapa coroplético del Perú, cruces por pobreza, tabla ordenable y
la respuesta JSON de cada consulta. Tema claro/oscuro.

Corre en `http://127.0.0.1:5173` y necesita el back levantado en `http://127.0.0.1:8000`.

## Requisitos

Solo Node.js 18 o superior (incluye `npm`): https://nodejs.org/. Todo lo demás (React, ECharts,
React Router) lo instala `npm install`.

## Instalar y levantar

**1. Consigue el proyecto.** Clónalo con Git (o descarga el `.zip` desde GitHub y descomprímelo), y
abre una terminal dentro de la carpeta:

```bash
git clone https://github.com/JeanPBv/INEI-Frontend.git
cd INEI-Frontend
```

Esa carpeta `INEI-Frontend` es el portal; en esta guía la llamamos `front/`. Todos los comandos se
corren **desde ahí**. (Si lo bajaste como `.zip`, descomprímelo y entra a esa carpeta.)

**2. Instala las dependencias y levanta el portal:**

```bash
npm install
npm run dev
```

La primera vez, `npm install` baja las dependencias (un par de minutos). Cuando el servidor
arranque, abre `http://127.0.0.1:5173`.

Levanta primero el back y luego el front. Si abres el front sin el back, verás el aviso
"No se pudo conectar con la API".

## Apuntar a otra URL del back

Por defecto el front llama a `http://127.0.0.1:8000`. Si tu back corre en otra dirección o puerto,
crea un archivo `.env.local` en `front/` con:

```
VITE_API_BASE=http://127.0.0.1:8001
```

y reinicia `npm run dev`. El back acepta CORS desde cualquier origen, así que no hay que configurar
nada más.

## Cómo se usa

- **Consulta** — elige indicador, ámbito (nacional, área, región natural o departamento) y año, y
  pulsa Consultar. Los filtros quedan en la URL, así que el enlace de una consulta se puede
  compartir.
- **Mapa** — el indicador por departamento sobre el mapa del Perú, con el ranking al lado (al pasar
  el mouse por uno se resalta en el otro).
- **Documentación** — guía de uso del servicio y de la API, con las tablas de indicadores y años
  generadas en vivo desde la API.
- Arriba a la derecha se cambia entre tema Claro y Oscuro.
- Las estimaciones poco confiables (CV > 15 %) se marcan como referenciales (ícono ▲, color ocre,
  borde punteado).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente (`http://127.0.0.1:5173`) |
| `npm run build` | Compila la versión de producción en `dist/` |
| `npm run preview` | Sirve localmente lo que haya en `dist/` |

## Problemas frecuentes

- "No se pudo conectar con la API" → el back no está levantado, o está en otra URL (ver "Apuntar a
  otra URL del back").
- El puerto 5173 está ocupado → Vite ofrece otro automáticamente, o fuérzalo con
  `npm run dev -- --port 5174`.
- El mapa no se colorea → revisa que exista `public/geo/peru_departamentos.geojson` (viene en el
  repo).
- Fuentes o estilos raros en la primera carga → recarga la página; en desarrollo a veces tardan en
  aplicarse las fuentes.

El GeoJSON del mapa proviene del repositorio público *juaneladio/peru-geojson*. Conviene revisar su
licencia antes de publicar el portal.

## Estructura

```
front/
├─ index.html
├─ public/geo/peru_departamentos.geojson   Mapa de los 25 departamentos
└─ src/
   ├─ main.jsx          Punto de entrada (providers + router + estilos)
   ├─ App.jsx           Shell: layout + rutas
   ├─ layout/           Sidebar (navegación) y TopBar (título + tema)
   ├─ views/            Consulta, Mapa, Datos, Documentacion, Proximamente
   ├─ components/       FilterBar, charts (ECharts), results (KPI, tabla, JSON…)
   ├─ lib/              api.js (cliente) · theme.jsx (tema) · constants.js · format.js
   └─ styles/           tokens.css (colores del diseño) + app.css
```
