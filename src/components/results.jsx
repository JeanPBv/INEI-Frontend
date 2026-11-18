// Cabecera de resultados, tarjeta KPI, banner de brecha, tabla, panel JSON y estados.
import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, FileWarning, Loader2, Download,
  RefreshCw, Wallet, Droplet, Briefcase, HeartPulse, GraduationCap } from "lucide-react";
import { n1, n0, n2, fmtValue, prettyLevel } from "../lib/format.js";
import { buildGaps } from "../lib/gaps.js";
import InfoTip from "./InfoTip.jsx";

// Glosario breve para las ayudas contextuales (evita jerga sin explicación).
const GLOSS = {
  ee: "Mide cuánto puede variar una estimación por calcularse con una muestra y no con toda la población. En general, cuanto menor es, mayor es la precisión.",
  cv: "Relaciona el error estándar con el tamaño de la estimación: un valor bajo indica mayor precisión relativa. Aquí la cifra se marca como referencial cuando supera el 15%.",
  ic: "Rango que expresa la incertidumbre de la estimación. Un intervalo al 95% está construido para cubrir el valor poblacional en aproximadamente el 95% de las muestras repetidas bajo las mismas condiciones.",
  muestra: "Número de registros de la muestra (hogares o personas, según el indicador) usados en el cálculo, dentro del universo elegible.",
  confiable: "Evalúa la precisión muestral según el criterio de CV ≤ 15%. No garantiza por sí solo la ausencia de otros errores (sesgos, denominadores o variables).",
  pp: "Un punto porcentual (pp) es la diferencia aritmética entre dos porcentajes. El error estándar de una proporción se expresa en pp.",
};

export function Chip({ kind = "", icon: Icon, children }) {
  return (
    <span className={`chip ${kind}`}>
      {Icon && <Icon size={13} />} {children}
    </span>
  );
}

function QualityChip({ isUnreliable }) {
  return isUnreliable
    ? <Chip kind="warn" icon={AlertTriangle}>Referencial</Chip>
    : <Chip kind="ok" icon={CheckCircle2}>Confiable</Chip>;
}

// Cabecera
export function ResultHeader({ title, levelTag, year, cross, unitText, request, onCsv }) {
  return (
    <div className="result-head">
      <div>
        <h2>{title}</h2>
        <div className="chips">
          <Chip>{levelTag}</Chip>
          <Chip>{year}</Chip>
          {cross && <Chip>Comparación · pobreza</Chip>}
          <Chip kind="ci">IC 95%</Chip>
          <Chip>{unitText}</Chip>
        </div>
        {/* Endpoint oculto para el usuario final (evita confusión). Reactivar quitando el comentario:
        {request && <div className="req-url mono">{request}</div>} */}
      </div>
      {onCsv && (
        <div className="chips">
          <button className="btn btn-sm" onClick={() => onCsv("csv")}>
            <Download size={14} /> Descargar CSV
          </button>
        </div>
      )}
    </div>
  );
}

