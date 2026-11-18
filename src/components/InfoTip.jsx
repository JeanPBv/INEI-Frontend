// Ayuda contextual accesible: un ícono de información activable por clic, teclado
// (Enter/Espacio para abrir, Escape para cerrar) y toque. No depende de :hover.
import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";

export default function InfoTip({ label, children, align = "left" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onEsc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <span className="itip" ref={ref}>
      <button type="button" className="itip-btn"
        aria-label={label ? `Qué es ${label}` : "Más información"}
        aria-expanded={open} aria-describedby={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}>
        <Info size={14} aria-hidden="true" />
      </button>
      {open && (
        <span role="tooltip" id={id} className={`itip-pop ${align === "right" ? "r" : ""}`}>
          {label && <b className="itip-h">{label}</b>}
          <span>{children}</span>
        </span>
      )}
    </span>
  );
}
