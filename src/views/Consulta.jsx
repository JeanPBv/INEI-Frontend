// Vista Consulta: filtros arriba + resultados (KPI / barras / tabla / JSON).
// El estado vive en la URL (?indicator=&level=&year=&cross=) → consultas compartibles.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import FilterBar from "../components/FilterBar.jsx";
import { ProportionBarChart, SimpleBarChart, CategoryBarChart } from "../components/charts.jsx";
import {
  ResultHeader, KpiCard, GapBanner, ResultsTable, JsonPanel,
  EmptyState, LoadingState, ErrorState,
} from "../components/results.jsx";
import { query, distribution, API_BASE } from "../lib/api.js";
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

  // El panel de resultados (título, formato, desglose) se ata a lo CONSULTADO
  // (committed), no al borrador: cambiar el select no altera el gráfico ni los
  // títulos hasta que se pulsa "Consultar".
  const ind = catalog.find((c) => c.id === committed.indicator);

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
  // Estado del desglose (drill-down). Vive aquí para que el gráfico, la TABLA y el
  // JSON de abajo muestren todos lo mismo: el nivel, o el desglose cuando está abierto.
  const [drill, setDrill] = useState(null);             // { subgroup, label } | null
  const [dist, setDist]   = useState({ phase: "idle" });

  // Al cambiar de consulta se cierra cualquier desglose abierto.
  useEffect(() => { setDrill(null); setDist({ phase: "idle" }); },
    [committed.indicator, committed.level, committed.year, committed.cross]);

  // Al entrar a un subámbito, pide su distribución por categorías.
  useEffect(() => {
    if (!drill) return;
    let alive = true;
    setDist({ phase: "loading" });
    distribution({ indicator: committed.indicator, level: committed.level,
                   subgroup: drill.subgroup, year: committed.year })
      .then((res) => { if (alive) setDist({ phase: res.ok ? "ok" : "error", res }); });
    return () => { alive = false; };
  }, [drill, committed.indicator, committed.level, committed.year]);

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
  const canBreakdown = ind?.has_breakdown && !committed.cross;

  // Cuando el desglose está cargado, la tabla y el JSON reflejan ESE desglose.
  const drilled = drill && dist.phase === "ok";
  const tableRows   = drilled ? dist.res.rows : rows;
  const tableFormat = drilled ? "porcentaje" : format;
  const jsonData    = drilled ? dist.res.raw : res.raw;
  const jsonStatus  = drilled ? dist.res.status : res.status;

  const csv = () => window.open(
    (drilled
      ? `${API_BASE}/distribution?indicator=${committed.indicator}&level=${committed.level}`
        + `&subgroup=${encodeURIComponent(drill.subgroup)}&year=${committed.year}&format=csv`
      : `${API_BASE}/${committed.cross ? "crosstabs" : "estimates"}?indicator=${committed.indicator}`
        + `&level=${committed.level}&year=${committed.year}`
        + `${committed.cross ? "&cross_by=pobreza" : ""}&format=csv`), "_blank");

  return (
    <div className="stack">
      <ResultHeader
        title={`${title}${committed.level !== "nacional" ? ` por ${LEVEL_TAG[committed.level].toLowerCase()}` : ""}, ${committed.year}`
          + `${drill ? ` · desglose de ${drill.label}` : ""}`}
        levelTag={drill ? `Desglose · ${drill.label}` : LEVEL_TAG[committed.level]}
        year={committed.year} cross={committed.cross && !drill}
        unitText={drill ? UNIT_LABEL.porcentaje : UNIT_LABEL[format]} request={res.request} onCsv={csv}
      />

      {committed.cross && !drill && <GapBanner rows={rows} />}

      {drill ? (
        <BreakdownCard committed={committed} ind={ind} drill={drill} dist={dist} onBack={() => setDrill(null)} />
      ) : national ? (
        <>
          <KpiCard row={rows[0]} format={format} title={title}
            year={committed.year} universe={ind?.universe} />
          {canBreakdown && (
            <div>
              <button className="btn btn-sm" onClick={() => setDrill({ subgroup: "", label: "Nacional" })}>
                Ver desglose por categorías
              </button>
            </div>
          )}
        </>
      ) : (
        <ChartCard committed={committed} ind={ind} rows={rows} format={format} isPct={isPct}
          onDrill={canBreakdown && isPct ? (subgroup, label) => setDrill({ subgroup, label }) : undefined} />
      )}

      {drilled && (
        <p className="chart-note" style={{ margin: "-6px 2px 0" }}>
          La tabla y el JSON de abajo corresponden al <b>desglose de {drill.label}</b>, no al nivel.
        </p>
      )}
      <ResultsTable rows={tableRows} format={tableFormat} />
      <JsonPanel status={jsonStatus} data={jsonData} />
    </div>
  );
}

// Tarjeta del gráfico de nivel (barras apiladas Sí/No o barras simples), con el
// callback de drill-down en cada barra cuando el indicador tiene desglose.
function ChartCard({ committed, ind, rows, format, isPct, onDrill }) {
  return (
    <div className="card pad chart-wrap">
      {isPct
        ? <ProportionBarChart rows={rows} cross={committed.cross} onDrill={onDrill} />
        : <SimpleBarChart rows={rows} format={format} />}
      <p className="chart-note">
        {isPct
          ? (onDrill
              ? "Barra al 100%: color = “Sí”, gris = “No”. Haz clic en una barra para desglosarla por categorías. El IC 95% está en el tooltip y la tabla. ▲ = referencial (CV > 15%)."
              : "Barra al 100%: el tramo en color es “Sí” y el gris es el resto (“No”). El IC 95% está en el tooltip y la tabla. ▲ = referencial (CV > 15%).")
          : "Barra simple de 0 al máximo. El IC 95% está en el tooltip y la tabla. ▲ = referencial (CV > 15%)."}
      </p>
    </div>
  );
}

// Tarjeta del desglose por categorías de un subámbito (o nacional), con "Atrás".
function BreakdownCard({ committed, ind, drill, dist, onBack }) {
  const isNat = committed.level === "nacional";
  return (
    <div className="card pad chart-wrap">
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
        <button className="btn btn-sm btn-icon" onClick={onBack} aria-label="Volver" title="Volver">
          <ArrowLeft size={16} />
        </button>
        {!isNat && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 9, color: "var(--muted)", fontSize: 14 }}>
            <span>{LEVEL_TAG[committed.level]}</span>
            <span style={{ opacity: 0.5 }}>›</span>
            <b style={{ color: "var(--ink)" }}>{drill.label}</b>
          </span>
        )}
      </div>
      {dist.phase === "loading" && <div className="sk" style={{ height: 200 }} />}
      {dist.phase === "error" && <p className="chart-note">No se pudo cargar el desglose.</p>}
      {dist.phase === "ok" && (dist.res.rows.length
        ? <CategoryBarChart rows={dist.res.rows} restLabel={ind?.rest_label} />
        : <p className="chart-note">Sin datos para este subámbito.</p>)}
      <p className="chart-note">
        {ind?.rest_label
          ? <>Categorías que forman el indicador (suman el % del titular); la barra gris <b>“{ind.rest_label}”</b> es el resto. El IC 95% y el CV están en el tooltip. ▲ = referencial (CV &gt; 15%).</>
          : <>Distribución de las categorías de origen (suma 100%). El IC 95% y el CV están en el tooltip. ▲ = referencial (CV &gt; 15%).</>}
      </p>
    </div>
  );
}
