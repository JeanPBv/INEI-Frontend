// Shell de la app: carga catálogo/años una vez y monta layout + rutas.
import { useCallback, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import Sidebar from "./layout/Sidebar.jsx";
import TopBar from "./layout/TopBar.jsx";
import { getCatalog, getYears } from "./lib/api.js";
import { ResultSkeleton } from "./components/skeletons.jsx";
import Consulta from "./views/Consulta.jsx";
import Mapa from "./views/Mapa.jsx";
import Datos from "./views/Datos.jsx";
import Documentacion from "./views/Documentacion.jsx";
import Proximamente from "./views/Proximamente.jsx";

const YEARS_FALLBACK = [{ year: 2024, version: "v20261025", modules: ["vivienda", "sumaria"], households: 33691, status: "validado" }];

export default function App() {
  // phase: loading | ok | error. Reintentar vuelve a pedir sin recargar la página.
  const [state, setState] = useState({ phase: "loading" });

  const load = useCallback(() => {
    setState({ phase: "loading" });
    Promise.all([getCatalog(), getYears()]).then(([catalog, years]) => {
      if (!catalog.length) { setState({ phase: "error" }); return; }
      setState({ phase: "ok", meta: { catalog, years: years.length ? years : YEARS_FALLBACK } });
    }).catch(() => setState({ phase: "error" }));
  }, []);
  useEffect(() => { load(); }, [load]);

  const meta = state.meta;
  return (
    <div className="shell">
      <Sidebar years={meta?.years} />
      <div className="main">
        <TopBar />
        {state.phase === "error" ? (
          <div className="content">
            <div className="alert" role="alert">
              <h3>No se pudo conectar con el servicio</h3>
              <p>No se pudieron cargar los indicadores. Revisa tu conexión o que el servicio esté disponible.</p>
              <div className="err-actions">
                <button className="btn btn-sm" onClick={load}><RefreshCw size={14} /> Reintentar</button>
              </div>
              <details className="err-tech">
                <summary>Detalle técnico</summary>
                <pre>No hay respuesta de la API en {"http://127.0.0.1:8000"} (back/: uvicorn app.main:app --port 8000).</pre>
              </details>
            </div>
          </div>
        ) : state.phase === "loading" ? (
          <div className="content"><ResultSkeleton label="Cargando indicadores…" /></div>
        ) : (
          <Routes>
            <Route path="/" element={<Navigate to="/consulta" replace />} />
            <Route path="/consulta" element={<Consulta meta={meta} />} />
            <Route path="/mapa" element={<Mapa meta={meta} />} />
            <Route path="/datos" element={<Datos meta={meta} />} />
            <Route path="/comparar" element={<Proximamente title="Comparar / Tendencia" desc="Comparar un indicador entre años o ámbitos" />} />
            <Route path="/catalogo" element={<Proximamente title="Catálogo" desc="Ficha de cada indicador (definición, variable, módulo, unidad)" />} />
            <Route path="/docs" element={<Documentacion meta={meta} />} />
            <Route path="*" element={<Navigate to="/consulta" replace />} />
          </Routes>
        )}
      </div>
    </div>
  );
}
