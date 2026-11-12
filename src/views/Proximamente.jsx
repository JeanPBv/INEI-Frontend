// Vistas aún no diseñadas (Comparar, Catálogo, Documentación): respetan el layout.
import { Construction } from "lucide-react";

export default function Proximamente({ titulo, desc }) {
  return (
    <div className="content">
      <div className="empty">
        <div className="ico"><Construction size={34} /></div>
        <h3>{titulo}</h3>
        <p>{desc} — próximamente.</p>
      </div>
    </div>
  );
}
