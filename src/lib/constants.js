// Constantes compartidas de la UI (ámbitos, condición de pobreza, vistas, unidades).

// Descripciones de ámbito para las opciones del filtro.
export const AMBITO_DESC = {
  nacional: "Una sola cifra para todo el país",
  area: "Urbano y rural",
  region_natural: "Costa, Sierra y Selva",
  departamento: "Los 25 departamentos (incluye Callao)",
};
export const AMBITO_ORDEN = ["nacional", "area", "region_natural", "departamento"];

// Condición de pobreza: orden y color (variable CSS) de los 3 tonos del cruce.
export const POBREZA_ORDEN = ["Pobre extremo", "Pobre no extremo", "No pobre"];
export const POBREZA_VAR = { "Pobre extremo": "--p1", "Pobre no extremo": "--p2", "No pobre": "--p3" };

// Vistas de la app (menú del sidebar + título/descripción del TopBar).
export const VIEWS = [
  { grupo: "Análisis", path: "/consulta", icon: "BarChart3", label: "Consulta",
    desc: "Una cifra por ámbito, con su confiabilidad", ready: true },
  { grupo: "Análisis", path: "/mapa", icon: "Map", label: "Mapa",
    desc: "Indicador por departamento en el mapa del Perú", ready: true },
  // Ocultas del sidebar temporalmente (pendientes de diseño). Reactivar quitando el comentario:
  // { grupo: "Análisis", path: "/comparar", icon: "TrendingUp", label: "Comparar / Tendencia",
  //   desc: "Comparar entre años o ámbitos", ready: false },
  // { grupo: "Referencia", path: "/catalogo", icon: "BookOpen", label: "Catálogo",
  //   desc: "Ficha de cada indicador", ready: false },
  // { grupo: "Referencia", path: "/datos", icon: "Database", label: "Datos / Años",
  //   desc: "Años de la ENAHO cargados en el servicio", ready: true },
  { grupo: "Referencia", path: "/docs", icon: "FileCode", label: "Documentación",
    desc: "Cómo consumir la API", ready: false },
];

// Etiqueta larga de unidad (para el chip de cabecera).
export const UNIDAD_TXT = { porcentaje: "Porcentaje (%)", soles: "Soles (S/)", conteo: "Hogares (conteo)" };
