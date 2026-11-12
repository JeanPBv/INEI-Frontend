// Barra lateral: navegación entre vistas + rango de años + botón de contraer.
import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  BarChart3, Map, TrendingUp, BookOpen, Database, FileCode,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { VIEWS } from "../lib/constants.js";

const ICONS = { BarChart3, Map, TrendingUp, BookOpen, Database, FileCode };

export default function Sidebar({ years }) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("enaho-sb") === "1"; } catch { return false; }
  });
  const ys = (years || []).map((a) => a.year).filter(Boolean).sort();
  const range = ys.length ? (ys[0] === ys[ys.length - 1] ? `${ys[0]}` : `${ys[0]}–${ys[ys.length - 1]}`) : "—";
  const toggle = () => setCollapsed((c) => {
    const n = !c; try { localStorage.setItem("enaho-sb", n ? "1" : "0"); } catch {} return n;
  });
  const groups = [...new Set(VIEWS.map((v) => v.group))];

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sb-brand">
        <div className="sb-logo">EN</div>
        {!collapsed && <div><b>Servicio ENAHO</b><br /><span>Indicadores con diseño muestral</span></div>}
      </div>
      <nav className="sb-nav">
        {groups.map((g) => (
          <div key={g}>
            <div className="sb-group">{collapsed ? g.slice(0, 3) : g}</div>
            {VIEWS.filter((v) => v.group === g).map((v) => {
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
        <div className="sb-ver mono">Datos · ENAHO {range}</div>
        <button className="sb-collapse" onClick={toggle}>
          {collapsed ? <PanelLeftOpen size={16} /> : <><PanelLeftClose size={16} /> Contraer menú</>}
        </button>
      </div>
    </aside>
  );
}
