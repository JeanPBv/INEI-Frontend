// Barra superior: título/descripción de la vista actual + selector de tema.
import { useLocation } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../lib/theme.jsx";
import { VIEWS } from "../lib/constants.js";

export default function TopBar() {
  const { theme, toggle } = useTheme();
  const loc = useLocation();
  const view = VIEWS.find((v) => loc.pathname.startsWith(v.path)) || VIEWS[0];
  return (
    <div className="topbar">
      <div>
        <h1>{view.label}</h1>
        <p>{view.desc}</p>
      </div>
      <div className="seg" role="group" aria-label="Tema">
        <button className={theme === "light" ? "on" : ""} onClick={() => theme === "dark" && toggle()}>
          <Sun size={15} /> Claro
        </button>
        <button className={theme === "dark" ? "on" : ""} onClick={() => theme === "light" && toggle()}>
          <Moon size={15} /> Oscuro
        </button>
      </div>
    </div>
  );
}
