// Shell de la app: carga catálogo/años una vez y monta layout + rutas.
import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./layout/Sidebar.jsx";
import TopBar from "./layout/TopBar.jsx";
import { getCatalogo, getAnios } from "./lib/api.js";
import Consulta from "./views/Consulta.jsx";
import Mapa from "./views/Mapa.jsx";
import Datos from "./views/Datos.jsx";
import Documentacion from "./views/Documentacion.jsx";
import Proximamente from "./views/Proximamente.jsx";

export default function App() {
  const [meta, setMeta] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    Promise.all([getCatalogo(), getAnios()]).then(([catalogo, anios]) => {
      if (!catalogo.length) { setErr(true); return; }
      setMeta({
        catalogo,
        anios: anios.length ? anios
          : [{ anio: 2024, version: "v20261025", modulos: ["vivienda", "sumaria"], hogares: 33691, estado: "validado" }],
      });
    }).catch(() => setErr(true));
  }, []);

  return (
    <div className="shell">
      <Sidebar anios={meta?.anios} />
      <div className="main">
        <TopBar />
        {err ? (
          <div className="content">
            <div className="alert" role="alert">
              <h3>No se pudo conectar con la API</h3>
              <p>Verifica que el backend esté levantado en <code className="mono">http://127.0.0.1:8000</code>
                {" "}(en <code className="mono">back/</code>: <code className="mono">uvicorn app.main:app --port 8000</code>).</p>
            </div>
          </div>
        ) : !meta ? (
          <div className="content"><div className="sk" style={{ height: 200 }} /></div>
        ) : (
          <Routes>
            <Route path="/" element={<Navigate to="/consulta" replace />} />
            <Route path="/consulta" element={<Consulta meta={meta} />} />
            <Route path="/mapa" element={<Mapa meta={meta} />} />
            <Route path="/datos" element={<Datos meta={meta} />} />
            <Route path="/comparar" element={<Proximamente titulo="Comparar / Tendencia" desc="Comparar un indicador entre años o ámbitos" />} />
            <Route path="/catalogo" element={<Proximamente titulo="Catálogo" desc="Ficha de cada indicador (definición, variable, módulo, unidad)" />} />
            <Route path="/docs" element={<Documentacion meta={meta} />} />
            <Route path="*" element={<Navigate to="/consulta" replace />} />
          </Routes>
        )}
      </div>
    </div>
  );
}
