// Constantes compartidas de la UI. Las claves van en inglés; los valores que ve
// el usuario quedan en español.

// Descripción de cada nivel para las opciones del filtro.
export const LEVEL_DESC = {
  nacional: "Una sola cifra para todo el país",
  area: "Urbano y rural",
  region_natural: "Costa, Sierra y Selva",
  departamento: "Los 25 departamentos (incluye Callao)",
};
export const LEVEL_ORDER = ["nacional", "area", "region_natural", "departamento"];

// Condición de pobreza: orden y color (variable CSS) de los 3 tonos del cruce.
export const POVERTY_ORDER = ["Pobre extremo", "Pobre no extremo", "No pobre"];
export const POVERTY_VAR = { "Pobre extremo": "--p1", "Pobre no extremo": "--p2", "No pobre": "--p3" };

// Vistas de la app (menú del sidebar + título/descripción del TopBar).
export const VIEWS = [
  { group: "Análisis", path: "/consulta", icon: "BarChart3", label: "Consulta",
    desc: "Explora indicadores de la ENAHO por año y ámbito geográfico", ready: true },
  { group: "Análisis", path: "/mapa", icon: "Map", label: "Mapa",
    desc: "Indicador por departamento en el mapa del Perú", ready: true },
  // Ocultas del sidebar temporalmente (pendientes de diseño). Reactivar quitando el comentario:
  // { group: "Análisis", path: "/comparar", icon: "TrendingUp", label: "Comparar / Tendencia",
  //   desc: "Comparar entre años o ámbitos", ready: false },
  // { group: "Referencia", path: "/catalogo", icon: "BookOpen", label: "Catálogo",
  //   desc: "Ficha de cada indicador", ready: false },
  // { group: "Referencia", path: "/datos", icon: "Database", label: "Datos / Años",
  //   desc: "Años de la ENAHO cargados en el servicio", ready: true },
  { group: "Referencia", path: "/docs", icon: "FileCode", label: "Documentación",
    desc: "Cómo consumir la API", ready: false },
];

// Etiqueta larga de unidad (para el chip de cabecera).
export const UNIT_LABEL = { porcentaje: "Porcentaje (%)", soles: "Soles (S/)", conteo: "Hogares (conteo)" };

// Nombre mostrado de cada módulo de la ENAHO (para agrupar indicadores).
export const MODULE_LABEL = {
  vivienda: "Vivienda", sumaria: "Sumaria",
  educacion: "Educación", salud: "Salud", empleo: "Empleo",
};
