// Barra lateral: navegación entre vistas + rango de años + botón de contraer.
import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  BarChart3, Map, TrendingUp, BookOpen, Database, FileCode,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { VIEWS } from "../lib/constants.js";

const ICONS = { BarChart3, Map, TrendingUp, BookOpen, Database, FileCode };

export default function Sidebar({ anios }) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("enaho-sb") === "1"; } catch { return false; }
  });
  const yrs = (anios || []).map((a) => a.anio).filter(Boolean).sort();
  const rango = yrs.length ? (yrs[0] === yrs[yrs.length - 1] ? `${yrs[0]}` : `${yrs[0]}–${yrs[yrs.length - 1]}`) : "—";
  const toggle = () => setCollapsed((c) => {
    const n = !c; try { localStorage.setItem("enaho-sb", n ? "1" : "0"); } catch {} return n;
  });
  const grupos = [...new Set(VIEWS.map((v) => v.grupo))];

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sb-brand">
        <div className="sb-logo">EN</div>
        {!collapsed && <div><b>Servicio ENAHO</b><br /><span>Indicadores con diseño muestral</span></div>}
      </div>
      <nav className="sb-nav">
        {grupos.map((g) => (
          <div key={g}>
            <div className="sb-group">{collapsed ? g.slice(0, 3) : g}</div>
            {VIEWS.filter((v) => v.grupo === g).map((v) => {
              const Icon = ICONS[v.icon];
              return (
                <NavLink key={v.path} to={v.path} title={v.label}
                  className={({ isActive }) => `sb-item ${isActive ? "active" : ""}`}>
                  <Icon size={18} /><span>{v.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="sb-foot">
        <div className="sb-ver mono">Datos · ENAHO {rango}</div>
        <button className="sb-collapse" onClick={toggle}>
          {collapsed ? <PanelLeftOpen size={16} /> : <><PanelLeftClose size={16} /> Contraer menú</>}
        </button>
      </div>
    </aside>
  );
}
