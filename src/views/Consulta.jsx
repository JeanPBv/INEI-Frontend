// Vista Consulta: filtros arriba + resultados (KPI / barras / tabla / JSON).
// El estado vive en la URL (?indicator=&level=&year=&cross=) → consultas compartibles.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import FilterBar from "../components/FilterBar.jsx";
import { ProportionBarChart, SimpleBarChart } from "../components/charts.jsx";
import {
  ResultHeader, KpiCard, GapBanner, ResultsTable, JsonPanel,
  EmptyState, LoadingState, ErrorState,
} from "../components/results.jsx";
import { query, API_BASE } from "../lib/api.js";
import { UNIT_LABEL } from "../lib/constants.js";

const LEVEL_TAG = { nacional: "Nacional", area: "Área urbano/rural",
  region_natural: "Región natural", departamento: "Departamento" };

export default function Consulta({ meta }) {
  const { catalog, years } = meta;
  const latest = years.find((a) => a.status === "validado")?.year || 2024;
  const [params, setParams] = useSearchParams();

  const committed = useMemo(() => ({
    indicator: params.get("indicator") || "",
    level: params.get("level") || "nacional",
    year: Number(params.get("year")) || latest,
    cross: params.get("cross") === "pobreza",
  }), [params, latest]);

  const [draft, setDraft] = useState(committed);
  useEffect(() => setDraft(committed), [committed]);

  const [st, setSt] = useState({ phase: committed.indicator ? "loading" : "empty" });

  useEffect(() => {
    if (!committed.indicator) { setSt({ phase: "empty" }); return; }
    let alive = true;
    setSt({ phase: "loading" });
    query(committed).then((res) => {
      if (!alive) return;
      setSt({ phase: res.ok ? "ok" : "error", res });
    });
    return () => { alive = false; };
  }, [committed.indicator, committed.level, committed.year, committed.cross]);

  const ind = catalog.find((c) => c.id === draft.indicator);

  const onChange = (patch) => setDraft((d) => {
    const next = { ...d, ...patch };
    if (patch.indicator !== undefined) {
      const ni = catalog.find((c) => c.id === patch.indicator);
      if (ni && !ni.crossable) next.cross = false;
      if (ni && !ni.levels_allowed.includes(next.level)) next.level = ni.levels_allowed[0];
    }
    return next;
  });

  const commit = (q) => {
    const p = { indicator: q.indicator, level: q.level, year: String(q.year) };
    if (q.cross) p.cross = "pobreza";
    setParams(p);
  };
  const onSubmit = () => commit(draft);

  return (
    <>
      <FilterBar
        catalog={catalog} years={years} value={draft} onChange={onChange}
        onSubmit={onSubmit} loading={st.phase === "loading"}
        errorLevel={st.phase === "error" && st.res.error?.error === "level_not_allowed"}
      />
      <div className="content">
        <Result
          st={st} ind={ind} committed={committed}
          onExample={(q) => commit({ level: "nacional", year: latest, cross: false, ...q })}
          onLevel={(a) => commit({ ...committed, level: a })}
        />
      </div>
    </>
  );
}

function Result({ st, ind, committed, onExample, onLevel }) {
  if (st.phase === "empty") return <EmptyState onExample={onExample} />;
  if (st.phase === "loading") return <LoadingState />;
  if (st.phase === "error")
    return <ErrorState status={st.res.status} error={st.res.error}
      allowed={st.res.error?.levels_allowed} onLevel={onLevel} />;

  const { res } = st;
  const format = ind?.unit || res.meta?.format || "porcentaje";
  const rows = res.rows;
  const title = ind?.title || res.meta?.title || committed.indicator;
  const national = committed.level === "nacional" && !committed.cross && rows.length === 1;
  const isPct = format === "porcentaje";

  const csv = () => window.open(
    `${API_BASE}/${committed.cross ? "crosstabs" : "estimates"}?indicator=${committed.indicator}`
    + `&level=${committed.level}&year=${committed.year}`
    + `${committed.cross ? "&cross_by=pobreza" : ""}&format=csv`, "_blank");

  return (
    <div className="stack">
      <ResultHeader
        title={`${title}${committed.level !== "nacional" ? ` por ${LEVEL_TAG[committed.level].toLowerCase()}` : ""}, ${committed.year}`}
        levelTag={LEVEL_TAG[committed.level]} year={committed.year} cross={committed.cross}
        unitText={UNIT_LABEL[format]} request={res.request} onCsv={csv}
      />

      {committed.cross && <GapBanner rows={rows} />}

      {national ? (
        <KpiCard row={rows[0]} format={format} title={title} />
      ) : (
        <div className="card pad chart-wrap">
          {isPct
            ? <ProportionBarChart rows={rows} cross={committed.cross} />
            : <SimpleBarChart rows={rows} format={format} />}
          <p className="chart-note">
            {isPct
              ? "Barra al 100%: el tramo en color es “Sí” y el gris es el resto (“No”). El IC 95% está en el tooltip y la tabla. ▲ = referencial (CV > 15%)."
              : "Barra simple de 0 al máximo. El IC 95% está en el tooltip y la tabla. ▲ = referencial (CV > 15%)."}
          </p>
        </div>
      )}

      <ResultsTable rows={rows} format={format} />
      <JsonPanel status={res.status} data={res.raw} />
    </div>
  );
}
