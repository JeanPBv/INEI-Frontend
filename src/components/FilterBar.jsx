// Barra de filtros (sobre el contenido, NO en el sidebar).
// Indicador · Ámbito · Año · Cruce · Consultar. Estado controlado por la vista.
import { useNavigate } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import { AMBITO_DESC, AMBITO_ORDEN } from "../lib/constants.js";

const UNIDAD_ETQ = { porcentaje: "%", soles: "S/", conteo: "conteo" };

export default function FilterBar({
  catalogo, anios, value, onChange, onConsultar, loading,
  lockAmbito, errorAmbito,
}) {
  const navigate = useNavigate();
  const ind = catalogo.find((c) => c.id === value.indicador);
  const permitidos = ind?.ambitos_permitidos || AMBITO_ORDEN;
  const cruzable = !!ind?.cruzable;

  // Indicadores agrupados por módulo.
  const porModulo = catalogo.reduce((acc, c) => {
    (acc[c.modulo] = acc[c.modulo] || []).push(c);
    return acc;
  }, {});

  const setYear = (v) => {
    if (v === "__add") { navigate("/datos"); return; }
    onChange({ anio: Number(v) });
  };

  return (
    <div className="filterbar">
      <div className="field grow">
        <label htmlFor="f-ind">Indicador</label>
        <select id="f-ind" className="ctrl" value={value.indicador}
          onChange={(e) => onChange({ indicador: e.target.value })}>
          <option value="">— Elige un indicador —</option>
          {Object.entries(porModulo).map(([mod, items]) => (
            <optgroup key={mod} label={mod === "vivienda" ? "Vivienda" : "Sumaria"}>
              {items.map((c) => (
                <option key={c.id} value={c.id}>{c.titulo} · {UNIDAD_ETQ[c.unidad]}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* En el mapa (lockAmbito) el ámbito es siempre "departamento": se oculta el selector por innecesario. */}
      {!lockAmbito && (
        <div className="field">
          <label htmlFor="f-amb">Ámbito geográfico</label>
          <select id="f-amb" className={`ctrl ${errorAmbito ? "invalid" : ""}`}
            value={value.ambito}
            aria-invalid={errorAmbito ? "true" : undefined}
            onChange={(e) => onChange({ ambito: e.target.value })}>
            {AMBITO_ORDEN.map((a) => (
              <option key={a} value={a} disabled={ind && !permitidos.includes(a)}>
                {AMBITO_DESC[a] ? `${a === "region_natural" ? "Región natural" : a[0].toUpperCase() + a.slice(1)} — ${AMBITO_DESC[a]}` : a}
              </option>
            ))}
          </select>
          {errorAmbito && <span className="field-err">Ese ámbito no se publica para este indicador.</span>}
        </div>
      )}

      <div className="field">
        <label htmlFor="f-anio">Año</label>
        <select id="f-anio" className="ctrl" value={value.anio} onChange={(e) => setYear(e.target.value)}>
          {anios.filter((a) => a.estado === "validado").map((a) => (
            <option key={a.anio} value={a.anio}>{a.anio}</option>
          ))}
          <option value="__add" className="yr-add">＋ Agregar año…</option>
        </select>
      </div>

      {cruzable && !lockAmbito && (
        <div className="field">
          <label>Cruce</label>
          <div className="switch-field">
            <button type="button" role="switch" aria-checked={value.cruce}
              className={`switch ${value.cruce ? "on" : ""}`}
              onClick={() => onChange({ cruce: !value.cruce })}>
              <span className="knob" />
            </button>
            <span style={{ fontSize: 13 }}>Cruzar por condición de pobreza</span>
          </div>
        </div>
      )}

      <div className="filter-actions">
        <button className="btn btn-primary" disabled={!value.indicador || loading} onClick={onConsultar}>
          {loading ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
          {loading ? "Consultando…" : "Consultar"}
        </button>
      </div>
    </div>
  );
}
