// Vista Datos / Años: años cargados + cómo registrar un año nuevo.
import { CheckCircle2, Clock, Database } from "lucide-react";
import { Chip } from "../components/results.jsx";
import { n0 } from "../lib/format.js";
import { API_BASE } from "../lib/api.js";

const PASOS = [
  { t: "Descargar microdatos", d: "Módulos de la ENAHO del año (INEI), en .sav" },
  { t: "Estandarizar variables", d: "Mapear al esquema del motor (pesos, ámbitos)" },
  { t: "Validar", d: "Comparar con cifras oficiales; revisar CV" },
  { t: "Publicar", d: "Se carga como una base por año y aparece en el filtro" },
];

export default function Datos({ meta }) {
  const { anios } = meta;
  return (
    <div className="content stack">
      <p className="prose">
        Cada año de la ENAHO es una <b>versión de datos</b> independiente. Cuando un año se
        <b> valida</b>, aparece en el filtro <b>Año</b> de las consultas y como valor del parámetro
        <code className="mono"> anio</code> de la API. Los años en revisión no se publican todavía.
      </p>

      <div className="card pad">
        <h3 style={{ margin: "0 0 12px" }}>Años cargados</h3>
        <div className="tablebox">
          <table className="res">
            <thead>
              <tr><th scope="col">Año</th><th>Versión de datos</th><th>Módulos</th><th>Hogares</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {anios.map((a) => (
                <tr key={a.anio}>
                  <th scope="row" className="lvl mono">{a.anio}</th>
                  <td className="mono">{a.version}</td>
                  <td style={{ textAlign: "left" }}>
                    <div className="chips">{(a.modulos || []).map((m) => <Chip key={m}>{m}</Chip>)}</div>
                  </td>
                  <td className="mono">{n0(a.hogares)}</td>
                  <td style={{ textAlign: "left" }}>
                    {a.estado === "validado"
                      ? <Chip kind="ok" icon={CheckCircle2}>Validado</Chip>
                      : <Chip kind="neu" icon={Clock}>En revisión</Chip>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card pad">
        <h3 style={{ margin: "0 0 6px", display: "flex", gap: 8, alignItems: "center" }}>
          <Database size={18} /> Agregar un año nuevo
        </h3>
        <p className="prose" style={{ marginTop: 0 }}>
          El servicio crece agregando años, sin rehacerse. El proceso es de datos (backend); la UI
          solo refleja los años ya publicados.
        </p>
        <div className="add-year">
          {PASOS.map((p, i) => (
            <div className="step" key={i}>
              <div className="num">{i + 1}</div>
              <b>{p.t}</b><span>{p.d}</span>
            </div>
          ))}
        </div>
        <div className="chips" style={{ marginTop: 6 }}>
          <button className="btn btn-primary btn-sm"
            onClick={() => alert("En el POC, registrar un año se hace en el backend (una base .rds por año + su fila de catálogo).")}>
            Registrar año
          </button>
        </div>
      </div>

      <div className="card pad">
        <h3 style={{ margin: "0 0 10px" }}>Ejemplos de la API con el parámetro <code className="mono">anio</code></h3>
        <pre className="json mono" style={{ borderTop: 0, background: "var(--code-bg)", borderRadius: 8 }}>
{`GET ${API_BASE}/estimaciones?indicador=pobreza_total&ambito=departamento&anio=2024
GET ${API_BASE}/estimaciones?indicador=pobreza_total&ambito=departamento&anio=2023   # cuando 2023 se valide
GET ${API_BASE}/anios   # años disponibles y su estado`}
        </pre>
      </div>
    </div>
  );
}
