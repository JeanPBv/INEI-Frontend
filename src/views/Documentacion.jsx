// Vista Documentación: guía de uso del servicio y de la API. Las tablas de
// indicadores y años se alimentan en vivo del catálogo (/indicators, /years).
import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../lib/api.js";
import { MODULE_LABEL } from "../lib/constants.js";

const SECTIONS = [
  { id: "intro", label: "Introducción" },
  { id: "leer-cifra", label: "Cómo leer una cifra" },
  { id: "api", label: "La API" },
  { id: "indicadores", label: "Indicadores" },
  { id: "metodologia", label: "Metodología" },
  { id: "fuentes", label: "Fuentes y notas" },
];

const LEVEL_LABEL = {
  nacional: "Nacional", area: "Área", region_natural: "Región natural", departamento: "Departamento",
};

function Code({ children }) {
  return <pre className="doc-code">{children}</pre>;
}

export default function Documentacion({ meta }) {
  const catalog = meta?.catalog || [];
  const years = meta?.years || [];
  const [active, setActive] = useState("intro");

  const ys = useMemo(
    () => [...new Set(years.map((a) => a.year))].sort((a, b) => a - b), [years]);
  const range = ys.length
    ? (ys[0] === ys[ys.length - 1] ? `${ys[0]}` : `${ys[0]}–${ys[ys.length - 1]}`)
    : "—";

  // Scroll-spy: resalta en el índice la sección visible.
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );
    SECTIONS.forEach((s) => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  return (
    <div className="content">
      <div className="doc-wrap">
        <nav className="doc-toc" aria-label="Contenido">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className={active === s.id ? "active" : ""}>{s.label}</a>
          ))}
        </nav>

        <div className="doc-main">
          {/* 1 · Introducción */}
          <section id="intro" className="doc-sec">
            <h2>Introducción</h2>
            <p>
              Este servicio entrega <b>indicadores agregados de la ENAHO</b> (Encuesta Nacional de Hogares
              del INEI) aplicando el <b>diseño muestral</b> de la encuesta. Cada cifra se acompaña de su
              <b> error estándar (EE)</b>, <b>coeficiente de variación (CV)</b> e <b>intervalo de confianza al 95%</b>,
              para que se sepa qué tan precisa es.
            </p>
            <p>
              Años disponibles: <b>{range}</b>. Módulos usados: <b>01 Vivienda</b> y <b>34 Sumaria</b>.
              El cálculo estadístico corre en R (paquete <code>survey</code>); la API solo lo expone.
            </p>
          </section>

          {/* 2 · Cómo leer una cifra */}
          <section id="leer-cifra" className="doc-sec">
            <h2>Cómo leer una cifra</h2>
            <p>Ejemplo: <i>pobreza monetaria total, nacional, 2024 = 27.6%</i>.</p>
            <dl className="doc-dl">
              <dt>Estimación (<code>estimate</code>)</dt>
              <dd>El valor del indicador calculado a partir de la muestra (p. ej. <b>27.6%</b> de las personas).</dd>
              <dt>Error estándar (<code>standard_error</code>)</dt>
              <dd>Cuánto variaría la estimación si se repitiera la encuesta con otra muestra. Más chico = más preciso.</dd>
              <dt>Intervalo de confianza 95% (<code>ci_lower</code>, <code>ci_upper</code>)</dt>
              <dd>El rango donde está el valor real con 95% de confianza: <code>estimación ± 1.96·EE</code>.</dd>
              <dt>Coeficiente de variación (<code>cv</code>)</dt>
              <dd>El EE relativo al tamaño de la cifra (<code>EE ÷ estimación × 100</code>). Permite comparar la confiabilidad entre indicadores.</dd>
              <dt>n muestral (<code>sample_size</code>)</dt>
              <dd>Número de hogares o personas de la muestra usados en el cálculo.</dd>
            </dl>
            <h3>Confiable vs. referencial</h3>
            <p>
              Según el criterio del INEI, una estimación es <b className="doc-ok">confiable</b> cuando su
              <b> CV ≤ 15%</b>, y <b className="doc-warn">referencial ▲</b> cuando su <b>CV &gt; 15%</b>
              {" "}(poca precisión, normalmente por muestra pequeña: departamentos chicos, cruces muy finos o
              indicadores poco frecuentes). En la respuesta llegan marcadas con <code>unreliable: true</code>; úsalas solo como referencia.
            </p>
          </section>

          {/* 3 · La API */}
          <section id="api" className="doc-sec">
            <h2>La API</h2>
            <p>URL base: <code>{API_BASE}</code>. Todas las respuestas tienen la forma <code>{"{ meta, data }"}</code> (salvo la descarga CSV).</p>

            <h3>Endpoints</h3>
            {[
              { m: "GET", p: "/indicators", d: "Catálogo de indicadores para la UI." },
              { m: "GET", p: "/levels", d: "Niveles de inferencia válidos." },
              { m: "GET", p: "/years", d: "Años de datos cargados." },
              { m: "GET", p: "/estimates", d: "Estimación de un indicador con EE/CV/IC.", q: "indicator, level, year, format" },
              { m: "GET", p: "/crosstabs", d: "Cruce de un indicador por condición de pobreza.", q: "indicator, level, year, cross_by, format" },
            ].map((e) => (
              <div key={e.p} className="doc-epcard">
                <div className="doc-ep">
                  <span className="doc-method">{e.m}</span>
                  <span className="doc-path">{e.p}</span>
                </div>
                <p>{e.d}{e.q && <> <span className="doc-muted">· params:</span> <code>{e.q}</code></>}</p>
              </div>
            ))}

            <h3>Ejemplo de petición</h3>
            <Code>{`GET ${API_BASE}/estimates?indicator=pobreza_total&level=nacional&year=2024`}</Code>
            <h3>Ejemplo de respuesta</h3>
            <Code>{`{
  "meta": {
    "source": "ENAHO", "year": 2024,
    "indicator": "pobreza_total", "level": "nacional",
    "confidence_level": 0.95, "cv_threshold": 15
  },
  "data": [
    {
      "level": "Nacional",
      "estimate": 27.58, "standard_error": 0.52, "cv": 1.88,
      "ci_lower": 26.56, "ci_upper": 28.60,
      "unreliable": false, "sample_size": 33691
    }
  ]
}`}</Code>

            <h3>Descarga CSV</h3>
            <p>Agrega <code>&format=csv</code> a <code>/estimates</code> o <code>/crosstabs</code> para descargar los resultados como CSV.</p>

            <h3>Códigos de error</h3>
            <table className="doc-table">
              <thead><tr><th>Código</th><th>Clave</th><th>Cuándo ocurre</th></tr></thead>
              <tbody>
                <tr><td>404</td><td><code>unknown_indicator</code></td><td>El indicador no está en el catálogo.</td></tr>
                <tr><td>404</td><td><code>year_unavailable</code></td><td>No hay datos preparados para ese año.</td></tr>
                <tr><td>422</td><td><code>level_not_allowed</code></td><td>El indicador no se publica a ese nivel (p. ej. pobreza extrema por departamento).</td></tr>
                <tr><td>400</td><td><code>invalid_level</code></td><td>El ámbito no es un nivel de inferencia válido.</td></tr>
              </tbody>
            </table>

            <p style={{ marginTop: 14 }}>
              Documentación interactiva (Swagger) autogenerada por FastAPI:{" "}
              <a href={`${API_BASE}/docs`} target="_blank" rel="noreferrer">{API_BASE}/docs</a>.
            </p>
          </section>

          {/* 4 · Indicadores (en vivo) */}
          <section id="indicadores" className="doc-sec">
            <h2>Indicadores</h2>
            <p>Catálogo actual del servicio ({catalog.length} indicadores). Se genera desde <code>/indicators</code>.</p>
            <div className="tablebox">
              <table className="doc-table">
                <thead>
                  <tr><th>Indicador</th><th>Módulo</th><th>Tipo</th><th>Unidad</th><th>Cruzable</th><th>Ámbitos</th></tr>
                </thead>
                <tbody>
                  {catalog.map((c) => (
                    <tr key={c.id}>
                      <td>{c.title}<br /><span className="doc-muted doc-mono">{c.id}</span></td>
                      <td>{MODULE_LABEL[c.module] || c.module}</td>
                      <td>{c.type}</td>
                      <td>{c.weight_unit || c.format}</td>
                      <td>{c.crossable ? "Sí" : "—"}</td>
                      <td>{(c.levels_allowed || []).map((a) => LEVEL_LABEL[a] || a).join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 5 · Metodología */}
          <section id="metodologia" className="doc-sec">
            <h2>Metodología</h2>
            <ul>
              <li><b>Diseño muestral:</b> <code>svydesign(ids=~conglome, strata=~estrato, weights=peso, nest=TRUE)</code>; varianza por linealización de Taylor.</li>
              <li><b>Pesos:</b> indicadores de hogar usan <code>factor07</code>; indicadores de persona (pobreza, gasto) usan <code>factor07 × mieperho</code>.</li>
              <li><b>Universo:</b> entrevistas realizadas (RESULT ∈ {"{1,2}"}); Sumaria es la espina del merge con Vivienda por <code>conglome+vivienda+hogar</code>.</li>
              <li><b>Umbral referencial:</b> CV &gt; 15% marca la cifra como referencial (<code>unreliable: true</code>).</li>
              <li><b>Ámbitos válidos:</b> nacional, área (urbano/rural), región natural (costa/sierra/selva) y departamento. No se admiten distritos.</li>
            </ul>
          </section>

          {/* 6 · Fuentes */}
          <section id="fuentes" className="doc-sec">
            <h2>Fuentes y notas</h2>
            <ul>
              <li><b>Datos:</b> microdatos ENAHO del INEI — módulo 01 (Vivienda, <code>Enaho01-AAAA-100</code>) y módulo 34 (Sumaria, <code>Sumaria-AAAA</code>).</li>
              <li><b>Gasto:</b> el gasto per cápita es <b>nominal</b> (soles corrientes); comparar entre años requiere un deflactor.</li>
              <li><b>Mapa:</b> GeoJSON de departamentos del Perú — revisar su licencia antes de publicar.</li>
              <li><b>Pobreza:</b> cifras oficiales de referencia — nacional 2024 ≈ 27.6%.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
