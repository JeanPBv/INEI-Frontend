// Gráficos con ECharts: barras apiladas Sí/No (proporciones), barras simples
// (promedios/totales) y mapa coroplético del Perú.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import { RefreshCw } from "lucide-react";
import { MapSkeleton } from "./skeletons.jsx";
import { useTheme } from "../lib/theme.jsx";
import { POVERTY_VAR, POVERTY_ORDER } from "../lib/constants.js";
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

// Separa el nivel de una celda del cruce "Condición / Área" en sus dos partes.
// Sin cruce (o cruce nacional) devuelve el área vacía.
function splitCross(level) {
  const parts = String(level).split(" / ");
  return parts.length > 1 ? { pov: parts[0], area: parts[1] } : { pov: parts[0], area: "" };
}
// Etiqueta legible de una celda del cruce: "No pobre · Urbano" (o solo "No pobre").
function crossLabel(r) {
  return r.area ? `${r.pov} · ${prettyLevel(r.area)}` : r.pov;
}

// Leyenda de color del cruce: cada tono = una condición de pobreza.
function PovertyLegend() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16,
                  margin: "0 2px 12px", fontSize: 12, color: cssVar("--muted") }}>
      <span style={{ color: cssVar("--ink-2"), fontWeight: 600 }}>Condición de pobreza:</span>
      {[...POVERTY_ORDER].reverse().map((p) => (
        <span key={p} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: `var(${POVERTY_VAR[p]})` }} />
          {p}
        </span>
      ))}
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 12, height: 12, borderRadius: 3, background: cssVar("--no"),
                       border: `1px solid ${cssVar("--line")}` }} />
        resto (No)
      </span>
    </div>
  );
}

