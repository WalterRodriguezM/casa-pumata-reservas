"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DIAS_SEMANA,
  MESES,
  aIso,
  desdeIso,
  diferenciaDias,
  formatoFecha,
  formatoPesos,
  sumarDias,
} from "@/lib/fechas";
import type { Reserva } from "@/lib/reservas";
import type { Catalogos } from "@/lib/catalogos";
import { EditarReserva } from "@/components/editar-reserva";
import { WizardReserva } from "@/components/wizard-reserva";

type Props = {
  reservas: Reserva[];
  hoy: string;
  catalogos: Catalogos;
  salir: () => Promise<void>;
};

type Rango = { a: string; b: string };

export function Calendario({ reservas, hoy, catalogos, salir }: Props) {
  const inicio = desdeIso(hoy);
  const [vista, setVista] = useState({ y: inicio.getFullYear(), m: inicio.getMonth() });
  const [arrastre, setArrastre] = useState<Rango | null>(null);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const detalle = reservas.find((x) => x.id === detalleId) ?? null;
  const setDetalle = (x: Reserva | null) => {
    setDetalleId(x?.id ?? null);
    setEditando(false);
  };
  const [wizard, setWizard] = useState<{ a: string | null; b: string | null; clave: number } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const arrastreRef = useRef<Rango | null>(null);
  const avisoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const reservaEn = useMemo(() => {
    const mapa = new Map<string, Reserva>();
    for (const r of reservas) {
      for (let d = r.checkin; d <= r.checkout; d = sumarDias(d, 1)) mapa.set(d, r);
    }
    return mapa;
  }, [reservas]);

  const ocupado = (d: string) => reservaEn.has(d);
  const esPasada = (d: string) => d < hoy;

  // Todo el rango, check-out incluido, debe estar libre y no ser pasado.
  const rangoValido = (a: string, b: string) => {
    if (!(a < b) || esPasada(a)) return false;
    for (let d = a; d <= b; d = sumarDias(d, 1)) if (ocupado(d)) return false;
    return true;
  };

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
    const res = reservaEn.get(d);
    let cls = "cell";
    if (res) cls += " ocupada";
    if (d === hoy) cls += " hoy";
    if (esPasada(d)) cls += " pasada";
    else if (!res && !prev) cls += " libre-hover";
    if (prev) {
      if (prev.a < prev.b) {
        if (d >= prev.a && d < prev.b) cls += prevValido ? " sel" : " bad";
        if (d === prev.b) cls += prevValido ? " sel-end" : " bad";
      } else if (d === prev.a) cls += " sel-end";
    }
    let etiqueta = null;
    if (res && (res.checkin === d || dow === 0)) {
      const tramo = Math.min(diferenciaDias(d, res.checkout) + 1, 7 - dow);
      etiqueta = (
        <span className="lbl" style={{ maxWidth: `calc(${tramo * 100}% - 10px)` }}>
          {res.huesped.nombre}
        </span>
      );
    }
    celdas.push(
      <div key={d} className={cls} data-d={d}>
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
          <form action={salir}>
            <button className="btn ghost">Salir</button>
          </form>
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
            if (!d || e.pointerType !== "mouse" || ocupado(d) || esPasada(d)) return;
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
            const res = reservaEn.get(d);
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
          <span><i style={{ background: "var(--occ)" }} />Ocupada (incluye el día de check-out, por el aseo)</span>
          <span><i style={{ background: "var(--sel)" }} />Selección</span>
          <span>
            <i style={{ background: "repeating-linear-gradient(135deg,transparent 0 4px,var(--line) 4px 5px)" }} />
            Fecha pasada (no reservable)
          </span>
        </div>
      </section>

      {detalle && !editando && (
        <DetalleReserva r={detalle} cerrar={() => setDetalle(null)} editar={() => setEditando(true)} />
      )}
      {detalle && editando && (
        <EditarReserva
          key={detalle.id}
          reserva={detalle}
          catalogos={catalogos}
          volver={() => setEditando(false)}
          guardada={(m) => {
            setEditando(false);
            mostrarAviso(m);
          }}
        />
      )}
      {wizard && (
        <WizardReserva
          key={wizard.clave}
          catalogos={catalogos}
          hoy={hoy}
          ocupado={ocupado}
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

function DetalleReserva({ r, cerrar, editar }: { r: Reserva; cerrar: () => void; editar: () => void }) {
  const noches = diferenciaDias(r.checkin, r.checkout);
  const saldo = r.montoTotal - r.montoPagado;
  return (
    <div
      className="overlay"
      onMouseDown={(e) => e.target === e.currentTarget && cerrar()}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="det-titulo">
        <div className="mh">
          <h3 id="det-titulo">Reserva de {r.huesped.nombre}</h3>
          <button className="btn ghost" onClick={cerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="mb">
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div className="chip">
              {formatoFecha(r.checkin)} → {formatoFecha(r.checkout)} · <b>{noches} {noches === 1 ? "noche" : "noches"}</b> · {r.numeroHuespedes} huésp.
            </div>
            <span
              className="chip"
              style={{ background: r.estado === "Confirmada" ? "var(--occ)" : "var(--accent-soft)" }}
            >
              {r.estado}
            </span>
          </div>
          <div className="guest">
            <b>{r.huesped.nombre}</b>
            <small>{r.huesped.documento}</small>
            <small>{[r.huesped.telefono, r.huesped.correo].filter(Boolean).join(" · ") || "Sin contacto"}</small>
          </div>
          <dl>
            <dt>Origen</dt>
            <dd>{r.origen}</dd>
            <dt>Método de pago</dt>
            <dd>{r.metodoPago}</dd>
            {r.notas && (
              <>
                <dt>Notas</dt>
                <dd>{r.notas}</dd>
              </>
            )}
          </dl>
          <dl className="total">
            <dt>Total</dt>
            <dd>{formatoPesos(r.montoTotal)}</dd>
            <dt>Pagado</dt>
            <dd>{formatoPesos(r.montoPagado)}</dd>
            <dt>Saldo pendiente</dt>
            <dd style={{ color: saldo > 0 ? "var(--accent)" : "var(--ok)" }}>{formatoPesos(saldo)}</dd>
          </dl>
        </div>
        <div className="mf">
          <button className="btn" onClick={cerrar}>
            Cerrar
          </button>
          <button className="btn primary" onClick={editar}>
            Editar reserva
          </button>
        </div>
      </div>
    </div>
  );
}
