// Barra de filtros: Indicador · Nivel · Año · Cruce · Consultar.
// El estado lo controla la vista.
import { Search, Loader2 } from "lucide-react";
import { LEVEL_ORDER, MODULE_LABEL } from "../lib/constants.js";
import Dropdown from "./Dropdown.jsx";

const UNIT_TAG = { porcentaje: "%", soles: "S/", conteo: "conteo" };
// Etiqueta corta de cada ámbito (sin descripciones largas al costado).
const LEVEL_SHORT = {
  nacional: "Nacional", area: "Área (urbano/rural)",
  region_natural: "Región natural", departamento: "Departamentos",
};

export default function FilterBar({
  catalog, years, value, onChange, onSubmit, loading,
  lockLevel, errorLevel,
}) {
  const ind = catalog.find((c) => c.id === value.indicator);
  const allowed = ind?.levels_allowed || LEVEL_ORDER;
  const crossable = !!ind?.crossable;

  // Indicadores agrupados por módulo, en formato de opciones del Dropdown.
  const byModule = catalog.reduce((acc, c) => {
    (acc[c.module] = acc[c.module] || []).push(c);
    return acc;
  }, {});
  const indGroups = Object.entries(byModule).map(([mod, items]) => ({
    label: MODULE_LABEL[mod] || mod,
    options: items.map((c) => ({ value: c.id, label: c.title, tag: UNIT_TAG[c.unit] })),
  }));

  const levelOpts = LEVEL_ORDER.map((a) => ({
    value: a, label: LEVEL_SHORT[a] || a, disabled: ind && !allowed.includes(a),
  }));
  const yearOpts = years.filter((a) => a.status === "validado")
    .map((a) => ({ value: a.year, label: String(a.year) }));

  return (
    <div className="filterbar">
      <div className="field grow">
        <label htmlFor="f-ind">Indicador</label>
        <Dropdown id="f-ind" ariaLabel="Indicador" value={value.indicator}
          groups={indGroups} placeholder="— Elige un indicador —"
          onChange={(v) => onChange({ indicator: v })} />
      </div>

      {/* En el mapa (lockLevel) el nivel es siempre "departamento": se oculta el selector. */}
      {!lockLevel && (
        <div className="field">
          <label htmlFor="f-lvl">Ámbito geográfico</label>
          <Dropdown id="f-lvl" ariaLabel="Ámbito geográfico" value={value.level}
            options={levelOpts} invalid={errorLevel}
            onChange={(v) => onChange({ level: v })} />
          {errorLevel && <span className="field-err">Ese ámbito no se publica para este indicador.</span>}
        </div>
      )}

      <div className="field">
        <label htmlFor="f-year">Año</label>
        <Dropdown id="f-year" ariaLabel="Año" value={value.year}
          options={yearOpts} onChange={(v) => onChange({ year: Number(v) })} />
      </div>

      {crossable && !lockLevel && (
        <div className="field">
          <label>Comparación</label>
          <div className="switch-field">
            <button type="button" role="switch" aria-checked={value.cross}
              className={`switch ${value.cross ? "on" : ""}`}
              onClick={() => onChange({ cross: !value.cross })}>
              <span className="knob" />
            </button>
            <span style={{ fontSize: 13 }}>Comparar según condición de pobreza</span>
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
