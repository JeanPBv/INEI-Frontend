// Guía de uso del servicio y de la API. Las tablas de indicadores y años salen
// en vivo del catálogo (/indicators, /years).
import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../lib/api.js";
import { MODULE_LABEL } from "../lib/constants.js";

const SECTIONS = [
  { id: "intro", label: "Introducción" },
  { id: "leer-cifra", label: "Cómo leer una cifra" },
  { id: "api", label: "La API" },
  { id: "cruce", label: "Comparación por pobreza" },
  { id: "desglose", label: "Desglose por categorías" },
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

  // Resalta en el índice la sección que está a la vista.
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

  const goTo = (id) => (e) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); setActive(id); }
  };

  return (
    <div className="content">
      <div className="doc-wrap">
        <nav className="doc-toc" aria-label="Contenido">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className={active === s.id ? "active" : ""} onClick={goTo(s.id)}>
              {s.label}
            </a>
          ))}
        </nav>

        <div className="doc-main">
          <section id="intro" className="doc-sec">
            <h2>Introducción</h2>
            <p>
              Esta plataforma permite consultar y analizar indicadores sociales y económicos del Perú a partir
              de los microdatos de la Encuesta Nacional de Hogares (ENAHO), elaborada por el Instituto Nacional
              de Estadística e Informática (INEI).
            </p>
            <p>
              Los resultados pueden explorarse por año y ámbito geográfico para conocer diferencias entre zonas
              urbanas y rurales, regiones naturales y departamentos. Algunos indicadores también permiten
              comparaciones según condición de pobreza (<a href="#cruce" onClick={goTo("cruce")}>la comparación</a>)
              y el examen de sus categorías de origen (<a href="#desglose" onClick={goTo("desglose")}>el desglose</a>).
            </p>
            <p>
              Las estimaciones consideran el diseño muestral de la encuesta e incluyen medidas de precisión
              (error estándar, coeficiente de variación e intervalo de confianza al 95%) que facilitan
              su interpretación. La disponibilidad de cada indicador depende del año, del módulo de datos y del
              ámbito de consulta. Años cargados: {range}; módulos 01 (Vivienda), 34 (Sumaria) y, a nivel de
              persona, 200 (miembros del hogar), 300 (educación), 400 (salud) y 500 (empleo).
            </p>
            <p className="doc-muted" style={{ fontSize: 13 }}>
              Proyecto académico desarrollado con microdatos de la ENAHO del INEI. No constituye un portal
              oficial del INEI; las cifras son estimaciones propias y pueden diferir de las publicaciones oficiales.
            </p>
          </section>

          <section id="leer-cifra" className="doc-sec">
            <h2>Cómo leer una cifra</h2>
            <p>Ejemplo: <i>pobreza monetaria total, nacional, 2024 = 27.6%</i>.</p>
            <dl className="doc-dl">
              <dt>Estimación (<code>estimate</code>)</dt>
              <dd>El valor del indicador calculado a partir de la muestra (aquí, 27.6% de las personas).</dd>
              <dt>Error estándar (<code>standard_error</code>)</dt>
              <dd>Mide cuánto puede variar la estimación por calcularse con una muestra y no con toda la
                población. En general, un error estándar menor indica una estimación más precisa.</dd>
              <dt>Intervalo de confianza 95% (<code>ci_lower</code>, <code>ci_upper</code>)</dt>
              <dd>Rango que expresa la incertidumbre de la estimación. Un intervalo al 95% está construido para
                cubrir el valor poblacional en aproximadamente el 95% de las muestras repetidas bajo las mismas
                condiciones. Se calcula como <code>estimación ± 1.96·EE</code> (acotado a [0, 100] en proporciones).</dd>
              <dt>Coeficiente de variación (<code>cv</code>)</dt>
              <dd>Relaciona el error estándar con el tamaño de la estimación (<code>EE ÷ estimación × 100</code>):
                un valor bajo indica mayor precisión relativa y permite comparar la precisión entre indicadores.</dd>
              <dt>Tamaño de la muestra (<code>sample_size</code>)</dt>
              <dd>Número de registros de la muestra (hogares o personas, según el indicador) usados en el cálculo,
                dentro del universo elegible.</dd>
            </dl>
            <h3>Confiable vs. referencial</h3>
            <p>
              Siguiendo el criterio habitual en estadística oficial, una estimación se marca como
              <span className="doc-ok"> confiable</span> cuando su CV ≤ 15%, y
              <span className="doc-warn"> referencial ▲</span> cuando su CV &gt; 15% (menor precisión, casi
              siempre por muestra pequeña: departamentos con pocos casos, comparaciones muy finas o indicadores
              poco frecuentes). Llegan marcadas con <code>unreliable: true</code> y deben interpretarse con cautela.
              Este criterio evalúa la <b>precisión muestral</b>: no garantiza por sí solo la ausencia de otros
              errores (sesgos, denominadores o variables).
            </p>
          </section>

          <section id="api" className="doc-sec">
            <h2>La API</h2>
            <p>URL base: <code>{API_BASE}</code>. Toda respuesta tiene la forma <code>{"{ meta, data }"}</code> (salvo la descarga CSV).</p>

            <h3>Endpoints</h3>
            {[
              { m: "GET", p: "/indicators", d: "Catálogo de indicadores para la UI." },
              { m: "GET", p: "/levels", d: "Niveles de inferencia válidos." },
              { m: "GET", p: "/years", d: "Años de datos cargados." },
              { m: "GET", p: "/estimates", d: "Estimación de un indicador con EE/CV/IC.", q: "indicator, level, year, format" },
              { m: "GET", p: "/crosstabs", d: "Cruce de un indicador por condición de pobreza.", q: "indicator, level, year, cross_by, format" },
              { m: "GET", p: "/distribution", d: "Desglose por categorías de un indicador en un subámbito.", q: "indicator, level, subgroup, year, format" },
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
    "formula": "proporcion", "weight": "w_per",
    "universe": "Personas (población total)",
    "catalog_version": "1.0", "data_version": "enaho2024-...",
    "data_generated": "2026-11-18T01:02:09",
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
            <p>Agrega <code>&format=csv</code> a <code>/estimates</code>, <code>/crosstabs</code> o <code>/distribution</code> para bajar los resultados como CSV.</p>

            <h3>Códigos de error</h3>
            <table className="doc-table">
              <thead><tr><th>Código</th><th>Clave</th><th>Cuándo ocurre</th></tr></thead>
              <tbody>
                <tr><td>404</td><td><code>unknown_indicator</code></td><td>El indicador no está en el catálogo.</td></tr>
                <tr><td>404</td><td><code>year_unavailable</code></td><td>No hay datos preparados para ese año.</td></tr>
                <tr><td>404</td><td><code>no_data</code></td><td>No hay datos para ese subámbito (p. ej. un departamento mal escrito en <code>/distribution</code>).</td></tr>
                <tr><td>422</td><td><code>level_not_allowed</code></td><td>El indicador no se publica a ese nivel (p. ej. pobreza extrema por departamento).</td></tr>
                <tr><td>400</td><td><code>invalid_level</code></td><td>El ámbito no es un nivel de inferencia válido.</td></tr>
                <tr><td>400</td><td><code>invalid_format</code></td><td>El <code>format</code> no es <code>json</code> ni <code>csv</code>.</td></tr>
                <tr><td>400</td><td><code>indicator_not_crossable</code></td><td>El indicador no admite cruce por pobreza.</td></tr>
                <tr><td>400</td><td><code>indicator_not_breakdownable</code></td><td>El indicador no tiene desglose por categorías.</td></tr>
                <tr><td>504</td><td><code>engine_timeout</code></td><td>El motor R excedió el tiempo límite de la consulta.</td></tr>
                <tr><td>502</td><td><code>engine_error</code></td><td>Error interno del motor estadístico en R.</td></tr>
              </tbody>
            </table>

            <p style={{ marginTop: 14 }}>
              Documentación interactiva (Swagger) autogenerada por FastAPI:{" "}
              <a href={`${API_BASE}/docs`} target="_blank" rel="noreferrer">{API_BASE}/docs</a>.
            </p>
          </section>

          <section id="cruce" className="doc-sec">
            <h2>La comparación por pobreza</h2>
            <p>
              Una cifra general puede esconder diferencias entre grupos. El acceso a agua por red, por ejemplo,
              suele variar mucho entre hogares pobres y no pobres aunque el promedio nacional sea alto.
              La comparación examina el indicador según la condición de pobreza del hogar (pobre extremo,
              pobre no extremo, no pobre) para observar la brecha. En la pantalla es el interruptor “Comparar
              según condición de pobreza”; por API, <code>/crosstabs</code>. Solo aplica a los indicadores que
              admiten esta comparación.
            </p>
            <p>Sirve para responder cosas como:</p>
            <ul>
              <li>Agua por red × pobreza: ¿los hogares pobres acceden menos que los no pobres?</li>
              <li>Tasa de ocupación × pobreza: ¿cambia la ocupación entre pobres y no pobres?</li>
              <li>Seguro de salud × pobreza: ¿quién queda más desprotegido?</li>
              <li>Analfabetismo × pobreza: ¿se concentra en la población pobre?</li>
            </ul>
            <p>
              El resultado trae una fila por condición de pobreza (cada una con su IC 95%) y, arriba, un resumen
              de la brecha: la diferencia en puntos porcentuales entre no pobre y pobre extremo. Si los IC 95%
              no se solapan, hay evidencia de una diferencia; si se solapan, la comparación no es concluyente y
              haría falta una prueba formal con el diseño muestral. El resumen muestra la diferencia observada,
              no una prueba de significancia.
            </p>
            <Code>{`GET ${API_BASE}/crosstabs?indicator=agua_red_publica&level=nacional&year=2024&cross_by=pobreza`}</Code>
          </section>

          <section id="desglose" className="doc-sec">
            <h2>Desglose por categorías</h2>
            <p>
              Un indicador de proporción distingue dos modalidades (por ejemplo, hogares con agua por red
              pública y el resto). El desglose permite examinar las categorías de origen que componen el
              indicador, dentro de un subámbito concreto. En la pantalla se activa haciendo clic en una barra
              (Urbano, una región, un departamento) o en “Ver desglose” a nivel nacional; por API es
              <code> /distribution</code>.
            </p>
            <ul>
              <li>Para agua y desagüe (red pública = unión de varias categorías), muestra solo las categorías
                del indicador (que suman el porcentaje del titular) más una barra gris <code>Sin red pública</code> con el
                resto, hasta 100%.</li>
              <li>Para el resto (pobreza, ocupación, etc.) muestra la distribución completa de la variable, que suma 100%.</li>
              <li>Cada categoría trae su IC 95% y CV; las referenciales (CV &gt; 15%) van marcadas con ▲.</li>
            </ul>
            <Code>{`GET ${API_BASE}/distribution?indicator=agua_red_publica&level=area&subgroup=urbano&year=2024`}</Code>
          </section>

          <section id="indicadores" className="doc-sec">
            <h2>Indicadores</h2>
            <p>Catálogo actual del servicio ({catalog.length} indicadores), desde <code>/indicators</code>.</p>
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

          <section id="metodologia" className="doc-sec">
            <h2>Metodología</h2>
            <dl className="doc-dl">
              <dt>Diseño muestral</dt>
              <dd><code>svydesign(ids=~conglome, strata=~estrato, weights=peso, nest=TRUE)</code>; varianza por linealización de Taylor.</dd>
              <dt>Pesos (cada módulo trae el suyo)</dt>
              <dd>hogar <code>factor07</code>; pobreza y gasto (personas) <code>factor07 × mieperho</code>; educación <code>factora07</code>; salud <code>factor07</code>; empleo <code>fac500a</code>.</dd>
              <dt>Universos</dt>
              <dd>vivienda sobre entrevistas realizadas (RESULT ∈ {"{1,2}"}); analfabetismo en personas de 15+; ocupación en la PET (14+). Un hogar o persona sin dato queda como faltante, no como 0.</dd>
              <dt>Merge</dt>
              <dd>hogar = Sumaria + Vivienda por <code>conglome+vivienda+hogar</code>; persona = padrón (200) + educación/salud/empleo por <code>+codperso</code>, con la pobreza del hogar bajada a cada persona.</dd>
              <dt>IC y confiabilidad</dt>
              <dd><code>estimación ± 1.96·EE</code>, acotado a [0, 100] en proporciones; CV &gt; 15% marca la cifra como referencial.</dd>
              <dt>Ámbitos válidos</dt>
              <dd>nacional, área (urbano/rural), región natural (costa/sierra/selva) y departamento. No se admiten distritos.</dd>
              <dt>Motor</dt>
              <dd>R (<code>survey</code>) en un proceso persistente con caché; <code>rpy2</code> en proceso si está disponible, con fallback a un Rscript por consulta.</dd>
            </dl>
          </section>

          <section id="fuentes" className="doc-sec">
            <h2>Fuentes y notas</h2>
            <dl className="doc-dl">
              <dt>Datos</dt>
              <dd>microdatos ENAHO del INEI: Vivienda (<code>Enaho01-AAAA-100</code>), Sumaria (<code>Sumaria-AAAA</code>)
                y, por persona, miembros del hogar (<code>…-200</code>), educación (<code>…-300</code>), salud
                (<code>…-400</code>) y empleo (<code>…-500</code>). Las etiquetas de cada categoría se leen del
                propio <code>.sav</code> de cada año.</dd>
              <dt>Gasto</dt>
              <dd>el gasto per cápita es nominal (soles corrientes); comparar entre años requiere un deflactor.</dd>
              <dt>Mapa</dt>
              <dd>GeoJSON de departamentos del Perú.</dd>
              <dt>Pobreza</dt>
              <dd>cifra oficial de referencia: nacional 2024 ≈ 27.6%.</dd>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
