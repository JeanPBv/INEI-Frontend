// Gráficos con ECharts: barras apiladas Sí/No (proporciones), barras simples
// (promedios/totales) y mapa coroplético del Perú.
import { useEffect, useMemo, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import { useTheme } from "../lib/theme.jsx";
import { POVERTY_VAR } from "../lib/constants.js";
import { cssVar, n1, n0, fmtValue, prettyLevel, toGeoName } from "../lib/format.js";

// Color del tramo "Sí" según calidad / condición de pobreza.
function colorYes(row, cross) {
  if (cross) {
    const cond = String(row.level).split(" / ")[0];
    return cssVar(POVERTY_VAR[cond] || "--bar");
  }
  return cssVar(row.unreliable ? "--bar-ref" : "--bar");
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

// Barras apiladas 100% Sí/No (indicadores de proporción)
// onDrill(level, label): si se pasa, cada barra es clicable para abrir su desglose.
export function ProportionBarChart({ rows, cross, onDrill }) {
  const { theme } = useTheme();
  const sorted = useMemo(() => [...rows].sort((a, b) => b.estimate - a.estimate), [rows]);

  const option = useMemo(() => {
    const cats = sorted.map((r) => prettyLevel(String(r.level).replace(/^.+ \/ /, "")));
    const byCat = Object.fromEntries(sorted.map((r, i) => [i, r]));
    const yes = sorted.map((r) => ({
      value: +r.estimate,
      ref: r.unreliable,
      itemStyle: {
        color: colorYes(r, cross),
        borderColor: cssVar("--surface"),
        borderWidth: 2,
        ...(r.unreliable ? { borderColor: cssVar("--warn-line"), borderWidth: 1.4, borderType: "dashed" } : {}),
      },
    }));
    const no = sorted.map((r) => 100 - r.estimate);
    return {
      grid: { left: 8, right: 56, top: 8, bottom: 28, containLabel: true },
      tooltip: {
        trigger: "axis", axisPointer: { type: "shadow" }, ...tipCss(),
        formatter: (ps) => {
          const r = byCat[ps[0].dataIndex];
          const q = r.unreliable ? "Referencial (CV > 15%)" : "Confiable";
          return `<b>${prettyLevel(r.level)}</b><br/>Sí: <b>${n1(r.estimate)}%</b> · No: <b>${n1(100 - r.estimate)}%</b>`
            + `<br/>IC 95% [${n1(r.ci_lower)} – ${n1(r.ci_upper)}] · ${q}`;
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
          name: "Sí", type: "bar", stack: "t", data: yes, barMaxWidth: 26,
          cursor: onDrill ? "pointer" : "default",
          label: {
            show: true, position: "insideRight", color: "#fff",
            fontFamily: MONO, fontWeight: 600, fontSize: 11.5,
            formatter: (p) => `${n1(p.value)}%${p.data.ref ? "  ▲" : ""}`,
          },
        },
        { name: "No", type: "bar", stack: "t", data: no, barMaxWidth: 26,
          cursor: onDrill ? "pointer" : "default",
          itemStyle: { color: cssVar("--no") } },
      ],
    };
  }, [sorted, cross, theme, onDrill]);

  const h = Math.max(220, sorted.length * 30 + 48);
  const onEvents = onDrill
    ? { click: (e) => { const r = sorted[e.dataIndex]; if (r) onDrill(r.level, prettyLevel(r.level)); } }
    : undefined;
  return <ReactECharts option={option} style={{ height: h }} notMerge onEvents={onEvents} />;
}

// Desglose por categorías (distribución, % por etiqueta)
// restLabel: etiqueta del "resto" (p. ej. "Sin red pública"); si se pasa, esa barra
// va siempre al final y en gris, separada de las categorías del indicador.
export function CategoryBarChart({ rows, restLabel }) {
  const { theme } = useTheme();
  const sorted = useMemo(() => {
    const main = rows.filter((r) => !restLabel || String(r.level) !== restLabel)
                     .sort((a, b) => b.estimate - a.estimate);
    const rest = restLabel ? rows.filter((r) => String(r.level) === restLabel) : [];
    return [...main, ...rest];   // el "resto" siempre al final
  }, [rows, restLabel]);
  const option = useMemo(() => {
    const cats = sorted.map((r) => String(r.level));
    const byCat = Object.fromEntries(sorted.map((r, i) => [i, r]));
    const isRest = (r) => restLabel && String(r.level) === restLabel;
    return {
      grid: { left: 8, right: 64, top: 8, bottom: 28, containLabel: true },
      tooltip: {
        trigger: "axis", axisPointer: { type: "shadow" }, ...tipCss(),
        formatter: (ps) => {
          const r = byCat[ps[0].dataIndex];
          const q = r.unreliable ? "Referencial (CV > 15%)" : "Confiable";
          return `<b>${r.level}</b><br/><b>${n1(r.estimate)}%</b>`
            + `<br/>IC 95% [${n1(r.ci_lower)} – ${n1(r.ci_upper)}] · CV ${n1(r.cv)}%<br/>${q}`;
        },
      },
      xAxis: {
        type: "value", min: 0,
        axisLabel: { formatter: "{value}%", color: cssVar("--muted") },
        splitLine: { lineStyle: { color: cssVar("--grid") } },
      },
      yAxis: {
        type: "category", data: cats, inverse: true,
        axisLabel: { color: cssVar("--ink-2"), width: 190, overflow: "truncate" },
        axisLine: { lineStyle: { color: cssVar("--line") } },
        axisTick: { show: false },
      },
      series: [{
        type: "bar", barMaxWidth: 24,
        data: sorted.map((r) => ({
          value: +r.estimate,
          itemStyle: {
            color: cssVar(isRest(r) ? "--no" : (r.unreliable ? "--bar-ref" : "--bar")),
            borderRadius: [0, 3, 3, 0],
          },
        })),
        label: {
          show: true, position: "right", color: cssVar("--ink-2"),
          fontFamily: MONO, fontWeight: 600, fontSize: 11.5,
          formatter: (p) => `${n1(p.value)}%${sorted[p.dataIndex].unreliable ? "  ▲" : ""}`,
        },
      }],
    };
  }, [sorted, theme, restLabel]);
  const h = Math.max(200, sorted.length * 34 + 48);
  return <ReactECharts option={option} style={{ height: h }} notMerge />;
}

// Barras simples (promedios en S/, totales en conteo)
export function SimpleBarChart({ rows, format }) {
  const { theme } = useTheme();
  const sorted = useMemo(() => [...rows].sort((a, b) => b.estimate - a.estimate), [rows]);
  const option = useMemo(() => {
    const cats = sorted.map((r) => prettyLevel(r.level));
    const byCat = Object.fromEntries(sorted.map((r, i) => [i, r]));
    return {
      grid: { left: 8, right: 80, top: 8, bottom: 28, containLabel: true },
      tooltip: {
        trigger: "axis", axisPointer: { type: "shadow" }, ...tipCss(),
        formatter: (ps) => {
          const r = byCat[ps[0].dataIndex];
          const q = r.unreliable ? "Referencial (CV > 15%)" : "Confiable";
          return `<b>${prettyLevel(r.level)}</b><br/>${fmtValue(r.estimate, format)}`
            + `<br/>IC 95% [${fmtValue(r.ci_lower, format)} – ${fmtValue(r.ci_upper, format)}] · ${q}`;
        },
      },
      xAxis: {
        type: "value", axisLabel: { color: cssVar("--muted"),
          formatter: (v) => (format === "soles" ? `S/ ${n0(v)}` : n0(v)) },
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
          value: +r.estimate,
          itemStyle: { color: cssVar(r.unreliable ? "--bar-ref" : "--bar"), borderRadius: [0, 3, 3, 0] },
        })),
        label: {
          show: true, position: "right", color: cssVar("--ink-2"),
          fontFamily: MONO, fontWeight: 600, fontSize: 11.5,
          formatter: (p) => fmtValue(p.value, format) + (sorted[p.dataIndex].unreliable ? "  ▲" : ""),
        },
      }],
    };
  }, [sorted, format, theme]);
  const h = Math.max(200, sorted.length * 34 + 48);
  return <ReactECharts option={option} style={{ height: h }} notMerge />;
}

