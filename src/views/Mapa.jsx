// Vista Mapa: indicador por departamento en el mapa del Perú + ranking enlazado.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import FilterBar from "../components/FilterBar.jsx";
import { ChoroplethMap } from "../components/charts.jsx";
import { ResultHeader, ResultsTable, JsonPanel, ErrorState } from "../components/results.jsx";
import { Skeleton, MapSkeleton } from "../components/skeletons.jsx";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { query, API_BASE } from "../lib/api.js";
import { UNIT_LABEL } from "../lib/constants.js";
import { fmtValue, n1, prettyLevel } from "../lib/format.js";

export default function Mapa({ meta }) {
  const { catalog, years } = meta;
  const latest = years.find((a) => a.status === "validado")?.year || 2024;
  // Solo indicadores publicables por departamento.
  const cat = catalog.filter((c) => c.levels_allowed.includes("departamento"));
  const [params, setParams] = useSearchParams();

  const committed = useMemo(() => ({
    indicator: params.get("indicator") || cat[0]?.id || "",
    level: "departamento",
    year: Number(params.get("year")) || latest,
    cross: false,
  }), [params, latest]); // eslint-disable-line

  const [draft, setDraft] = useState(committed);
  useEffect(() => setDraft(committed), [committed]);
  const [st, setSt] = useState({ phase: "loading" });
  const [hot, setHot] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!committed.indicator) return;
    const ctrl = new AbortController();
    let alive = true;
    setSt({ phase: "loading" });
    query(committed, ctrl.signal).then((res) => {
      if (!alive || res.aborted) return;   // ignora respuestas obsoletas/canceladas
      setSt({ phase: res.ok ? "ok" : "error", res });
    });
    return () => { alive = false; ctrl.abort(); };
  }, [committed.indicator, committed.year, reload]);

  const ind = cat.find((c) => c.id === committed.indicator);
  const commit = (q) => setParams({ indicator: q.indicator, year: String(q.year) });

  return (
    <>
      <FilterBar
        catalog={cat} years={years} value={draft}
        onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
        onSubmit={() => commit(draft)} loading={st.phase === "loading"}
        lockLevel
      />
      <div className="content">
        {st.phase === "loading" && <MapLoading />}
        {st.phase === "error" && (
          <ErrorState status={st.res.status} error={st.res.error}
            onRetry={() => setReload((n) => n + 1)} />
        )}
        {st.phase === "ok" && (
          <MapResult res={st.res} ind={ind} committed={committed} hot={hot} setHot={setHot} />
        )}
      </div>
    </>
  );
}

