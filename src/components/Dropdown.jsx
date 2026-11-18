// Dropdown personalizado y accesible, para reemplazar los <select> nativos (cuyo
// listado desplegado no se puede estilizar). Acepta una lista plana `options` o
// `groups` (con encabezados por módulo). Cierra con clic fuera o Escape, y navega
// con las flechas. Cada opción: { value, label, tag?, disabled? }.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

export default function Dropdown({
  value, onChange, options, groups, placeholder = "Selecciona…",
  id, invalid = false, ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);     // índice resaltado por teclado
  const wrap = useRef(null);
  const listRef = useRef(null);
  const autoId = useId();
  const popId = id || autoId;

  // Lista plana (para buscar la etiqueta actual y navegar con teclado).
  const flat = useMemo(() => {
    if (groups) return groups.flatMap((g) => g.options);
    return options || [];
  }, [groups, options]);
  const current = flat.find((o) => o.value === value);

  // Cierra al hacer clic fuera.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Al abrir, resalta la opción seleccionada.
  useEffect(() => {
    if (open) setActive(Math.max(0, flat.findIndex((o) => o.value === value)));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (opt) => {
    if (!opt || opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
  };

  // Mueve el resaltado saltando opciones deshabilitadas.
  const move = (dir) => {
    if (!flat.length) return;
    let i = active;
    for (let step = 0; step < flat.length; step++) {
      i = (i + dir + flat.length) % flat.length;
      if (!flat[i].disabled) { setActive(i); break; }
    }
  };

  const onKey = (e) => {
    if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      e.preventDefault(); setOpen(true); return;
    }
    if (!open) return;
    if (e.key === "Escape") { setOpen(false); }
    else if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter") { e.preventDefault(); pick(flat[active]); }
    else if (e.key === "Tab") { setOpen(false); }
  };

  const renderOpt = (opt) => {
    const idx = flat.indexOf(opt);
    const sel = opt.value === value;
    return (
      <div key={opt.value || "empty"}
        role="option" aria-selected={sel} aria-disabled={opt.disabled || undefined}
        className={`dd-opt${sel ? " sel" : ""}${opt.disabled ? " dis" : ""}${idx === active ? " active" : ""}`}
        onMouseEnter={() => !opt.disabled && setActive(idx)}
        onMouseDown={(e) => { e.preventDefault(); pick(opt); }}>
        <span className="dd-check">{sel && <Check size={15} />}</span>
        <span className="dd-label">{opt.label}</span>
        {opt.tag && <span className="dd-tag">{opt.tag}</span>}
      </div>
    );
  };

  return (
    <div className={`dd${open ? " open" : ""}`} ref={wrap}>
      <button type="button" id={popId} className={`dd-trigger${invalid ? " invalid" : ""}`}
        aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)} onKeyDown={onKey}>
        <span className={`dd-value${current ? "" : " ph"}`}>
          {current ? current.label : placeholder}
        </span>
        {current?.tag && <span className="dd-tag solo">{current.tag}</span>}
        <ChevronDown size={16} className="dd-caret" />
      </button>

      {open && (
        <div className="dd-pop" role="listbox" ref={listRef} tabIndex={-1} aria-labelledby={popId}>
          {groups
            ? groups.map((g) => (
                <div key={g.label} className="dd-grp">
                  <div className="dd-grp-h">{g.label}</div>
                  {g.options.map(renderOpt)}
                </div>
              ))
            : (options || []).map(renderOpt)}
        </div>
      )}
    </div>
  );
}
