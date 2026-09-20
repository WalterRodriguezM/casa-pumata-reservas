"use client";

import { useState } from "react";
import { ChipEstado } from "@/components/chip-estado";
import { EditarReserva } from "@/components/editar-reserva";
import type { Catalogos } from "@/lib/catalogos";
import { diferenciaDias, formatoFecha, formatoPesos } from "@/lib/fechas";
import type { Reserva } from "@/lib/reservas";

type Props = {
  reserva: Reserva;
  catalogos: Catalogos;
  cerrar: () => void;
  guardada: (mensaje: string) => void;
};

// Detalle de solo lectura con paso a edición; lo usan el calendario y el listado.
export function ReservaModal({ reserva, catalogos, cerrar, guardada }: Props) {
  const [editando, setEditando] = useState(false);
  if (editando) {
    return (
      <EditarReserva
        reserva={reserva}
        catalogos={catalogos}
        volver={() => setEditando(false)}
        guardada={(m) => {
          setEditando(false);
          guardada(m);
        }}
      />
    );
  }
  return <DetalleReserva r={reserva} cerrar={cerrar} editar={() => setEditando(true)} />;
}

function DetalleReserva({ r, cerrar, editar }: { r: Reserva; cerrar: () => void; editar: () => void }) {
  const noches = diferenciaDias(r.checkin, r.checkout);
  const saldo = r.montoTotal - r.montoPagado;
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && cerrar()}>
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
            <ChipEstado estado={r.estado} />
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
