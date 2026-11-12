// Vista Mapa: indicador por departamento en el mapa del Perú + ranking enlazado.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import FilterBar from "../components/FilterBar.jsx";
import { ChoroplethMap } from "../components/charts.jsx";
import { ResultHeader, ResultsTable, JsonPanel, LoadingState, ErrorState } from "../components/results.jsx";
import { query, API_BASE } from "../lib/api.js";
import { UNIT_LABEL } from "../lib/constants.js";
import { cssVar, fmtValue, n1, prettyLevel } from "../lib/format.js";

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

  useEffect(() => {
    if (!committed.indicator) return;
    let alive = true;
    setSt({ phase: "loading" });
    query(committed).then((res) => { if (alive) setSt({ phase: res.ok ? "ok" : "error", res }); });
    return () => { alive = false; };
  }, [committed.indicator, committed.year]);

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
        {st.phase === "loading" && <LoadingState />}
        {st.phase === "error" && <ErrorState status={st.res.status} error={st.res.error} />}
        {st.phase === "ok" && (
          <MapResult res={st.res} ind={ind} committed={committed} hot={hot} setHot={setHot} />
        )}
      </div>
    </>
  );
}

function MapResult({ res, ind, committed, hot, setHot }) {
  const format = ind?.unit || "porcentaje";
  const rows = res.rows;
  const max = Math.max(...rows.map((r) => r.estimate));
  const ranking = [...rows].sort((a, b) => b.estimate - a.estimate);

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
            <ChoroplethMap rows={rows} format={format} hot={hot} setHot={setHot} />
          </div>
          <div className="rankbox">
            <ol className="rank">
              {ranking.map((r, i) => (
                <li key={r.level} className={hot === r.level ? "hot" : ""}
                  onMouseEnter={() => setHot(r.level)} onMouseLeave={() => setHot(null)}>
                  <span className="pos mono">{i + 1}</span>
                  <span className="nm">
                    {prettyLevel(r.level)}
                    {r.unreliable && <span title="Referencial (CV > 15%)" style={{ color: "var(--warn-ink)" }}>▲</span>}
                    <span className="bar" style={{
                      width: `${(r.estimate / max) * 120}px`,
                      background: cssVar(r.unreliable ? "--bar-ref" : "--bar"),
                    }} />
                  </span>
                  <span className="vl mono">{fmtValue(r.estimate, format)}</span>
                </li>
              ))}
            </ol>
          </div>
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
