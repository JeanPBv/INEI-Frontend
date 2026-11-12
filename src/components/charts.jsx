// Gráficos con ECharts: barras apiladas Sí/No (proporciones), barras simples
// (promedios/totales) y mapa coroplético del Perú. Sin bigotes de IC.
import { useEffect, useMemo, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import { useTheme } from "../lib/theme.jsx";
import { POBREZA_VAR } from "../lib/constants.js";
import { cssVar, n1, n0, fmtValor, nivelBonito, aGeoNombre } from "../lib/format.js";

// Color del tramo "Sí" según calidad / condición de pobreza.
function colorSi(row, cruce) {
  if (cruce) {
    const cond = String(row.nivel).split(" / ")[0];
    return cssVar(POBREZA_VAR[cond] || "--bar");
  }
  return cssVar(row.referencial ? "--bar-ref" : "--bar");
}

function tipCss() {
  return {
    backgroundColor: cssVar("--tip-bg"),
    borderColor: cssVar("--tip-bg"),
    textStyle: { color: cssVar("--tip-ink"), fontSize: 12 },
    extraCssText: "border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.18);",
  };
}

const MONO = "'IBM Plex Mono', monospace";

// ---------- Barras apiladas 100% Sí/No (indicadores de proporción) ----------
export function ProportionBarChart({ rows, cruce }) {
  const { theme } = useTheme();
  const sorted = useMemo(() => [...rows].sort((a, b) => b.estimacion - a.estimacion), [rows]);

  const option = useMemo(() => {
    const cats = sorted.map((r) => nivelBonito(String(r.nivel).replace(/^.+ \/ /, "")));
    const byCat = Object.fromEntries(sorted.map((r, i) => [i, r]));
    const si = sorted.map((r) => ({
      value: +r.estimacion,
      ref: r.referencial,
      itemStyle: {
        color: colorSi(r, cruce),
        borderColor: cssVar("--surface"),
        borderWidth: 2,
        ...(r.referencial ? { borderColor: cssVar("--warn-line"), borderWidth: 1.4, borderType: "dashed" } : {}),
      },
    }));
    const no = sorted.map((r) => 100 - r.estimacion);
    return {
      grid: { left: 8, right: 56, top: 8, bottom: 28, containLabel: true },
      tooltip: {
        trigger: "axis", axisPointer: { type: "shadow" }, ...tipCss(),
        formatter: (ps) => {
          const r = byCat[ps[0].dataIndex];
          const q = r.referencial ? "Referencial (CV > 15%)" : "Confiable";
          return `<b>${nivelBonito(r.nivel)}</b><br/>Sí: <b>${n1(r.estimacion)}%</b> · No: <b>${n1(100 - r.estimacion)}%</b>`
            + `<br/>IC 95% [${n1(r.ic_inferior)} – ${n1(r.ic_superior)}] · ${q}`;
        },
      },
      legend: { show: false },
      xAxis: {
        type: "value", min: 0, max: 100, interval: 25,
        axisLabel: { formatter: "{value}%", color: cssVar("--muted") },
        splitLine: { lineStyle: { color: cssVar("--grid") } },
      },
      yAxis: {
        type: "category", data: cats, inverse: true,
        axisLabel: { color: cssVar("--ink-2") },
        axisLine: { lineStyle: { color: cssVar("--line") } },
        axisTick: { show: false },
      },
      series: [
        {
          name: "Sí", type: "bar", stack: "t", data: si, barMaxWidth: 26,
          label: {
            show: true, position: "insideRight", color: "#fff",
            fontFamily: MONO, fontWeight: 600, fontSize: 11.5,
            formatter: (p) => `${n1(p.value)}%${p.data.ref ? "  ▲" : ""}`,
          },
        },
        { name: "No", type: "bar", stack: "t", data: no, barMaxWidth: 26,
          itemStyle: { color: cssVar("--no") } },
      ],
    };
  }, [sorted, cruce, theme]);

  const h = Math.max(220, sorted.length * 30 + 48);
  return <ReactECharts option={option} style={{ height: h }} notMerge />;
}

// ---------- Barras simples (promedios en S/, totales en conteo) ----------
export function SimpleBarChart({ rows, formato }) {
  const { theme } = useTheme();
  const sorted = useMemo(() => [...rows].sort((a, b) => b.estimacion - a.estimacion), [rows]);
  const option = useMemo(() => {
    const cats = sorted.map((r) => nivelBonito(r.nivel));
    const byCat = Object.fromEntries(sorted.map((r, i) => [i, r]));
    return {
      grid: { left: 8, right: 80, top: 8, bottom: 28, containLabel: true },
      tooltip: {
        trigger: "axis", axisPointer: { type: "shadow" }, ...tipCss(),
        formatter: (ps) => {
          const r = byCat[ps[0].dataIndex];
          const q = r.referencial ? "Referencial (CV > 15%)" : "Confiable";
          return `<b>${nivelBonito(r.nivel)}</b><br/>${fmtValor(r.estimacion, formato)}`
            + `<br/>IC 95% [${fmtValor(r.ic_inferior, formato)} – ${fmtValor(r.ic_superior, formato)}] · ${q}`;
        },
      },
      xAxis: {
        type: "value", axisLabel: { color: cssVar("--muted"),
          formatter: (v) => (formato === "soles" ? `S/ ${n0(v)}` : n0(v)) },
        splitLine: { lineStyle: { color: cssVar("--grid") } },
      },
      yAxis: {
        type: "category", data: cats, inverse: true,
        axisLabel: { color: cssVar("--ink-2") },
        axisLine: { lineStyle: { color: cssVar("--line") } },
        axisTick: { show: false },
      },
      series: [{
        type: "bar", barMaxWidth: 26,
        data: sorted.map((r) => ({
          value: +r.estimacion,
          itemStyle: { color: cssVar(r.referencial ? "--bar-ref" : "--bar"), borderRadius: [0, 3, 3, 0] },
        })),
        label: {
          show: true, position: "right", color: cssVar("--ink-2"),
          fontFamily: MONO, fontWeight: 600, fontSize: 11.5,
          formatter: (p) => fmtValor(p.value, formato) + (sorted[p.dataIndex].referencial ? "  ▲" : ""),
        },
      }],
    };
  }, [sorted, formato, theme]);
  const h = Math.max(200, sorted.length * 34 + 48);
  return <ReactECharts option={option} style={{ height: h }} notMerge />;
}

// ---------- Mapa coroplético del Perú (departamentos) ----------
let GEO_PROMISE = null;
function cargarGeo() {
  if (!GEO_PROMISE) {
    GEO_PROMISE = fetch(`${import.meta.env.BASE_URL}geo/peru_departamentos.geojson`)
      .then((r) => r.json())
      .then((geo) => { echarts.registerMap("peru_dep", geo); return true; })
      .catch(() => false);
  }
  return GEO_PROMISE;
}

export function ChoroplethMap({ rows, formato, hot, setHot }) {
  const { theme } = useTheme();
  const [ready, setReady] = useState(false);
  const ref = useRef(null);
  useEffect(() => { cargarGeo().then(setReady); }, []);

  const byGeo = useMemo(
    () => Object.fromEntries(rows.map((r) => [aGeoNombre(r.nivel), r])), [rows]);

  const option = useMemo(() => {
    const vals = rows.map((r) => r.estimacion);
    const esPct = formato === "porcentaje";
    const qc = ["--q1", "--q2", "--q3", "--q4", "--q5"].map(cssVar);
    const visualMap = esPct
      ? {
          type: "piecewise", left: 8, bottom: 8, showLabel: true,
          pieces: [
            { lt: 10, color: qc[0], label: "< 10%" },
            { gte: 10, lt: 20, color: qc[1], label: "10 – 20%" },
            { gte: 20, lt: 30, color: qc[2], label: "20 – 30%" },
            { gte: 30, lt: 40, color: qc[3], label: "30 – 40%" },
            { gte: 40, color: qc[4], label: "≥ 40%" },
          ],
          textStyle: { color: cssVar("--ink-2"), fontSize: 11 },
        }
      : {
          type: "continuous", left: 8, bottom: 8, calculable: true,
          min: Math.floor(Math.min(...vals)), max: Math.ceil(Math.max(...vals)),
          inRange: { color: qc },
          text: [formato === "soles" ? "S/ más" : "más", "menos"],
          textStyle: { color: cssVar("--ink-2"), fontSize: 11 },
        };
    return {
      tooltip: {
        trigger: "item", ...tipCss(),
        formatter: (p) => {
          const r = byGeo[p.name];
          if (!r) return `<b>${p.name}</b><br/>sin dato`;
          const q = r.referencial ? "Referencial (CV > 15%)" : "Confiable";
          return `<b>${nivelBonito(r.nivel)}</b><br/>${fmtValor(r.estimacion, formato)}`
            + `<br/>IC 95% [${fmtValor(r.ic_inferior, formato)} – ${fmtValor(r.ic_superior, formato)}]`
            + `<br/>CV ${n1(r.cv)}% · ${q}`;
        },
      },
      visualMap,
      series: [{
        type: "map", map: "peru_dep", nameProperty: "NOMBDEP", roam: false,
        aspectScale: 1,                               // proporciones naturales (el 0.75 por defecto lo "adelgaza")
        layoutCenter: ["50%", "50%"], layoutSize: "98%",  // centra y llena la caja
        itemStyle: { borderColor: cssVar("--map-line"), borderWidth: 1, areaColor: cssVar("--surface-2") },
        emphasis: {
          itemStyle: { borderColor: cssVar("--ink"), borderWidth: 1.8 },
          label: { show: true, fontWeight: 700 },
        },
        select: { disabled: true },
        label: {                                      // etiqueta con el nombre del departamento
          show: true, fontSize: 9, fontWeight: 600, color: "#fff",
          textBorderColor: "rgba(0,0,0,.55)", textBorderWidth: 2.6,
        },
        data: rows.map((r) => ({
          name: aGeoNombre(r.nivel),
          value: r.estimacion,
          itemStyle: r.referencial
            ? { borderColor: cssVar("--warn-line"), borderWidth: 1.5, borderType: "dashed" }
            : {},
        })),
      }],
    };
  }, [rows, formato, theme, byGeo]);

  // Resalta en el mapa el departamento activo del ranking.
  useEffect(() => {
    const inst = ref.current?.getEchartsInstance?.();
    if (!inst) return;
    inst.dispatchAction({ type: "downplay", seriesIndex: 0 });
    if (hot) inst.dispatchAction({ type: "highlight", seriesIndex: 0, name: aGeoNombre(hot) });
  }, [hot, ready]);

  if (!ready) return <div className="sk" style={{ height: 460 }} />;
  return (
    <ReactECharts
      ref={ref}
      option={option}
      style={{ height: 520 }}
      notMerge
      onEvents={{
        mouseover: (e) => { const r = byGeo[e.name]; if (r && setHot) setHot(r.nivel); },
        mouseout: () => setHot && setHot(null),
      }}
    />
  );
}