// Barras apiladas 100% Sí/No (indicadores de proporción)
// onDrill(level, label): si se pasa, cada barra es clicable para abrir su desglose.
// En el cruce por pobreza, las barras se agrupan por área y se etiquetan por
// condición (el color codifica la condición, explicado en la leyenda).
export function ProportionBarChart({ rows, cross, onDrill }) {
  const { theme } = useTheme();

  // Orden: sin cruce, por valor desc. Con cruce, agrupado por área (el grupo con
  // más acceso arriba) y dentro de cada área No pobre → Pobre no extremo → Pobre extremo.
  const sorted = useMemo(() => {
    if (!cross) return [...rows].sort((a, b) => b.estimate - a.estimate);
    const withMeta = rows.map((r) => ({ ...r, ...splitCross(r.level) }));
    const areas = [...new Set(withMeta.map((r) => r.area))];
    const areaScore = (a) => {
      const np = withMeta.find((r) => r.area === a && r.pov === "No pobre");
      const vals = withMeta.filter((r) => r.area === a).map((r) => r.estimate);
      return np ? np.estimate : Math.max(...vals);
    };
    areas.sort((a, b) => areaScore(b) - areaScore(a));
    const povRank = (p) => { const i = POVERTY_ORDER.indexOf(p); return i < 0 ? 99 : i; };
    const out = [];
    areas.forEach((a) => {
      withMeta.filter((r) => r.area === a)
        .sort((x, y) => povRank(y.pov) - povRank(x.pov))   // No pobre primero (arriba)
        .forEach((r) => out.push(r));
    });
    return out;
  }, [rows, cross]);

  const option = useMemo(() => {
    const cats = sorted.map((r) => cross ? r.level : prettyLevel(String(r.level).replace(/^.+ \/ /, "")));
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
          const head = cross ? crossLabel(r) : prettyLevel(r.level);
          return `<b>${head}</b><br/>Sí: <b>${n1(r.estimate)}%</b> · No: <b>${n1(100 - r.estimate)}%</b>`
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
        axisLabel: {
          color: cssVar("--ink-2"),
          // En el cruce con área, etiqueta de dos líneas: área (atenuada) + condición.
          formatter: cross
            ? (val, idx) => {
                const r = sorted[idx];
                return r.area ? `{a|${prettyLevel(r.area)}}\n{p|${r.pov}}` : `{p|${r.pov}}`;
              }
            : undefined,
          rich: cross ? {
            a: { color: cssVar("--muted"), fontSize: 10, lineHeight: 13 },
            p: { color: cssVar("--ink-2"), fontWeight: 600, fontSize: 12, lineHeight: 15 },
          } : undefined,
        },
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

  const h = Math.max(220, sorted.length * (cross ? 40 : 30) + 48);
  const onEvents = onDrill
    ? { click: (e) => {
        const r = sorted[e.dataIndex];
        if (r) onDrill(r.level, cross ? crossLabel(r) : prettyLevel(r.level));
      } }
    : undefined;
  return (
    <>
      {cross && <PovertyLegend />}
      <ReactECharts option={option} style={{ height: h }} notMerge onEvents={onEvents} />
    </>
  );
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
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((geo) => { echarts.registerMap("peru_dep", geo); return true; })
      .catch(() => { GEO_PROMISE = null; return false; });   // permite reintentar
  }
  return GEO_PROMISE;
}

// Color de cada departamento según la MISMA escala del visualMap, para computar
// el relleno del estado emphasis y que el hover no cambie el color del mapa
// (solo el borde). Porcentaje = 5 clases; soles/conteo = gradiente continuo.
function mapColor(value, format, mn, mx) {
  const qc = ["--q1", "--q2", "--q3", "--q4", "--q5"].map(cssVar);
  if (format === "porcentaje") {
    if (value < 10) return qc[0];
    if (value < 20) return qc[1];
    if (value < 30) return qc[2];
    if (value < 40) return qc[3];
    return qc[4];
  }
  const t = mx > mn ? (value - mn) / (mx - mn) : 0;
  return echarts.color.lerp(Math.max(0, Math.min(1, t)), qc);
}

export function ChoroplethMap({ rows, format, hot, setHot, selected, setSelected }) {
  const { theme } = useTheme();
  // Estado del GeoJSON del mapa: loading | ok | error (con reintento, sin skeleton infinito).
  const [geo, setGeo] = useState("loading");
  const ref = useRef(null);
  const loadIt = useCallback(() => {
    setGeo("loading");
    loadGeo().then((ok) => setGeo(ok ? "ok" : "error"));
  }, []);
  useEffect(() => { loadIt(); }, [loadIt]);

  const byGeo = useMemo(
    () => Object.fromEntries(rows.map((r) => [toGeoName(r.level), r])), [rows]);

  const option = useMemo(() => {
    const vals = rows.map((r) => r.estimate);
    const mn = Math.min(...vals), mx = Math.max(...vals);
    const isPct = format === "porcentaje";
    const hiBorder = cssVar("--focus");   // azul institucional: hover y selección
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
        // Hover: solo borde azul (el relleno se mantiene vía areaColor por ítem);
        // sin el amarillo ni el texto rojo del emphasis por defecto de ECharts.
        emphasis: {
          focus: "none",
          itemStyle: { borderColor: hiBorder, borderWidth: 2.4, borderType: "solid" },
          label: { show: true, fontWeight: 700, color: "#fff",
            textBorderColor: "rgba(0,0,0,.6)", textBorderWidth: 2.6 },
        },
        select: { disabled: true },
        label: {
          show: true, fontSize: 9, fontWeight: 600, color: "#fff",
          textBorderColor: "rgba(0,0,0,.55)", textBorderWidth: 2.6,
        },
        data: rows.map((r) => {
          const c = mapColor(r.estimate, format, mn, mx);
          const isSel = selected != null && toGeoName(selected) === toGeoName(r.level);
          const style = {};
          if (r.unreliable) { style.borderColor = cssVar("--warn-line"); style.borderWidth = 1.5; style.borderType = "dashed"; }
          if (isSel) { style.borderColor = hiBorder; style.borderWidth = 2.6; style.borderType = "solid"; }
          return {
            name: toGeoName(r.level),
            value: r.estimate,
            itemStyle: style,
            // mismo relleno en hover/selección → no cambia el color del indicador.
            emphasis: { itemStyle: { areaColor: c, borderColor: hiBorder, borderWidth: 2.4, borderType: "solid" } },
            select: { itemStyle: { areaColor: c, borderColor: hiBorder, borderWidth: 2.6, borderType: "solid" } },
          };
        }),
      }],
    };
  }, [rows, format, theme, byGeo, selected]);

  // Resalta en el mapa el departamento activo del ranking (hover) tras cada render.
  useEffect(() => {
    const inst = ref.current?.getEchartsInstance?.();
    if (!inst) return;
    inst.dispatchAction({ type: "downplay", seriesIndex: 0 });
    if (hot) inst.dispatchAction({ type: "highlight", seriesIndex: 0, name: toGeoName(hot) });
  }, [hot, geo, selected]);

  if (geo === "loading") return <MapSkeleton label="Cargando mapa…" />;
  if (geo === "error") return (
    <div className="mapfail" role="alert">
      <p>No se pudo cargar el mapa del Perú.</p>
      <button className="btn btn-sm" onClick={loadIt}><RefreshCw size={14} /> Reintentar</button>
    </div>
  );
  return (
    <ReactECharts
      ref={ref}
      option={option}
      style={{ height: "100%", minHeight: 320 }}
      notMerge
      onEvents={{
        mouseover: (e) => { const r = byGeo[e.name]; if (r && setHot) setHot(r.level); },
        mouseout: () => setHot && setHot(null),
        click: (e) => { const r = byGeo[e.name]; if (r && setSelected) setSelected(r.level); },
      }}
    />
  );
}
