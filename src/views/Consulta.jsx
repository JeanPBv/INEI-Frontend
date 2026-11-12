// Vista Consulta: filtros arriba + resultados (KPI / barras / tabla / JSON).
// El estado vive en la URL (?indicador=&ambito=&anio=&cruce=) → consultas compartibles.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import FilterBar from "../components/FilterBar.jsx";
import { ProportionBarChart, SimpleBarChart } from "../components/charts.jsx";
import {
  ResultHeader, KpiCard, GapBanner, ResultsTable, JsonPanel,
  EmptyState, LoadingState, ErrorState,
} from "../components/results.jsx";
import { consultar, API_BASE } from "../lib/api.js";
import { UNIDAD_TXT, AMBITO_DESC } from "../lib/constants.js";

const AMB_ETQ = { nacional: "Nacional", area: "Área urbano/rural",
  region_natural: "Región natural", departamento: "Departamento" };

export default function Consulta({ meta }) {
  const { catalogo, anios } = meta;
  const latest = anios.find((a) => a.estado === "validado")?.anio || 2024;
  const [params, setParams] = useSearchParams();

  const committed = useMemo(() => ({
    indicador: params.get("indicador") || "",
    ambito: params.get("ambito") || "nacional",
    anio: Number(params.get("anio")) || latest,
    cruce: params.get("cruce") === "pobreza",
  }), [params, latest]);

  const [draft, setDraft] = useState(committed);
  useEffect(() => setDraft(committed), [committed]);

  const [st, setSt] = useState({ phase: committed.indicador ? "loading" : "empty" });

  useEffect(() => {
    if (!committed.indicador) { setSt({ phase: "empty" }); return; }
    let alive = true;
    setSt({ phase: "loading" });
    consultar(committed).then((res) => {
      if (!alive) return;
      setSt({ phase: res.ok ? "ok" : "error", res });
    });
    return () => { alive = false; };
  }, [committed.indicador, committed.ambito, committed.anio, committed.cruce]);

  const ind = catalogo.find((c) => c.id === draft.indicador);

  const onChange = (patch) => setDraft((d) => {
    const next = { ...d, ...patch };
    if (patch.indicador !== undefined) {
      const ni = catalogo.find((c) => c.id === patch.indicador);
      if (ni && !ni.cruzable) next.cruce = false;
      if (ni && !ni.ambitos_permitidos.includes(next.ambito)) next.ambito = ni.ambitos_permitidos[0];
    }
    return next;
  });

  const commit = (q) => {
    const p = { indicador: q.indicador, ambito: q.ambito, anio: String(q.anio) };
    if (q.cruce) p.cruce = "pobreza";
    setParams(p);
  };
  const onConsultar = () => commit(draft);

  return (
    <>
      <FilterBar
        catalogo={catalogo} anios={anios} value={draft} onChange={onChange}
        onConsultar={onConsultar} loading={st.phase === "loading"}
        errorAmbito={st.phase === "error" && st.res.error?.error === "ambito_no_permitido"}
      />
      <div className="content">
        <Resultado
          st={st} ind={ind} committed={committed}
          onEjemplo={(q) => commit({ ambito: "nacional", anio: latest, cruce: false, ...q })}
          onAmbito={(a) => commit({ ...committed, ambito: a })}
        />
      </div>
    </>
  );
}

function Resultado({ st, ind, committed, onEjemplo, onAmbito }) {
  if (st.phase === "empty") return <EmptyState onEjemplo={onEjemplo} />;
  if (st.phase === "loading") return <LoadingState />;
  if (st.phase === "error")
    return <ErrorState status={st.res.status} error={st.res.error}
      permitidos={st.res.error?.ambitos_permitidos} onAmbito={onAmbito} />;

  const { res } = st;
  const formato = ind?.unidad || res.meta?.formato || "porcentaje";
  const rows = res.resultados;
  const titulo = ind?.titulo || res.meta?.titulo || committed.indicador;
  const nacional = committed.ambito === "nacional" && !committed.cruce && rows.length === 1;
  const esPct = formato === "porcentaje";

  const csv = () => window.open(
    `${API_BASE}/${committed.cruce ? "cruces" : "estimaciones"}?indicador=${committed.indicador}`
    + `&ambito=${committed.ambito}&anio=${committed.anio}`
    + `${committed.cruce ? "&cruzar_por=pobreza" : ""}&formato=csv`, "_blank");

  return (
    <div className="stack">
      <ResultHeader
        titulo={`${titulo}${committed.ambito !== "nacional" ? ` por ${AMB_ETQ[committed.ambito].toLowerCase()}` : ""}, ${committed.anio}`}
        ambitoEtq={AMB_ETQ[committed.ambito]} anio={committed.anio} cruce={committed.cruce}
        unidadTxt={UNIDAD_TXT[formato]} request={res.request} onCsv={csv}
      />

      {committed.cruce && <GapBanner rows={rows} />}

      {nacional ? (
        <KpiCard row={rows[0]} formato={formato} titulo={titulo} />
      ) : (
        <div className="card pad chart-wrap">
          {esPct
            ? <ProportionBarChart rows={rows} cruce={committed.cruce} />
            : <SimpleBarChart rows={rows} formato={formato} />}
          <p className="chart-note">
            {esPct
              ? "Barra al 100%: el tramo en color es “Sí” y el gris es el resto (“No”). El IC 95% está en el tooltip y la tabla. ▲ = referencial (CV > 15%)."
              : "Barra simple de 0 al máximo. El IC 95% está en el tooltip y la tabla. ▲ = referencial (CV > 15%)."}
          </p>
        </div>
      )}

      <ResultsTable rows={rows} formato={formato} />
      <JsonPanel status={res.status} data={res.raw} />
    </div>
  );
}
