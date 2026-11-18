// Cabecera de resultados, tarjeta KPI, banner de brecha, tabla, panel JSON y estados.
import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, FileWarning, Inbox, Loader2, Download } from "lucide-react";
import { n1, n0, n2, fmtValue, prettyLevel } from "../lib/format.js";
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

// Banner de brecha (cruce por pobreza)
export function GapBanner({ rows }) {
  const get = (c) => rows.find((r) => String(r.level).startsWith(c));
  const high = get("No pobre"), low = get("Pobre extremo");
  if (!high || !low) return null;
  const gap = high.estimate - low.estimate;
  const overlap = !(high.ci_lower > low.ci_upper || low.ci_lower > high.ci_upper);
  return (
    <div className={`gap ${overlap ? "neu" : ""}`}>
      <div>
        <h3>Brecha de {n1(Math.abs(gap))} pp</h3>
        <p>
          No pobre <b>{n1(high.estimate)}%</b> frente a Pobre extremo <b>{n1(low.estimate)}%</b>.
          {overlap
            ? " No concluyente: los IC 95% se solapan (el solape no descarta una diferencia; haría falta una prueba formal)."
            : " Diferencia significativa: los IC 95% no se solapan."}
        </p>
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
export function EmptyState({ onExample }) {
  return (
    <div className="empty">
      <div className="ico"><Inbox size={34} /></div>
      <h3>Configura tu consulta</h3>
      <p>Elige un indicador, un ámbito geográfico y un año. Cada cifra trae su error estándar, CV e IC 95%.</p>
      <div className="steps">
        <div className="step"><b>1 · Indicador</b><span>Qué quieres medir</span></div>
        <div className="step"><b>2 · Ámbito y año</b><span>A qué nivel y de qué año</span></div>
        <div className="step"><b>3 · Confiabilidad</b><span>CV ≤ 15% = confiable</span></div>
      </div>
      {onExample && (
        <p style={{ marginTop: 18 }}>
          Ejemplos:{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); onExample({ indicator: "pobreza_total", level: "departamento" }); }}>pobreza por departamento</a>
          {" · "}
          <a href="#" onClick={(e) => { e.preventDefault(); onExample({ indicator: "agua_red_publica", level: "nacional", cross: true }); }}>agua × pobreza</a>
        </p>
      )}
    </div>
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

export function ErrorState({ status, error, allowed, onLevel }) {
  const isLevel = error?.error === "level_not_allowed";
  return (
    <div className="alert" role="alert">
      <h3>{status === 404 ? "Indicador no encontrado" : isLevel ? "Ámbito no permitido" : "No se pudo consultar"}</h3>
      <p>{error?.message || "Ocurrió un error al consultar la API."}</p>
      {isLevel && (allowed || error?.levels_allowed) && (
        <div className="chips" style={{ marginTop: 6 }}>
          {(allowed || error.levels_allowed).map((a) => (
            <button key={a} className="btn btn-sm" onClick={() => onLevel && onLevel(a)}>
              Consultar por {a.replace("_", " ")}
            </button>
          ))}
        </div>
      )}
      <p className="mono" style={{ marginTop: 10, fontSize: 12 }}>
        <code>{error?.error || status}</code>
      </p>
    </div>
  );
}

export { FileWarning, Loader2 };