// Carga de datos departamentales: conserva la estructura y el alto del mapa para
// que la página no salte cuando llega el resultado.
function MapLoading() {
  return (
    <div className="stack" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Consultando datos departamentales…</span>
      <Skeleton h={26} w={320} />
      <div className="card pad">
        <div className="mapgrid">
          <div className="mapbox"><MapSkeleton label="Consultando datos departamentales…" /></div>
          <div className="rankbox">
            <Skeleton h={18} w="55%" style={{ marginBottom: 14 }} />
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} h={26} style={{ marginBottom: 8 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MapResult({ res, ind, committed, hot, setHot }) {
  const format = ind?.unit || "porcentaje";
  const rows = res.rows;
  const ranking = useMemo(() => [...rows].sort((a, b) => b.estimate - a.estimate), [rows]);

  // Selección persistente (clic en el mapa o en el ranking). Local a la vista:
  // no toca filtros, tabla ni JSON. Se reinicia al cambiar de consulta.
  const [selected, setSelected] = useState(null);
  useEffect(() => { setSelected(null); }, [committed.indicator, committed.year]);

  const selRow = selected != null ? rows.find((r) => r.level === selected) : null;
  const selPos = selRow ? ranking.findIndex((r) => r.level === selRow.level) + 1 : 0;

  const csv = () => window.open(
    `${API_BASE}/estimates?indicator=${committed.indicator}&level=departamento&year=${committed.year}&format=csv`, "_blank");

  return (
    <div className="stack">
      <ResultHeader
        title={`${ind?.title || committed.indicator} por departamento, ${committed.year}`}
        levelTag="Departamento" year={committed.year} unitText={UNIT_LABEL[format]}
        request={res.request} onCsv={csv}
      />
      <div className="card pad">
        <div className="mapgrid">
          <div className="mapbox">
            <ChoroplethMap rows={rows} format={format} hot={hot} setHot={setHot}
              selected={selected} setSelected={setSelected} />
          </div>
          <aside className="rankbox" aria-label={selRow ? "Detalle del departamento" : "Departamentos destacados"}>
            {selRow
              ? <DetailCard r={selRow} pos={selPos} total={rows.length} format={format}
                  onBack={() => setSelected(null)} />
              : <Highlights ranking={ranking} format={format} hot={hot}
                  selected={selected} setHot={setHot} setSelected={setSelected} />}
          </aside>
        </div>
        <div className="legend">
          <span><i style={{ border: "1.3px dashed var(--ink)", background: "transparent" }} /> estimación referencial (CV &gt; 15%)</span>
        </div>
      </div>
      <ResultsTable rows={rows} format={format} />
      <JsonPanel status={res.status} data={res.raw} />
    </div>
  );
}

// Fila del ranking: botón (seleccionable por teclado) con posición, nombre y valor.
// Al enfocar/pasar el cursor resalta su departamento en el mapa.
function RankRow({ r, pos, format, selected, onSelect, onHot }) {
  const isSel = selected === r.level;
  return (
    <li>
      <button type="button"
        className={`rank-row ${isSel ? "sel" : ""}`}
        aria-pressed={isSel}
        aria-label={`${prettyLevel(r.level)}, ${fmtValue(r.estimate, format)}${r.unreliable ? ", estimación referencial" : ""}, posición ${pos}; ver detalle`}
        onClick={() => onSelect(r.level)}
        onMouseEnter={() => onHot(r.level)} onMouseLeave={() => onHot(null)}
        onFocus={() => onHot(r.level)} onBlur={() => onHot(null)}>
        <span className="pos mono">{pos}</span>
        <span className="nm">
          {prettyLevel(r.level)}
          {r.unreliable && <span className="refmark" title="Referencial (CV > 15%)" aria-hidden="true">▲</span>}
        </span>
        <span className="vl mono">{fmtValue(r.estimate, format)}</span>
      </button>
    </li>
  );
}

// Panel inicial: 5 departamentos con mayor y 5 con menor valor (o la lista completa
// si hay pocos). Generado dinámicamente desde las estimaciones de la API.
function Highlights({ ranking, format, hot, selected, setHot, setSelected }) {
  const n = ranking.length;
  const small = n <= 10;
  const top = ranking.slice(0, 5);
  const bottom = ranking.slice(-5).reverse();   // menor valor primero
  const row = (r, pos) => (
    <RankRow key={r.level} r={r} pos={pos} format={format}
      selected={selected} onSelect={setSelected} onHot={setHot} />
  );
  return (
    <div className="rankpanel">
      <h3 className="rank-title">Departamentos destacados</h3>
      {small ? (
        <ol className="rank">{ranking.map((r, i) => row(r, i + 1))}</ol>
      ) : (
        <>
          <p className="rank-grouplbl">Mayor valor</p>
          <ol className="rank">{top.map((r, i) => row(r, i + 1))}</ol>
          <p className="rank-grouplbl">Menor valor</p>
          <ol className="rank">{bottom.map((r) => row(r, ranking.indexOf(r) + 1))}</ol>
        </>
      )}
      <p className="rank-hint">
        Selecciona un departamento en el mapa o en la lista para ver su detalle.
        El orden refleja estimaciones puntuales; no implica diferencias estadísticamente significativas.
      </p>
    </div>
  );
}

// Ficha compacta del departamento seleccionado (solo valores de la API).
function DetailCard({ r, pos, total, format, onBack }) {
  const cvOk = Number.isFinite(Number(r.cv));
  const precision = !cvOk
    ? "Precisión no evaluable."
    : r.unreliable
      ? "Precisión muestral referencial según el criterio del CV (CV > 15%)."
      : "Precisión muestral aceptable según el criterio del CV.";
  const precKind = !cvOk ? "muted" : r.unreliable ? "warn" : "ok";
  return (
    <div className="detailcard">
      <button type="button" className="btn btn-sm btn-icon detail-back" onClick={onBack}
        aria-label="Volver a Departamentos destacados" title="Volver">
        <ArrowLeft size={16} />
      </button>
      <h3 className="detail-name">{prettyLevel(r.level)}</h3>
      <div className="detail-val mono">{fmtValue(r.estimate, format)}</div>
      <dl className="detail-dl">
        <dt>Intervalo de confianza 95%</dt>
        <dd className="mono">{fmtValue(r.ci_lower, format)} – {fmtValue(r.ci_upper, format)}</dd>
        <dt>Coeficiente de variación</dt>
        <dd className="mono">{cvOk ? `${n1(r.cv)}%` : "—"}</dd>
        <dt>Posición</dt>
        <dd className="mono">{pos} de {total}</dd>
      </dl>
      <p className={`detail-prec ${precKind}`}>
        {precKind === "warn" && <AlertTriangle size={13} aria-hidden="true" />} {precision}
      </p>
    </div>
  );
}
