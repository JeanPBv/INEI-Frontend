// Cabecera de resultados, tarjeta KPI, banner de brecha, tabla, panel JSON y estados.
import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, FileWarning, Inbox, Loader2 } from "lucide-react";
import { n1, n0, n2, fmtValor, nivelBonito } from "../lib/format.js";

export function Chip({ kind = "", icon: Icon, children }) {
  return (
    <span className={`chip ${kind}`}>
      {Icon && <Icon size={13} />} {children}
    </span>
  );
}

function CalidadChip({ esRef }) {
  return esRef
    ? <Chip kind="warn" icon={AlertTriangle}>Referencial</Chip>
    : <Chip kind="ok" icon={CheckCircle2}>Confiable</Chip>;
}

// ---------- Cabecera ----------
export function ResultHeader({ titulo, ambitoEtq, anio, cruce, unidadTxt, request, onCsv }) {
  return (
    <div className="result-head">
      <div>
        <h2>{titulo}</h2>
        <div className="chips">
          <Chip>{ambitoEtq}</Chip>
          <Chip>{anio}</Chip>
          {cruce && <Chip>Cruce · pobreza</Chip>}
          <Chip kind="ci">IC 95%</Chip>
          <Chip>{unidadTxt}</Chip>
        </div>
        {/* Endpoint oculto para el usuario final (evita confusión). Reactivar quitando el comentario:
        {request && <div className="req-url mono">{request}</div>} */}
      </div>
      {onCsv && (
        <div className="chips">
          <button className="btn btn-sm" onClick={() => onCsv("csv")}>CSV</button>
        </div>
      )}
    </div>
  );
}

// ---------- Tarjeta KPI (nacional sin cruce) ----------
export function KpiCard({ row, formato, titulo }) {
  const esPct = formato === "porcentaje";
  const cvOver = row.cv > 15;
  const val = esPct ? n1(row.estimacion) : formato === "soles" ? n0(row.estimacion) : n0(row.estimacion);
  const sufijo = esPct ? "%" : formato === "soles" ? "S/" : "";
  const lectura = esPct
    ? `Con 95% de confianza, ${titulo.toLowerCase()} está entre ${n1(row.ic_inferior)}% y ${n1(row.ic_superior)}%. `
      + `Su CV (${n1(row.cv)}%) está ${cvOver ? "por encima" : "por debajo"} del umbral de 15%, así que la cifra es `
      + `${cvOver ? "referencial" : "confiable"}.`
    : `Con 95% de confianza, el valor está entre ${fmtValor(row.ic_inferior, formato)} y ${fmtValor(row.ic_superior, formato)}. `
      + `CV ${n1(row.cv)}% (${cvOver ? "referencial" : "confiable"}).`;

  return (
    <div className={`card pad kpi ${row.referencial ? "ref" : ""}`}>
      <div>
        <div className="kpi-val mono">
          {formato === "soles" && <small>S/ </small>}{val}
          {esPct && <small>%</small>}
        </div>
        <div className="kpi-ci mono">IC 95% [{esPct ? `${n1(row.ic_inferior)} – ${n1(row.ic_superior)}`
          : `${fmtValor(row.ic_inferior, formato)} – ${fmtValor(row.ic_superior, formato)}`}]</div>
        <div style={{ marginTop: 12 }}><CalidadChip esRef={row.referencial} /></div>

        {esPct && (
          <div className="sino">
            <div className={`sino-bar ${row.referencial ? "ref" : ""}`}>
              <div className="si" style={{ width: `${row.estimacion}%` }} />
              <div className="no" style={{ width: `${100 - row.estimacion}%` }} />
            </div>
            <div className="sino-leg">
              <span>Sí {n1(row.estimacion)}%</span>
              <span>No {n1(100 - row.estimacion)}%</span>
            </div>
          </div>
        )}
        <div className="kpi-read">{lectura}</div>
      </div>

      <dl>
        <dt>Error estándar</dt><dd className="mono">{esPct ? `${n2(row.error_estandar)} pp` : n2(row.error_estandar)}</dd>
        <dt>Coef. de variación</dt>
        <dd className="mono">{n1(row.cv)}%
          <div className={`meter ${cvOver ? "over" : ""}`}>
            <i style={{ width: `${Math.min(100, (row.cv / 20) * 100)}%` }} />
            <span className="thr" style={{ left: "75%" }} />
          </div>
        </dd>
        <dt>n muestral</dt><dd className="mono">{n0(row.n_muestral)}</dd>
        <dt>Nivel de confianza</dt><dd className="mono">95%</dd>
      </dl>
    </div>
  );
}

