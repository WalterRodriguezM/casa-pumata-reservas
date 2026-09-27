"use client";

import { DIAS_SEMANA, aIso, diferenciaDias } from "@/lib/fechas";
import { fondoCelda, type Ocupacion } from "@/lib/ocupacion";

type Rango = { a: string; b: string };

type Props = {
  anio: number;
  mes: number; // 0-11
  hoy: string;
  ocupacion: Ocupacion;
  // Rango en selección: a == b marca solo el check-in.
  seleccion: Rango | null;
  seleccionValida: boolean;
  resaltado?: Rango | null; // reserva recién creada
  nombres?: boolean; // nombre del huésped sobre sus noches
  compacto?: boolean; // celdas bajas (dentro de un modal)
  libreHover: boolean;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "className" | "children">;

// Grilla mensual compartida por /calendario y el Paso 1 del wizard. Cada celda lleva
// data-d con su fecha; los eventos se manejan en la grilla y se ubican con closest("[data-d]").
export function GrillaMes({
  anio, mes, hoy, ocupacion, seleccion, seleccionValida, resaltado, nombres, compacto, libreHover, ...eventos
}: Props) {
  const relleno = (new Date(anio, mes, 1).getDay() + 6) % 7; // semana desde el lunes
  const diasMes = new Date(anio, mes + 1, 0).getDate();

  const celdas = [];
  for (let i = 0; i < relleno; i++) celdas.push(<div key={"b" + i} className="cell blank" />);
  for (let dia = 1; dia <= diasMes; dia++) {
    const d = aIso(new Date(anio, mes, dia));
    const dow = (relleno + dia - 1) % 7;
    const fondo = fondoCelda(ocupacion, d);
    let cls = "cell";
    if (d === hoy) cls += " hoy";
    if (d < hoy) cls += " pasada";
    else if (!fondo && libreHover) cls += " libre-hover";
    if (seleccion) {
      if (seleccion.a < seleccion.b) {
        if (d >= seleccion.a && d < seleccion.b) cls += seleccionValida ? " sel" : " bad";
        if (d === seleccion.b) cls += seleccionValida ? " sel-end" : " bad";
      } else if (d === seleccion.a) cls += " sel-end";
    }
    if (resaltado && d >= resaltado.a && d <= resaltado.b) cls += " nueva";
    let etiqueta = null;
    const res = nombres ? ocupacion.noche.get(d) : undefined;
    if (res && (res.checkin === d || dow === 0)) {
      const tramo = Math.min(diferenciaDias(d, res.checkout), 7 - dow);
      etiqueta = (
        <span className="lbl" style={{ maxWidth: `calc(${tramo * 100}% - 10px)` }}>
          {res.huesped.nombre}
        </span>
      );
    }
    celdas.push(
      <div key={d} className={cls} data-d={d} style={fondo ? { backgroundImage: fondo } : undefined}>
        <span className="n">{dia}</span>
        {etiqueta}
      </div>,
    );
  }

  return (
    <div className={compacto ? "compacto" : undefined}>
      <div className="dow">
        {DIAS_SEMANA.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid" {...eventos}>
        {celdas}
      </div>
    </div>
  );
}

export function LeyendaCalendario() {
  return (
    <div className="legend">
      <span><i style={{ background: "var(--occ)" }} />Ocupada</span>
      <span><i style={{ background: "linear-gradient(90deg,var(--occ) 50%,transparent 50%)" }} />Check-out (libre desde la tarde)</span>
      <span><i style={{ background: "linear-gradient(90deg,transparent 50%,var(--occ) 50%)" }} />Check-in</span>
      <span><i style={{ background: "var(--sel)" }} />Selección</span>
      <span>
        <i style={{ background: "repeating-linear-gradient(135deg,transparent 0 4px,var(--line) 4px 5px)" }} />
        Fecha pasada (no reservable)
      </span>
    </div>
  );
}
