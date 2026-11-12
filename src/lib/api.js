// Cliente de la API real (FastAPI). Normaliza las filas al shape del diseño
// (ic_inferior/ic_superior) y expone el request/response crudos para el panel JSON.

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
    return { ok: false, status: 0, url, body: null, error: { error: "sin_conexion", mensaje: String(e) } };
  }
  // FastAPI envuelve el detail de HTTPException en {detail: {...}}
  const error = res.ok ? null : (body && body.detail) || { error: "error", mensaje: res.statusText };
  return { ok: res.ok, status: res.status, url, body, error };
}

// --- Catálogo, ámbitos y años (metadatos) ---
export async function getCatalogo() {
  const r = await get("/indicadores");
  return r.ok ? r.body.data : [];
}
export async function getAmbitos() {
  const r = await get("/ambitos");
  return r.ok ? r.body.data : [];
}
export async function getAnios() {
  const r = await get("/anios");
  return r.ok ? r.body.data : [];
}

// Normaliza una fila del motor R al shape del diseño.
function normFila(f) {
  return {
    nivel: f.nivel,
    estimacion: f.estimacion,
    error_estandar: f.error_estandar,
    cv: f.cv,
    ic_inferior: f.ic_inferior ?? f.ic_inf,
    ic_superior: f.ic_superior ?? f.ic_sup,
    referencial: !!f.referencial,
    n_muestral: f.n_muestral,
  };
}

// Consulta principal: estimación o cruce. Devuelve también el request/response
// crudos (para el panel "Respuesta JSON de la API").
export async function consultar({ indicador, ambito, anio, cruce }) {
  const path = cruce ? "/cruces" : "/estimaciones";
  const params = cruce
    ? { indicador, ambito, anio, cruzar_por: "pobreza" }
    : { indicador, ambito, anio };
  const r = await get(path, params);
  return {
    ok: r.ok,
    status: r.status,
    url: r.url,
    request: `GET ${r.url.replace(API_BASE, "")}`,
    meta: r.ok ? r.body.meta : null,
    resultados: r.ok ? (r.body.data || []).map(normFila) : [],
    raw: r.body,
    error: r.error,
  };
}