// Tarjeta KPI (nacional sin cruce). `year`, `universe` y `posLabel`/`negLabel`
// son opcionales; enriquecen la lectura sin afectar el cálculo.
export function KpiCard({ row, format, title, year, universe, posLabel, negLabel }) {
  const isPct = format === "porcentaje";
  const cvOver = row.cv > 15;
  const val = isPct ? n1(row.estimate) : n0(row.estimate);
  const t = (title || "").toLowerCase();
  const when = year ? `En ${year}, ` : "";

  // Interpretación en lenguaje natural, con plantilla propia por tipo de indicador.
  const reading = isPct
    ? `${when}${t} a nivel nacional se estimó en ${val}%. `
      + `El intervalo de confianza al 95% va de ${n1(row.ci_lower)}% a ${n1(row.ci_upper)}%. `
      + (cvOver
          ? `Su precisión muestral no alcanza el criterio de referencia (CV ${n1(row.cv)}%), por lo que la cifra debe interpretarse con cautela.`
          : `Su precisión muestral cumple el criterio de referencia (CV ${n1(row.cv)}%).`)
    : format === "soles"
      ? `${when}${t} a nivel nacional se estimó en ${fmtValue(row.estimate, format)}. `
        + `El intervalo de confianza al 95% va de ${fmtValue(row.ci_lower, format)} a ${fmtValue(row.ci_upper, format)} (CV ${n1(row.cv)}%).`
      : `${when}${t} a nivel nacional se estimó en ${fmtValue(row.estimate, format)}. `
        + `El intervalo de confianza al 95% va de ${fmtValue(row.ci_lower, format)} a ${fmtValue(row.ci_upper, format)} (CV ${n1(row.cv)}%).`;

  // Etiquetas de la barra: específicas si se conocen y son exhaustivas; si no, Sí/No.
  const siLbl = posLabel || "Sí";
  const noLbl = negLabel || "No";

  return (
    <div className={`card pad kpi ${row.unreliable ? "ref" : ""}`}>
      <div>
        <div className="kpi-val mono">
          {format === "soles" && <small>S/ </small>}{val}
          {isPct && <small>%</small>}
        </div>
        <div className="kpi-ci mono">
          Intervalo de confianza al 95%: {isPct
            ? `${n1(row.ci_lower)}% a ${n1(row.ci_upper)}%`
            : `${fmtValue(row.ci_lower, format)} a ${fmtValue(row.ci_upper, format)}`}
          <InfoTip label="el intervalo de confianza">{GLOSS.ic}</InfoTip>
        </div>
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 2 }}>
          <QualityChip isUnreliable={row.unreliable} />
          <InfoTip label="confiable / referencial">{GLOSS.confiable}</InfoTip>
        </div>

        {isPct && (
          <div className="sino">
            <div className={`sino-bar ${row.unreliable ? "ref" : ""}`}>
              <div className="si" style={{ width: `${row.estimate}%` }} />
              <div className="no" style={{ width: `${100 - row.estimate}%` }} />
            </div>
            <div className="sino-leg">
              <span>{siLbl} {n1(row.estimate)}%</span>
              <span>{noLbl} {n1(100 - row.estimate)}%</span>
            </div>
          </div>
        )}
        <div className="kpi-read">{reading}</div>
      </div>

      <dl>
        <dt>Error estándar <InfoTip align="right" label="el error estándar">{GLOSS.ee}</InfoTip></dt>
        <dd className="mono">{isPct ? `${n2(row.standard_error)} pp` : n2(row.standard_error)}</dd>
        <dt>Precisión (CV) <InfoTip align="right" label="el coeficiente de variación">{GLOSS.cv}</InfoTip></dt>
        <dd className="mono">{n1(row.cv)}%
          <div className={`meter ${cvOver ? "over" : ""}`}>
            <i style={{ width: `${Math.min(100, (row.cv / 20) * 100)}%` }} />
            <span className="thr" style={{ left: "75%" }} />
          </div>
        </dd>
        <dt>Tamaño de la muestra <InfoTip align="right" label="el tamaño de la muestra">{GLOSS.muestra}</InfoTip></dt>
        <dd className="mono">{n0(row.sample_size)}</dd>
        {universe && (<><dt>Universo</dt><dd>{universe}</dd></>)}
        <dt>Nivel de confianza</dt><dd className="mono">95%</dd>
      </dl>
    </div>
  );
}

// Brechas por condición de pobreza (cruce). Agrupa por subámbito y calcula la
// diferencia No pobre − Pobre extremo DENTRO de cada ámbito. Nacional/área/región
// → tarjetas; departamento → tabla compacta, ordenable y con buscador.
// La diferencia se presenta como DESCRIPTIVA: no se infiere significancia del
// solape de IC individuales (eso exigiría un contraste con el diseño muestral).
export function GapBanner({ rows, level }) {
  const gaps = buildGaps(rows);
  if (!gaps.length) return null;
  const asTable = level === "departamento" || gaps.length > 4;
  return (
    <div className="gaps">
      {asTable
        ? <GapTable gaps={gaps} />
        : <div className="gap-cards">{gaps.map((g) => <GapCard key={g.sub || "nacional"} g={g} />)}</div>}
      <p className="gap-note">
        Las brechas son <b>diferencias descriptivas</b> en puntos porcentuales (No pobre − Pobre extremo),
        calculadas dentro de cada ámbito. Para afirmar significancia estadística se requiere un contraste
        que considere el diseño muestral (estratos, conglomerados y ponderadores); no se infiere del solape
        de los IC 95% individuales. <b>▲</b> = referencial (CV &gt; 15% en algún grupo).
      </p>
    </div>
  );
}

// Flecha + palabra para el sentido (no se comunica solo con color).
function gapDir(gap) {
  return gap >= 0
    ? { arrow: "↑", phrase: "supera a" }
    : { arrow: "↓", phrase: "queda por debajo de" };
}

