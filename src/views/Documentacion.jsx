// Vista Documentación: guía de uso del servicio para el usuario final y el
// consumidor de la API. Las tablas de indicadores y años se alimentan en vivo
// del catálogo (/indicadores, /anios) para no quedar desactualizadas.
import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../lib/api.js";

const SECCIONES = [
  { id: "intro", label: "Introducción" },
  { id: "leer-cifra", label: "Cómo leer una cifra" },
  { id: "api", label: "La API" },
  { id: "indicadores", label: "Indicadores" },
  { id: "metodologia", label: "Metodología" },
  { id: "fuentes", label: "Fuentes y notas" },
];

const AMB_LABEL = {
  nacional: "Nacional", area: "Área", region_natural: "Región natural", departamento: "Departamento",
};

function Code({ children }) {
  return <pre className="doc-code">{children}</pre>;
}

export default function Documentacion({ meta }) {
  const catalogo = meta?.catalogo || [];
  const anios = meta?.anios || [];
  const [activo, setActivo] = useState("intro");

  const years = useMemo(
    () => [...new Set(anios.map((a) => a.anio))].sort((a, b) => a - b), [anios]);
  const rango = years.length
    ? (years[0] === years[years.length - 1] ? `${years[0]}` : `${years[0]}–${years[years.length - 1]}`)
    : "—";

  // Scroll-spy: resalta en el índice la sección visible.
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActivo(vis[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );
    SECCIONES.forEach((s) => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  return (
    <div className="content">
      <div className="doc-wrap">
        {/* Índice */}
        <nav className="doc-toc" aria-label="Contenido">
          {SECCIONES.map((s) => (
            <a key={s.id} href={`#${s.id}`} className={activo === s.id ? "active" : ""}>{s.label}</a>
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
              Años disponibles: <b>{rango}</b>. Módulos usados: <b>01 Vivienda</b> y <b>34 Sumaria</b>.
              El cálculo estadístico corre en R (paquete <code>survey</code>); la API solo lo expone.
            </p>
          </section>

          {/* 2 · Cómo leer una cifra */}
          <section id="leer-cifra" className="doc-sec">
            <h2>Cómo leer una cifra</h2>
            <p>Ejemplo: <i>pobreza monetaria total, nacional, 2024 = 27.6%</i>.</p>
            <dl className="doc-dl">
              <dt>Estimación</dt>
              <dd>El valor del indicador calculado a partir de la muestra (p. ej. <b>27.6%</b> de las personas).</dd>
              <dt>Error estándar (EE)</dt>
              <dd>Cuánto variaría la estimación si se repitiera la encuesta con otra muestra. Más chico = más preciso.</dd>
              <dt>Intervalo de confianza 95% (IC)</dt>
              <dd>El rango donde está el valor real con 95% de confianza: <code>estimación ± 1.96·EE</code>.</dd>
              <dt>Coeficiente de variación (CV)</dt>
              <dd>El EE relativo al tamaño de la cifra (<code>EE ÷ estimación × 100</code>). Permite comparar la confiabilidad entre indicadores.</dd>
              <dt>n muestral</dt>
              <dd>Número de hogares o personas de la muestra usados en el cálculo.</dd>
            </dl>
            <h3>Confiable vs. referencial</h3>
            <p>
              Según el criterio del INEI, una estimación es <b className="doc-ok">confiable</b> cuando su
              <b> CV ≤ 15%</b>, y <b className="doc-warn">referencial ▲</b> cuando su <b>CV &gt; 15%</b>
              {" "}(poca precisión, normalmente por muestra pequeña: departamentos chicos, cruces muy finos o
              indicadores poco frecuentes). Las cifras referenciales se marcan con ▲ y color ocre; úsalas solo como referencia.
            </p>
          </section>

          {/* 3 · La API */}
          <section id="api" className="doc-sec">
            <h2>La API</h2>
            <p>URL base: <code>{API_BASE}</code>. Todas las respuestas tienen la forma <code>{"{ meta, data }"}</code> (salvo la descarga CSV).</p>

            <h3>Endpoints</h3>
            {[
              { m: "GET", p: "/indicadores", d: "Catálogo de indicadores para la UI." },
              { m: "GET", p: "/ambitos", d: "Niveles de inferencia válidos." },
              { m: "GET", p: "/anios", d: "Años de datos cargados." },
              { m: "GET", p: "/estimaciones", d: "Estimación de un indicador con EE/CV/IC.", q: "indicador, ambito, anio, formato" },
              { m: "GET", p: "/cruces", d: "Cruce de un indicador por condición de pobreza.", q: "indicador, ambito, anio, cruzar_por, formato" },
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
            <Code>{`GET ${API_BASE}/estimaciones?indicador=pobreza_total&ambito=nacional&anio=2024`}</Code>
            <h3>Ejemplo de respuesta</h3>
            <Code>{`{
  "meta": {
    "fuente": "ENAHO", "anio": 2024,
    "indicador": "pobreza_total", "ambito": "nacional",
    "nivel_confianza": 0.95, "umbral_cv_referencial": 15
  },
  "data": [
    {
      "nivel": "Nacional",
      "estimacion": 27.58, "error_estandar": 0.52, "cv": 1.88,
      "ic_inf": 26.56, "ic_sup": 28.60,
      "referencial": false, "n_muestral": 33691
    }
  ]
}`}</Code>

            <h3>Descarga CSV</h3>
            <p>Agrega <code>&formato=csv</code> a <code>/estimaciones</code> o <code>/cruces</code> para descargar los resultados como CSV.</p>

            <h3>Códigos de error</h3>
            <table className="doc-table">
              <thead><tr><th>Código</th><th>Clave</th><th>Cuándo ocurre</th></tr></thead>
              <tbody>
                <tr><td>404</td><td><code>indicador_inexistente</code></td><td>El indicador no está en el catálogo.</td></tr>
                <tr><td>404</td><td><code>anio_no_disponible</code></td><td>No hay datos preparados para ese año.</td></tr>
                <tr><td>422</td><td><code>ambito_no_permitido</code></td><td>El indicador no se publica a ese nivel (p. ej. pobreza extrema por departamento).</td></tr>
                <tr><td>400</td><td><code>ambito_invalido</code></td><td>El ámbito no es un nivel de inferencia válido.</td></tr>
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
            <p>Catálogo actual del servicio ({catalogo.length} indicadores). Se genera desde <code>/indicadores</code>.</p>
            <div className="tablebox">
              <table className="doc-table">
                <thead>
                  <tr><th>Indicador</th><th>Módulo</th><th>Tipo</th><th>Unidad</th><th>Cruzable</th><th>Ámbitos</th></tr>
                </thead>
                <tbody>
                  {catalogo.map((c) => (
                    <tr key={c.id}>
                      <td>{c.titulo}<br /><span className="doc-muted doc-mono">{c.id}</span></td>
                      <td>{c.modulo === "vivienda" ? "Vivienda" : "Sumaria"}</td>
                      <td>{c.tipo}</td>
                      <td>{c.unidad_peso || c.formato}</td>
                      <td>{c.cruzable ? "Sí" : "—"}</td>
                      <td>{(c.ambitos_permitidos || []).map((a) => AMB_LABEL[a] || a).join(", ")}</td>
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
              <li><b>Umbral referencial:</b> CV &gt; 15% marca la cifra como referencial.</li>
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
