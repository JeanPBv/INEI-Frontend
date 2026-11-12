// Formateo de números y etiquetas (locale es-PE) + helpers de color.

const NF = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const NF0 = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 });
const NF2 = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

export const n1 = (v) => (v == null || isNaN(v) ? "—" : NF.format(v));
export const n0 = (v) => (v == null || isNaN(v) ? "—" : NF0.format(v));
export const n2 = (v) => (v == null || isNaN(v) ? "—" : NF2.format(v));

// Valor de estimación según el formato del indicador.
export function fmtValue(v, format) {
  if (v == null || isNaN(v)) return "—";
  if (format === "porcentaje") return `${n1(v)}%`;
  if (format === "soles") return `S/ ${n0(v)}`;
  return n0(v);
}

export const unitSuffix = (format) =>
  format === "porcentaje" ? "%" : format === "soles" ? "S/" : "hogares";

// Nombre presentable para niveles que vienen en minúscula (área, región natural).
const PRETTY = {
  urbano: "Urbano", rural: "Rural",
  costa: "Costa", sierra: "Sierra", selva: "Selva",
};
export const prettyLevel = (s) => PRETTY[String(s).toLowerCase()] || s;

// Normaliza el nombre de departamento para casar con el GeoJSON (NOMBDEP en mayúsculas).
export const toGeoName = (s) =>
  String(s).toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Lee una variable CSS del tema actual (los charts necesitan colores concretos).
export function cssVar(name) {
  if (typeof window === "undefined") return "#000";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#000";
}
