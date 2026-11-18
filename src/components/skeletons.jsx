// Estados de carga reutilizables (skeletons + spinner). Usan los tokens y la clase
// .sk existentes; respetan prefers-reduced-motion (desactivado en app.css global).
// Accesibles: regiones con role="status" / aria-busy y texto para lectores.
import { Loader2 } from "lucide-react";

// Bloque base de skeleton (shimmer). h/w aceptan número (px) o string.
export function Skeleton({ h = 16, w = "100%", style }) {
  return <div className="sk" style={{ height: h, width: w, ...style }} aria-hidden="true" />;
}

// Spinner en línea con etiqueta discreta ("Calculando indicador…").
export function LoadingSpinner({ label, className = "" }) {
  return (
    <span className={`loadrow ${className}`} role="status" aria-live="polite">
      <Loader2 size={15} className="icon-spin" aria-hidden="true" />
      {label && <span>{label}</span>}
    </span>
  );
}

// Esqueleto de la pantalla de resultados (cabecera + gráfico + tabla), con la
// misma estructura y altura aproximada que el resultado real para no saltar.
export function ResultSkeleton({ label = "Calculando indicador…" }) {
  return (
    <div className="stack" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="skhead">
        <Skeleton h={26} w={300} />
        <div className="skchips">
          <Skeleton h={22} w={90} /><Skeleton h={22} w={60} /><Skeleton h={22} w={110} />
        </div>
      </div>
      <div className="card pad"><Skeleton h={200} /></div>
      <div className="card pad"><Skeleton h={180} /></div>
      <p className="load-note"><LoadingSpinner label={label} /></p>
    </div>
  );
}

// Placeholder de un gráfico, con la altura típica del gráfico real.
export function ChartSkeleton({ h = 240, label }) {
  return (
    <div className="card pad" role="status" aria-busy="true">
      <Skeleton h={h} />
      {label && <p className="load-note"><LoadingSpinner label={label} /></p>}
    </div>
  );
}

// Placeholder del mapa: conserva el tamaño del contenedor y muestra el estado.
export function MapSkeleton({ label = "Cargando mapa…" }) {
  return (
    <div className="mapskel" role="status" aria-busy="true" aria-live="polite">
      <Skeleton h="100%" style={{ minHeight: 320 }} />
      <span className="mapskel-lbl"><LoadingSpinner label={label} /></span>
    </div>
  );
}
