// Vista Mapa: indicador por departamento en el mapa del Perú + ranking enlazado.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import FilterBar from "../components/FilterBar.jsx";
import { ChoroplethMap } from "../components/charts.jsx";
import { ResultHeader, ResultsTable, JsonPanel, LoadingState, ErrorState } from "../components/results.jsx";
import { consultar, API_BASE } from "../lib/api.js";
import { UNIDAD_TXT } from "../lib/constants.js";
import { cssVar, fmtValor, n1, nivelBonito } from "../lib/format.js";

export default function Mapa({ meta }) {
  const { catalogo, anios } = meta;
  const latest = anios.find((a) => a.estado === "validado")?.anio || 2024;
  // Solo indicadores publicables por departamento.
  const cat = catalogo.filter((c) => c.ambitos_permitidos.includes("departamento"));
  const [params, setParams] = useSearchParams();

  const committed = useMemo(() => ({
    indicador: params.get("indicador") || cat[0]?.id || "",
    ambito: "departamento",
    anio: Number(params.get("anio")) || latest,
    cruce: false,
  }), [params, latest]); // eslint-disable-line

  const [draft, setDraft] = useState(committed);
  useEffect(() => setDraft(committed), [committed]);
  const [st, setSt] = useState({ phase: "loading" });
  const [hot, setHot] = useState(null);

  useEffect(() => {
    if (!committed.indicador) return;
    let alive = true;
    setSt({ phase: "loading" });
    consultar(committed).then((res) => { if (alive) setSt({ phase: res.ok ? "ok" : "error", res }); });
    return () => { alive = false; };
  }, [committed.indicador, committed.anio]);

  const ind = cat.find((c) => c.id === committed.indicador);
  const commit = (q) => setParams({ indicador: q.indicador, anio: String(q.anio) });

  return (
    <>
      <FilterBar
        catalogo={cat} anios={anios} value={draft}
        onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
        onConsultar={() => commit(draft)} loading={st.phase === "loading"}
        lockAmbito
      />
      <div className="content">
        {st.phase === "loading" && <LoadingState />}
        {st.phase === "error" && <ErrorState status={st.res.status} error={st.res.error} />}
        {st.phase === "ok" && (
          <Mapo res={st.res} ind={ind} committed={committed} hot={hot} setHot={setHot} />
        )}
      </div>
    </>
  );
}

function Mapo({ res, ind, committed, hot, setHot }) {
  const formato = ind?.unidad || "porcentaje";
  const rows = res.resultados;
  const max = Math.max(...rows.map((r) => r.estimacion));
  const ranking = [...rows].sort((a, b) => b.estimacion - a.estimacion);

  const csv = () => window.open(
    `${API_BASE}/estimaciones?indicador=${committed.indicador}&ambito=departamento&anio=${committed.anio}&formato=csv`, "_blank");

  return (
    <div className="stack">
      <ResultHeader
        titulo={`${ind?.titulo || committed.indicador} por departamento, ${committed.anio}`}
        ambitoEtq="Departamento" anio={committed.anio} unidadTxt={UNIDAD_TXT[formato]}
        request={res.request} onCsv={csv}
      />
      <div className="card pad">
        <div className="mapgrid">
          <div className="mapbox">
            <ChoroplethMap rows={rows} formato={formato} hot={hot} setHot={setHot} />
          </div>
          <div className="rankbox">
            <ol className="rank">
              {ranking.map((r, i) => (
                <li key={r.nivel} className={hot === r.nivel ? "hot" : ""}
                  onMouseEnter={() => setHot(r.nivel)} onMouseLeave={() => setHot(null)}>
                  <span className="pos mono">{i + 1}</span>
                  <span className="nm">
                    {nivelBonito(r.nivel)}
                    {r.referencial && <span title="Referencial (CV > 15%)" style={{ color: "var(--warn-ink)" }}>▲</span>}
                    <span className="bar" style={{
                      width: `${(r.estimacion / max) * 120}px`,
                      background: cssVar(r.referencial ? "--bar-ref" : "--bar"),
                    }} />
                  </span>
                  <span className="vl mono">{fmtValor(r.estimacion, formato)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div className="legend">
          <span><i style={{ border: "1.3px dashed var(--ink)", background: "transparent" }} /> estimación referencial (CV &gt; 15%)</span>
        </div>
      </div>
      <ResultsTable rows={rows} formato={formato} />
      <JsonPanel status={res.status} data={res.raw} />
    </div>
  );
}
