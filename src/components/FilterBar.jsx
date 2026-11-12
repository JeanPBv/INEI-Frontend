// Barra de filtros: Indicador · Nivel · Año · Cruce · Consultar.
// El estado lo controla la vista.
import { useNavigate } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import { LEVEL_DESC, LEVEL_ORDER } from "../lib/constants.js";

const UNIT_TAG = { porcentaje: "%", soles: "S/", conteo: "conteo" };

export default function FilterBar({
  catalog, years, value, onChange, onSubmit, loading,
  lockLevel, errorLevel,
}) {
  const navigate = useNavigate();
  const ind = catalog.find((c) => c.id === value.indicator);
  const allowed = ind?.levels_allowed || LEVEL_ORDER;
  const crossable = !!ind?.crossable;

  const byModule = catalog.reduce((acc, c) => {
    (acc[c.module] = acc[c.module] || []).push(c);
    return acc;
  }, {});

  const setYear = (v) => {
    if (v === "__add") { navigate("/datos"); return; }
    onChange({ year: Number(v) });
  };

  return (
    <div className="filterbar">
      <div className="field grow">
        <label htmlFor="f-ind">Indicador</label>
        <select id="f-ind" className="ctrl" value={value.indicator}
          onChange={(e) => onChange({ indicator: e.target.value })}>
          <option value="">— Elige un indicador —</option>
          {Object.entries(byModule).map(([mod, items]) => (
            <optgroup key={mod} label={mod === "vivienda" ? "Vivienda" : "Sumaria"}>
              {items.map((c) => (
                <option key={c.id} value={c.id}>{c.title} · {UNIT_TAG[c.unit]}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* En el mapa (lockLevel) el nivel es siempre "departamento": se oculta el selector. */}
      {!lockLevel && (
        <div className="field">
          <label htmlFor="f-lvl">Ámbito geográfico</label>
          <select id="f-lvl" className={`ctrl ${errorLevel ? "invalid" : ""}`}
            value={value.level}
            aria-invalid={errorLevel ? "true" : undefined}
            onChange={(e) => onChange({ level: e.target.value })}>
            {LEVEL_ORDER.map((a) => (
              <option key={a} value={a} disabled={ind && !allowed.includes(a)}>
                {LEVEL_DESC[a] ? `${a === "region_natural" ? "Región natural" : a[0].toUpperCase() + a.slice(1)} — ${LEVEL_DESC[a]}` : a}
              </option>
            ))}
          </select>
          {errorLevel && <span className="field-err">Ese ámbito no se publica para este indicador.</span>}
        </div>
      )}

      <div className="field">
        <label htmlFor="f-year">Año</label>
        <select id="f-year" className="ctrl" value={value.year} onChange={(e) => setYear(e.target.value)}>
          {years.filter((a) => a.status === "validado").map((a) => (
            <option key={a.year} value={a.year}>{a.year}</option>
          ))}
          <option value="__add" className="yr-add">＋ Agregar año…</option>
        </select>
      </div>

      {crossable && !lockLevel && (
        <div className="field">
          <label>Cruce</label>
          <div className="switch-field">
            <button type="button" role="switch" aria-checked={value.cross}
              className={`switch ${value.cross ? "on" : ""}`}
              onClick={() => onChange({ cross: !value.cross })}>
              <span className="knob" />
            </button>
            <span style={{ fontSize: 13 }}>Cruzar por condición de pobreza</span>
          </div>
        </div>
      )}

      <div className="filter-actions">
        <button className="btn btn-primary" disabled={!value.indicator || loading} onClick={onSubmit}>
          {loading ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
          {loading ? "Consultando…" : "Consultar"}
        </button>
      </div>
    </div>
  );
}
