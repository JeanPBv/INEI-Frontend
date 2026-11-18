// Cliente de la API (FastAPI). Normaliza las filas y expone el request/response
// crudos para el panel JSON.

export const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

async function get(path, params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );
  const qs = new URLSearchParams(clean).toString();
  const url = `${API_BASE}${path}${qs ? "?" + qs : ""}`;
  let res, body;
  try {
    res = await fetch(url);
    body = await res.json().catch(() => ({}));
  } catch (e) {
    return { ok: false, status: 0, url, body: null, error: { error: "no_connection", message: String(e) } };
  }
  // FastAPI envuelve el detail de HTTPException en {detail: {...}}.
  const error = res.ok ? null : (body && body.detail) || { error: "error", message: res.statusText };
  return { ok: res.ok, status: res.status, url, body, error };
}

export async function getCatalog() {
  const r = await get("/indicators");
  return r.ok ? r.body.data : [];
}
export async function getLevels() {
  const r = await get("/levels");
  return r.ok ? r.body.data : [];
}
export async function getYears() {
  const r = await get("/years");
  return r.ok ? r.body.data : [];
}

function normRow(f) {
  return {
    level: f.level,
    estimate: f.estimate,
    standard_error: f.standard_error,
    cv: f.cv,
    ci_lower: f.ci_lower,
    ci_upper: f.ci_upper,
    unreliable: !!f.unreliable,
    sample_size: f.sample_size,
  };
}

// Desglose por etiquetas de un indicador dentro de un subámbito (drill-down).
// subgroup vacío = desglose nacional.
export async function distribution({ indicator, level, subgroup, year }) {
  const r = await get("/distribution", { indicator, level, subgroup, year });
  return {
    ok: r.ok,
    status: r.status,
    url: r.url,
    request: `GET ${r.url.replace(API_BASE, "")}`,
    meta: r.ok ? r.body.meta : null,
    rows: r.ok ? (r.body.data || []).map(normRow) : [],
    raw: r.body,
    error: r.error,
  };
}

// Consulta principal: estimación o cruce. Devuelve también el request/response crudos.
export async function query({ indicator, level, year, cross }) {
  const path = cross ? "/crosstabs" : "/estimates";
  const params = cross
    ? { indicator, level, year, cross_by: "pobreza" }
    : { indicator, level, year };
  const r = await get(path, params);
  return {
    ok: r.ok,
    status: r.status,
    url: r.url,
    request: `GET ${r.url.replace(API_BASE, "")}`,
    meta: r.ok ? r.body.meta : null,
    rows: r.ok ? (r.body.data || []).map(normRow) : [],
    raw: r.body,
    error: r.error,
  };
}