// Tarjeta de brecha de un subámbito (o nacional).
function GapCard({ g }) {
  const name = g.sub ? prettyLevel(g.sub) : "Nacional";
  const d = gapDir(g.gap);
  return (
    <div className={`gap-card ${g.unreliable ? "ref" : ""}`}>
      <div className="gap-card-head">
        <span className="gap-sub">{name}</span>
        {g.unreliable && <Chip kind="warn" icon={AlertTriangle}>Referencial</Chip>}
      </div>
      <div className="gap-val mono">
        <span className="gap-arrow" aria-hidden="true">{d.arrow}</span>{n1(Math.abs(g.gap))} <small>pp</small>
      </div>
      <p className="gap-dir">No pobre {d.phrase} Pobre extremo</p>
      <dl className="gap-nums">
        <div><dt>No pobre</dt><dd className="mono">{n1(g.hi.estimate)}%</dd></div>
        <div><dt>Pobre extremo</dt><dd className="mono">{n1(g.lo.estimate)}%</dd></div>
      </dl>
    </div>
  );
}

// Tabla de brechas por departamento: ordenable y con buscador por nombre.
const GAP_COLS = [
  { key: "sub",  label: "Departamento", num: false },
  { key: "hi",   label: "No pobre",      num: true },
  { key: "lo",   label: "Pobre extremo", num: true },
  { key: "gap",  label: "Brecha (pp)",   num: true },
  { key: "dir",  label: "Sentido",       num: false },
];
function GapTable({ gaps }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ key: "gap", dir: "desc" });
  const onSort = (c) => setSort((s) =>
    s.key === c.key ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" }
                    : { key: c.key, dir: c.num ? "desc" : "asc" });
  const val = (g, k) => k === "hi" ? g.hi.estimate : k === "lo" ? g.lo.estimate : g.gap;

  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? gaps.filter((g) => prettyLevel(g.sub).toLowerCase().includes(needle))
    : gaps;
  const sorted = [...filtered].sort((a, b) => {
    if (sort.key === "sub" || sort.key === "dir") {
      const av = prettyLevel(a.sub), bv = prettyLevel(b.sub);
      return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return sort.dir === "asc" ? val(a, sort.key) - val(b, sort.key) : val(b, sort.key) - val(a, sort.key);
  });
  const arrow = (k) => sort.key === k ? (sort.dir === "asc" ? " ▲" : " ▼") : "";

  return (
    <div className="card pad">
      <div className="gap-search">
        <label htmlFor="gap-q" className="tbl-note" style={{ display: "block", margin: "0 0 6px" }}>
          Brecha No pobre − Pobre extremo por departamento (dentro de cada uno). Haz clic en una columna para ordenar.
        </label>
        <input id="gap-q" type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar departamento…" aria-label="Buscar departamento" />
      </div>
      <div className="tablebox">
        <table className="res">
          <thead>
            <tr>
              {GAP_COLS.map((c) => (
                <th key={c.key} scope="col"
                  aria-sort={sort.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                  onClick={() => onSort(c)} style={{ cursor: "pointer", userSelect: "none" }}
                  title="Ordenar por esta columna">
                  {c.label}{arrow(c.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((g) => {
              const d = gapDir(g.gap);
              return (
                <tr key={g.sub} className={g.unreliable ? "ref" : ""}>
                  <th scope="row" className="lvl">{prettyLevel(g.sub)}{g.unreliable ? " ▲" : ""}</th>
                  <td>{n1(g.hi.estimate)}%</td>
                  <td>{n1(g.lo.estimate)}%</td>
                  <td>{n1(Math.abs(g.gap))}</td>
                  <td><span aria-hidden="true">{d.arrow}</span> No pobre {g.gap >= 0 ? "mayor" : "menor"}</td>
                </tr>
              );
            })}
            {!sorted.length && (
              <tr><td colSpan={GAP_COLS.length} style={{ textAlign: "center", color: "var(--muted)" }}>
                Sin departamentos que coincidan.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Tabla (columnas ordenables: clic en la cabecera)
const TABLE_COLS = [
  { key: "level", label: "Nivel", num: false },
  { key: "estimate", label: "Estimación", num: true },
  { key: "standard_error", label: "Error estándar", num: true },
  { key: "cv", label: "CV", num: true },
  { key: "ci_lower", label: "IC inferior", num: true },
  { key: "ci_upper", label: "IC superior", num: true },
  { key: "unreliable", label: "Referencial", num: true },
  { key: "sample_size", label: "n muestral", num: true },
];

export function ResultsTable({ rows, format }) {
  const isPct = format === "porcentaje";
  // sort.key === null → orden original (como lo devuelve la API).
  const [sort, setSort] = useState({ key: null, dir: "asc" });

  // Primer clic: numérico de mayor a menor, texto de A a Z. Siguiente clic: invierte.
  const onSort = (c) => setSort((s) =>
    s.key === c.key
      ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" }
      : { key: c.key, dir: c.num ? "desc" : "asc" });

  const sorted = sort.key == null ? rows : [...rows].sort((a, b) => {
    if (sort.key === "level") {
      const av = prettyLevel(a.level), bv = prettyLevel(b.level);
      return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    const av = Number(a[sort.key]) || 0, bv = Number(b[sort.key]) || 0;
    return sort.dir === "asc" ? av - bv : bv - av;
  });

  const arrow = (k) => sort.key === k ? (sort.dir === "asc" ? " ▲" : " ▼") : "";

  return (
    <div className="card pad">
      <p className="tbl-note">
        Estimación, CV e IC en {isPct ? "%" : format === "soles" ? "S/" : "conteo"};
        error estándar en {isPct ? "puntos porcentuales" : "las mismas unidades"}; n muestral en hogares/personas.
        <br />Haz clic en una columna para ordenar.
      </p>
      <div className="tablebox">
        <table className="res">
          <thead>
            <tr>
              {TABLE_COLS.map((c) => (
                <th key={c.key} scope="col"
                  aria-sort={sort.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                  onClick={() => onSort(c)}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  title="Ordenar por esta columna">
                  {c.label}{arrow(c.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={i} className={r.unreliable ? "ref" : ""}>
                <th scope="row" className="lvl">{prettyLevel(r.level)}</th>
                <td>{fmtValue(r.estimate, format)}</td>
                <td>{n2(r.standard_error)}</td>
                <td>{n1(r.cv)}%</td>
                <td>{fmtValue(r.ci_lower, format)}</td>
                <td>{fmtValue(r.ci_upper, format)}</td>
                <td>{r.unreliable ? "Sí ▲" : <span style={{ color: "var(--muted)" }}>No</span>}</td>
                <td>{n0(r.sample_size)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Panel JSON
function paint(json) {
  const esc = json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (m) => {
      let cls = "n";
      if (/^"/.test(m)) cls = /:$/.test(m) ? "k" : "s";
      else if (/true|false|null/.test(m)) cls = "b";
      return `<span class="${cls}">${m}</span>`;
    }
  );
}
export function JsonPanel({ status, data }) {
  const txt = JSON.stringify(data, null, 2);
  return (
    <details className="json">
      <summary>
        <span style={{ fontWeight: 600 }}>Respuesta JSON de la API</span>
        <Chip kind={status >= 400 ? "warn" : "ok"}>{status} {status >= 400 ? "" : "OK"}</Chip>
        <span className="mono" style={{ color: "var(--muted)", fontSize: 12 }}>application/json</span>
        <ChevronRight size={16} className="chev" />
      </summary>
      <pre className="json" dangerouslySetInnerHTML={{ __html: paint(txt) }} />
    </details>
  );
}

// Estados
// Consultas sugeridas: se construyen a partir del catálogo real; si el ámbito
// propuesto no se publica para el indicador, se usa el primero permitido.
const SUGGESTIONS = [
  { id: "pobreza_total",   level: "departamento", icon: Wallet,        name: "Pobreza monetaria por departamento", desc: "Incidencia de la pobreza en cada departamento." },
  { id: "agua_red_publica", level: "nacional",    icon: Droplet,       name: "Acceso a agua por red pública",       desc: "Hogares abastecidos por red pública." },
  { id: "empleo_informal", level: "nacional",     icon: Briefcase,     name: "Empleo informal a nivel nacional",    desc: "Parte de la PEA ocupada con empleo informal." },
  { id: "seguro_salud",    level: "nacional",      icon: HeartPulse,    name: "Población con seguro de salud",       desc: "Personas afiliadas a algún seguro de salud." },
  { id: "analfabetismo",   level: "area",          icon: GraduationCap, name: "Analfabetismo por área urbana y rural", desc: "Tasa de analfabetismo (15 y más) por ámbito." },
];
function buildSuggestions(catalog) {
  const byId = Object.fromEntries((catalog || []).map((c) => [c.id, c]));
  return SUGGESTIONS.flatMap((s) => {
    const c = byId[s.id];
    if (!c) return [];
    const allowed = c.levels_allowed || ["nacional"];
    const level = allowed.includes(s.level) ? s.level : allowed[0];
    return [{ ...s, q: { indicator: s.id, level, cross: false } }];
  });
}

export function EmptyState({ catalog = [], onExample }) {
  const suggestions = buildSuggestions(catalog);
  return (
    <section className="welcome">
      <h2 className="welcome-h">Explora los indicadores socioeconómicos del Perú</h2>
      <p className="welcome-sub">
        Consulta información sobre pobreza, educación, salud, empleo y acceso a servicios
        básicos a partir de los microdatos de la ENAHO.
      </p>
      {suggestions.length > 0 && <p className="welcome-lbl">Consultas sugeridas</p>}
      <div className="sugg-grid">
        {suggestions.map((s) => {
          const Icon = s.icon;
          return (
            <button key={s.id} type="button" className="sugg-card"
              onClick={() => onExample && onExample(s.q)}
              aria-label={`Consultar: ${s.name}`}>
              <span className="sugg-ic" aria-hidden="true"><Icon size={18} /></span>
              <span className="sugg-tx">
                <span className="sugg-name">{s.name}</span>
                <span className="sugg-desc">{s.desc}</span>
              </span>
              <ChevronRight size={18} className="sugg-arrow" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function LoadingState() {
  return (
    <div className="stack">
      <div className="sk" style={{ height: 28, width: 320 }} />
      <div className="card pad"><div className="sk" style={{ height: 180 }} /></div>
      <div className="card pad"><div className="sk" style={{ height: 220 }} /></div>
    </div>
  );
}

// Mensaje comprensible según el tipo de error (sin exponer texto crudo de
// Python/R/FastAPI; el detalle queda en un apartado opcional).
function errorCopy(status, error) {
  const code = error?.error;
  if (code === "no_connection")
    return { title: "No se pudo conectar con el servicio", body: "Revisa tu conexión o que el servicio esté disponible e inténtalo de nuevo." };
  if (code === "engine_timeout" || status === 504)
    return { title: "La consulta tardó demasiado", body: "El cálculo excedió el tiempo permitido. Puedes reintentar; algunas combinaciones son más pesadas." };
  if (status === 503)
    return { title: "Servicio no disponible", body: "El servicio no está disponible temporalmente. Inténtalo de nuevo en unos momentos." };
  if (code === "engine_error" || status === 502)
    return { title: "Error del motor de cálculo", body: "El motor estadístico devolvió un error al procesar la consulta. Puedes reintentar o probar otra combinación." };
  if (code === "no_data")
    return { title: "Sin datos para esta combinación", body: "No hay resultados para el indicador, ámbito y año seleccionados. Prueba otra combinación." };
  if (status === 404)
    return { title: "No encontrado", body: "No se encontró el recurso solicitado. Prueba otra combinación." };
  return { title: "No se pudo completar la consulta", body: "Ocurrió un error al consultar el servicio. Puedes reintentar." };
}

export function ErrorState({ status, error, allowed, onLevel, onRetry }) {
  const isLevel = error?.error === "level_not_allowed";
  const copy = errorCopy(status, error);
  const levels = allowed || error?.levels_allowed;
  const tech = [error?.error && `error: ${error.error}`, status != null && `status: ${status}`,
    error?.message && `message: ${error.message}`].filter(Boolean).join("\n");
  return (
    <div className="alert" role="alert">
      <h3>{isLevel ? "Ese ámbito no está disponible" : copy.title}</h3>
      <p>{isLevel
        ? "Este indicador no se publica a ese nivel de desagregación. Elige un ámbito disponible:"
        : copy.body}</p>
      <div className="err-actions">
        {isLevel && levels && levels.map((a) => (
          <button key={a} className="btn btn-sm" onClick={() => onLevel && onLevel(a)}>
            Consultar por {a.replace("_", " ")}
          </button>
        ))}
        {!isLevel && onRetry && (
          <button className="btn btn-sm" onClick={onRetry}>
            <RefreshCw size={14} /> Reintentar
          </button>
        )}
      </div>
      {tech && (
        <details className="err-tech">
          <summary>Detalle técnico</summary>
          <pre>{tech}</pre>
        </details>
      )}
    </div>
  );
}

export { FileWarning, Loader2 };