// Mapa coroplético del Perú (departamentos)
let GEO_PROMISE = null;
function loadGeo() {
  if (!GEO_PROMISE) {
    GEO_PROMISE = fetch(`${import.meta.env.BASE_URL}geo/peru_departamentos.geojson`)
      .then((r) => r.json())
      .then((geo) => { echarts.registerMap("peru_dep", geo); return true; })
      .catch(() => false);
  }
  return GEO_PROMISE;
}

export function ChoroplethMap({ rows, format, hot, setHot }) {
  const { theme } = useTheme();
  const [ready, setReady] = useState(false);
  const ref = useRef(null);
  useEffect(() => { loadGeo().then(setReady); }, []);

  const byGeo = useMemo(
    () => Object.fromEntries(rows.map((r) => [toGeoName(r.level), r])), [rows]);

  const option = useMemo(() => {
    const vals = rows.map((r) => r.estimate);
    const isPct = format === "porcentaje";
    const qc = ["--q1", "--q2", "--q3", "--q4", "--q5"].map(cssVar);
    const visualMap = isPct
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
          text: [format === "soles" ? "S/ más" : "más", "menos"],
          textStyle: { color: cssVar("--ink-2"), fontSize: 11 },
        };
    return {
      tooltip: {
        trigger: "item", ...tipCss(),
        formatter: (p) => {
          const r = byGeo[p.name];
          if (!r) return `<b>${p.name}</b><br/>sin dato`;
          const q = r.unreliable ? "Referencial (CV > 15%)" : "Confiable";
          return `<b>${prettyLevel(r.level)}</b><br/>${fmtValue(r.estimate, format)}`
            + `<br/>IC 95% [${fmtValue(r.ci_lower, format)} – ${fmtValue(r.ci_upper, format)}]`
            + `<br/>CV ${n1(r.cv)}% · ${q}`;
        },
      },
      visualMap,
      series: [{
        type: "map", map: "peru_dep", nameProperty: "NOMBDEP", roam: false,
        aspectScale: 1,
        layoutCenter: ["50%", "50%"], layoutSize: "98%",
        itemStyle: { borderColor: cssVar("--map-line"), borderWidth: 1, areaColor: cssVar("--surface-2") },
        emphasis: {
          itemStyle: { borderColor: cssVar("--ink"), borderWidth: 1.8 },
          label: { show: true, fontWeight: 700 },
        },
        select: { disabled: true },
        label: {
          show: true, fontSize: 9, fontWeight: 600, color: "#fff",
          textBorderColor: "rgba(0,0,0,.55)", textBorderWidth: 2.6,
        },
        data: rows.map((r) => ({
          name: toGeoName(r.level),
          value: r.estimate,
          itemStyle: r.unreliable
            ? { borderColor: cssVar("--warn-line"), borderWidth: 1.5, borderType: "dashed" }
            : {},
        })),
      }],
    };
  }, [rows, format, theme, byGeo]);

  // Resalta en el mapa el departamento activo del ranking.
  useEffect(() => {
    const inst = ref.current?.getEchartsInstance?.();
    if (!inst) return;
    inst.dispatchAction({ type: "downplay", seriesIndex: 0 });
    if (hot) inst.dispatchAction({ type: "highlight", seriesIndex: 0, name: toGeoName(hot) });
  }, [hot, ready]);

  if (!ready) return <div className="sk" style={{ height: "100%", minHeight: 320 }} />;
  return (
    <ReactECharts
      ref={ref}
      option={option}
      style={{ height: "100%", minHeight: 320 }}
      notMerge
      onEvents={{
        mouseover: (e) => { const r = byGeo[e.name]; if (r && setHot) setHot(r.level); },
        mouseout: () => setHot && setHot(null),
      }}
    />
  );
}
