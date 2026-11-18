// Lógica (pura, sin React) para las brechas por condición de pobreza del cruce.
// El motor R devuelve cada celda con level = "Condición / Subámbito"
// (p. ej. "No pobre / Urbano"); en el cruce nacional level es solo la condición.
// Se extrae de forma robusta (sin startsWith) y se agrupa por subámbito para
// calcular la brecha SIEMPRE dentro del mismo ámbito. Es testeable en aislamiento.

export const GAP_HIGH = "No pobre";
export const GAP_LOW = "Pobre extremo";

// Número finito o null (null, "", NaN → faltante). Ojo: +null === 0, por eso no
// basta con Number.isFinite(+v) para descartar un faltante.
function toNum(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Separa "Condición / Subámbito" en sus partes. Sin " / " (cruce nacional) el
// subámbito queda vacío. Tolera nombres con espacios (p. ej. "Madre de Dios").
export function splitCrossLevel(level) {
  const s = String(level == null ? "" : level);
  const i = s.indexOf(" / ");
  return i === -1
    ? { pov: s.trim(), sub: "" }
    : { pov: s.slice(0, i).trim(), sub: s.slice(i + 3).trim() };
}

// Agrupa las filas del cruce por subámbito y calcula, dentro de cada uno, la
// brecha descriptiva No pobre − Pobre extremo (en puntos porcentuales, el formato
// de todo indicador cruzable). No depende del orden de las filas. Omite un
// subámbito al que le falte alguno de los dos grupos o cuyo valor no sea numérico.
// Devuelve los valores sin redondear (el redondeo es cosa de la vista).
export function buildGaps(rows) {
  if (!Array.isArray(rows)) return [];
  const bySub = new Map();
  for (const r of rows) {
    if (!r || r.level == null) continue;
    const { pov, sub } = splitCrossLevel(r.level);
    if (!bySub.has(sub)) bySub.set(sub, {});
    bySub.get(sub)[pov] = r;
  }
  const gaps = [];
  for (const [sub, g] of bySub) {
    const hi = g[GAP_HIGH], lo = g[GAP_LOW];
    if (!hi || !lo) continue;                                   // subámbito incompleto
    const he = toNum(hi.estimate), le = toNum(lo.estimate);
    if (he == null || le == null) continue;                     // valor faltante
    gaps.push({
      sub,
      hi,
      lo,
      gap: he - le,                                             // No pobre − Pobre extremo (pp)
      unreliable: !!hi.unreliable || !!lo.unreliable,           // referencial si algún grupo lo es
    });
  }
  return gaps;
}