// ---------- Banner de brecha (cruce por pobreza) ----------
export function GapBanner({ rows }) {
  const get = (c) => rows.find((r) => String(r.nivel).startsWith(c));
  const alto = get("No pobre"), bajo = get("Pobre extremo");
  if (!alto || !bajo) return null;
  const brecha = alto.estimacion - bajo.estimacion;
  const solapan = !(alto.ic_inferior > bajo.ic_superior || bajo.ic_inferior > alto.ic_superior);
  return (
    <div className={`gap ${solapan ? "neu" : ""}`}>
      <div>
        <h3>Brecha de {n1(Math.abs(brecha))} pp</h3>
        <p>
          No pobre <b>{n1(alto.estimacion)}%</b> frente a Pobre extremo <b>{n1(bajo.estimacion)}%</b>.
          {solapan
            ? " No significativa: los IC 95% se superponen."
            : " Significativa: los IC 95% no se superponen."}
        </p>
      </div>
    </div>
  );
}

// ---------- Tabla (columnas ordenables: clic en la cabecera) ----------
// Columnas: key = campo de la fila; num = ordena numéricamente (texto si es false).
const COLS_TABLA = [
  { key: "nivel", label: "Nivel", num: false },
  { key: "estimacion", label: "Estimación", num: true },
  { key: "error_estandar", label: "Error estándar", num: true },
  { key: "cv", label: "CV", num: true },
  { key: "ic_inferior", label: "IC inferior", num: true },
  { key: "ic_superior", label: "IC superior", num: true },
  { key: "referencial", label: "Referencial", num: true },
  { key: "n_muestral", label: "n muestral", num: true },
];

export function ResultsTable({ rows, formato }) {
  const esPct = formato === "porcentaje";
  // sort.key === null → orden original (como lo devuelve la API).
  const [sort, setSort] = useState({ key: null, dir: "asc" });

  // Primer clic: numérico de mayor a menor, texto de A a Z. Siguiente clic: invierte.
  const onSort = (c) => setSort((s) =>
    s.key === c.key
      ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" }
      : { key: c.key, dir: c.num ? "desc" : "asc" });

  const sorted = sort.key == null ? rows : [...rows].sort((a, b) => {
    if (sort.key === "nivel") {
      const av = nivelBonito(a.nivel), bv = nivelBonito(b.nivel);
      return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    const av = Number(a[sort.key]) || 0, bv = Number(b[sort.key]) || 0;
    return sort.dir === "asc" ? av - bv : bv - av;
  });

  const flecha = (k) => sort.key === k ? (sort.dir === "asc" ? " ▲" : " ▼") : "";

  return (
    <div className="card pad">
      <p className="tbl-note">
        Estimación, CV e IC en {esPct ? "%" : formato === "soles" ? "S/" : "conteo"};
        error estándar en {esPct ? "puntos porcentuales" : "las mismas unidades"}; n muestral en hogares/personas.
        <br />Haz clic en una columna para ordenar.
      </p>
      <div className="tablebox">
        <table className="res">
          <thead>
            <tr>
              {COLS_TABLA.map((c) => (
                <th key={c.key} scope="col"
                  aria-sort={sort.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                  onClick={() => onSort(c)}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  title="Ordenar por esta columna">
                  {c.label}{flecha(c.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={i} className={r.referencial ? "ref" : ""}>
                <th scope="row" className="lvl">{nivelBonito(r.nivel)}</th>
                <td>{fmtValor(r.estimacion, formato)}</td>
                <td>{n2(r.error_estandar)}</td>
                <td>{n1(r.cv)}%</td>
                <td>{fmtValor(r.ic_inferior, formato)}</td>
                <td>{fmtValor(r.ic_superior, formato)}</td>
                <td>{r.referencial ? "Sí ▲" : <span style={{ color: "var(--muted)" }}>No</span>}</td>
                <td>{n0(r.n_muestral)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Panel JSON ----------
function pintar(json) {
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
      <pre className="json" dangerouslySetInnerHTML={{ __html: pintar(txt) }} />
    </details>
  );
}

// ---------- Estados ----------
export function EmptyState({ onEjemplo }) {
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
      {onEjemplo && (
        <p style={{ marginTop: 18 }}>
          Ejemplos:{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); onEjemplo({ indicador: "pobreza_total", ambito: "departamento" }); }}>pobreza por departamento</a>
          {" · "}
          <a href="#" onClick={(e) => { e.preventDefault(); onEjemplo({ indicador: "agua_red_publica", ambito: "nacional", cruce: true }); }}>agua × pobreza</a>
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

export function ErrorState({ status, error, permitidos, onAmbito }) {
  const esAmbito = error?.error === "ambito_no_permitido";
  return (
    <div className="alert" role="alert">
      <h3>{status === 404 ? "Indicador no encontrado" : esAmbito ? "Ámbito no permitido" : "No se pudo consultar"}</h3>
      <p>{error?.mensaje || "Ocurrió un error al consultar la API."}</p>
      {esAmbito && (permitidos || error?.ambitos_permitidos) && (
        <div className="chips" style={{ marginTop: 6 }}>
          {(permitidos || error.ambitos_permitidos).map((a) => (
            <button key={a} className="btn btn-sm" onClick={() => onAmbito && onAmbito(a)}>
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
