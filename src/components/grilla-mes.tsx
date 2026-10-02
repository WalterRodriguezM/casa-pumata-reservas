"use client";

import { DIAS_SEMANA, aIso, diferenciaDias } from "@/lib/fechas";
import { tramosDia, type Ocupacion } from "@/lib/ocupacion";
import type { Reserva } from "@/lib/reservas";

// Hueco entre la reserva que sale y la que entra el mismo día: 3px a cada lado de la mitad.
const MEDIO_HUECO = "3px";

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
    const { sale, noche, entra } = tramosDia(ocupacion, d);
    let cls = "cell";
    if (d === hoy) cls += " hoy";
    if (d < hoy) cls += " pasada";
    else if (!noche && !sale && libreHover) cls += " libre-hover";
    if (seleccion) {
      if (seleccion.a < seleccion.b) {
        if (d >= seleccion.a && d < seleccion.b) cls += seleccionValida ? " sel" : " bad";
        if (d === seleccion.b) cls += seleccionValida ? " sel-end" : " bad";
      } else if (d === seleccion.a) cls += " sel-end";
    }
    if (resaltado && d >= resaltado.a && d <= resaltado.b) cls += " nueva";

    const tono = (r: Reserva) => (ocupacion.tono.get(r.id) ? " t2" : "");
    // Las barras se extienden 1px sobre el borde entre celdas para verse continuas;
    // al inicio y al final de la fila se quedan dentro de la celda.
    const bordeIzq = dow === 0 ? "0" : "-1px";
    const bordeDer = dow === 6 ? "0" : "-1px";
    const inicioNoche = entra ? `calc(50% + ${MEDIO_HUECO})` : bordeIzq;

    let etiqueta = null;
    if (nombres && noche && (entra || dow === 0)) {
      // El nombre arranca donde empieza la barra y llega hasta donde termina en esta fila.
      const hastaFin = diferenciaDias(d, noche.checkout);
      const hastaFila = 7 - dow;
      const ancho =
        hastaFin < hastaFila
          ? entra
            ? `calc(${hastaFin * 100}% - ${MEDIO_HUECO} * 2)`
            : `calc(${hastaFin * 100}% + 50% - ${MEDIO_HUECO})`
          : entra
            ? `calc(${hastaFila * 100}% - 50% - ${MEDIO_HUECO})`
            : `${hastaFila * 100}%`;
      etiqueta = (
        <span className={`lbl${tono(noche)}`} style={{ left: inicioNoche, width: ancho }}>
          <span>{noche.huesped.nombre}</span>
        </span>
      );
    }

    celdas.push(
      <div key={d} className={cls} data-d={d}>
        <span className="n">{dia}</span>
        {sale && (
          <i
            className={`barra fin${tono(sale)}`}
            style={{ left: bordeIzq, right: `calc(50% + ${MEDIO_HUECO})` }}
            title={sale.huesped.nombre}
          />
        )}
        {noche && (
          <i
            className={`barra${entra ? " ini" : ""}${tono(noche)}`}
            style={{ left: inicioNoche, right: bordeDer }}
            title={noche.huesped.nombre}
          />
        )}
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
      <span><i className="barra-muestra" />Reserva</span>
      <span><i className="barra-muestra t2" />Reserva pegada a la anterior</span>
      <span><i style={{ background: "var(--sel)" }} />Selección</span>
      <span>
        <i style={{ background: "repeating-linear-gradient(135deg,transparent 0 4px,var(--line) 4px 5px)" }} />
        Fecha pasada (no reservable)
      </span>
    </div>
  );
}
