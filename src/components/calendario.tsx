"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DIAS_SEMANA,
  MESES,
  aIso,
  desdeIso,
  diferenciaDias,
  formatoFecha,
} from "@/lib/fechas";
import { crearOcupacion, fondoCelda } from "@/lib/ocupacion";
import type { Reserva } from "@/lib/reservas";
import type { Catalogos } from "@/lib/catalogos";
import { ReservaModal } from "@/components/detalle-reserva";
import { WizardReserva } from "@/components/wizard-reserva";

type Props = {
  reservas: Reserva[];
  hoy: string;
  catalogos: Catalogos;
};

type Rango = { a: string; b: string };

export function Calendario({ reservas, hoy, catalogos }: Props) {
  const inicio = desdeIso(hoy);
  const [vista, setVista] = useState({ y: inicio.getFullYear(), m: inicio.getMonth() });
  const [arrastre, setArrastre] = useState<Rango | null>(null);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const detalle = reservas.find((x) => x.id === detalleId) ?? null;
  const setDetalle = (x: Reserva | null) => setDetalleId(x?.id ?? null);
  const [wizard, setWizard] = useState<{ a: string | null; b: string | null; clave: number } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const arrastreRef = useRef<Rango | null>(null);
  const avisoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const ocup = useMemo(() => crearOcupacion(reservas), [reservas]);
  const esPasada = (d: string) => d < hoy;
  const rangoValido = (a: string, b: string) => ocup.rangoValido(a, b, hoy);

  const mostrarAviso = (t: string) => {
    setAviso(t);
    clearTimeout(avisoTimer.current);
    avisoTimer.current = setTimeout(() => setAviso(null), 3200);
  };

  // Con rango (arrastre) el wizard abre en el Paso 2; con solo check-in o sin fechas, en el Paso 1.
  const abrirWizard = (a: string | null, b: string | null) =>
    setWizard({ a, b, clave: Date.now() });

  const fijarArrastre = (r: Rango | null) => {
    arrastreRef.current = r;
    setArrastre(r);
  };

  useEffect(() => {
    const soltar = () => {
      const g = arrastreRef.current;
      if (!g) return;
      arrastreRef.current = null;
      setArrastre(null);
      const a = g.a <= g.b ? g.a : g.b;
      const b = g.a <= g.b ? g.b : g.a;
      if (a === b) abrirWizard(a, null);
      else if (rangoValido(a, b)) abrirWizard(a, b);
      else mostrarAviso("Ese rango incluye días ocupados. Elige otro.");
    };
    window.addEventListener("pointerup", soltar);
    return () => window.removeEventListener("pointerup", soltar);
  });

  useEffect(() => {
    const cerrar = (e: KeyboardEvent) => e.key === "Escape" && setDetalle(null);
    window.addEventListener("keydown", cerrar);
    return () => window.removeEventListener("keydown", cerrar);
  }, []);

  const diaDe = (e: React.PointerEvent | React.MouseEvent) =>
    (e.target as HTMLElement).closest<HTMLElement>("[data-d]")?.dataset.d ?? null;

  // Mitad de la celda donde se hizo clic: izquierda = mañana, derecha = noche.
  const mitadDe = (e: React.PointerEvent | React.MouseEvent): "L" | "R" => {
    const caja = (e.target as HTMLElement).closest<HTMLElement>("[data-d]")!.getBoundingClientRect();
    return e.clientX - caja.left < caja.width / 2 ? "L" : "R";
  };

  const cambiarMes = (n: number) =>
    setVista((v) => {
      const d = new Date(v.y, v.m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const primero = new Date(vista.y, vista.m, 1);
  const relleno = (primero.getDay() + 6) % 7; // semana desde el lunes
  const diasMes = new Date(vista.y, vista.m + 1, 0).getDate();

  const prev = arrastre
    ? arrastre.a <= arrastre.b
      ? arrastre
      : { a: arrastre.b, b: arrastre.a }
    : null;
  const prevValido = prev && prev.a < prev.b ? rangoValido(prev.a, prev.b) : true;

  const celdas = [];
  for (let i = 0; i < relleno; i++) celdas.push(<div key={"b" + i} className="cell blank" />);
  for (let dia = 1; dia <= diasMes; dia++) {
    const d = aIso(new Date(vista.y, vista.m, dia));
    const dow = (relleno + dia - 1) % 7;
    const res = ocup.noche.get(d);
    const fondo = fondoCelda(ocup, d);
    let cls = "cell";
    if (d === hoy) cls += " hoy";
    if (esPasada(d)) cls += " pasada";
    else if (!fondo && !prev) cls += " libre-hover";
    if (prev) {
      if (prev.a < prev.b) {
        if (d >= prev.a && d < prev.b) cls += prevValido ? " sel" : " bad";
        if (d === prev.b) cls += prevValido ? " sel-end" : " bad";
      } else if (d === prev.a) cls += " sel-end";
    }
    let etiqueta = null;
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

  const estado = () => {
    if (prev && prev.a < prev.b) {
      if (!prevValido)
        return <span className="mal">El rango incluye días ocupados o pasados</span>;
      const n = diferenciaDias(prev.a, prev.b);
      return (
        <>
          {formatoFecha(prev.a)} → {formatoFecha(prev.b)} · <b>{n} {n === 1 ? "noche" : "noches"}</b>
        </>
      );
    }
    return "Arrastra sobre el calendario para elegir check-in y check-out.";
  };

  return (
    <>
      <header className="topbar">
        <h1>
          <small>Casa Pumata</small>Calendario de ocupación
        </h1>
        <div className="acciones">
          <button className="btn primary" onClick={() => abrirWizard(null, null)}>
            + Nueva reserva
          </button>
        </div>
      </header>

      <section className="panel" aria-label="Calendario">
        <div className="calhead">
          <h2>
            {MESES[vista.m]} {vista.y}
          </h2>
          <div className="nav">
            <button className="btn" onClick={() => cambiarMes(-1)} aria-label="Mes anterior">
              ←
            </button>
            <button
              className="btn"
              onClick={() => setVista({ y: inicio.getFullYear(), m: inicio.getMonth() })}
            >
              Hoy
            </button>
            <button className="btn" onClick={() => cambiarMes(1)} aria-label="Mes siguiente">
              →
            </button>
          </div>
        </div>

        <div className="dow">
          {DIAS_SEMANA.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div
          className="grid"
          onPointerDown={(e) => {
            const d = diaDe(e);
            if (!d || e.pointerType !== "mouse" || ocup.nocheOcupada(d) || esPasada(d)) return;
            if (ocup.enMitad(d, mitadDe(e))) return; // clic sobre una reserva: abre el detalle
            e.preventDefault();
            fijarArrastre({ a: d, b: d });
          }}
          onPointerOver={(e) => {
            const g = arrastreRef.current;
            const d = diaDe(e);
            if (g && d && d !== g.b) fijarArrastre({ a: g.a, b: d });
          }}
          onClick={(e) => {
            const d = diaDe(e);
            if (!d) return;
            const mitad = mitadDe(e);
            // Clic sobre una reserva: abre su detalle. En una celda de relevo decide la mitad.
            const res =
              ocup.enMitad(d, mitad) ??
              (mitad === "L" ? ocup.noche.get(d) : undefined); // mitad libre del día de check-in
            if (res) return setDetalle(res);
            // Toque en pantalla táctil: abre el wizard en el Paso 1 con ese check-in.
            if ((e.nativeEvent as PointerEvent).pointerType !== "mouse" && !esPasada(d)) {
              abrirWizard(d, null);
            }
          }}
        >
          {celdas}
        </div>

        <div className="status">{estado()}</div>
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
      </section>

      {detalle && (
        <ReservaModal
          key={detalle.id}
          reserva={detalle}
          catalogos={catalogos}
          cerrar={() => setDetalle(null)}
          guardada={mostrarAviso}
        />
      )}
      {wizard && (
        <WizardReserva
          key={wizard.clave}
          catalogos={catalogos}
          hoy={hoy}
          ocupacion={ocup}
          inicial={{ a: wizard.a, b: wizard.b }}
          cerrar={() => setWizard(null)}
          creada={(m) => {
            setWizard(null);
            mostrarAviso(m);
          }}
        />
      )}
      {aviso && <div className="toast" role="status">{aviso}</div>}
    </>
  );
}
