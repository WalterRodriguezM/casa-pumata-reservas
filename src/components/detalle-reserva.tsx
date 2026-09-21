"use client";

import { useState, useTransition } from "react";
import { registrarAbono } from "@/app/(app)/reservas/actions";
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
  return <DetalleReserva r={reserva} cerrar={cerrar} editar={() => setEditando(true)} abonado={guardada} />;
}

function DetalleReserva({ r, cerrar, editar, abonado }: { r: Reserva; cerrar: () => void; editar: () => void; abonado: (mensaje: string) => void }) {
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
          {saldo > 0 && r.estado !== "Cancelada" && <FormularioAbono r={r} saldo={saldo} abonado={abonado} />}
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

function FormularioAbono({ r, saldo, abonado }: { r: Reserva; saldo: number; abonado: (mensaje: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [monto, setMonto] = useState("");
  const [error, setError] = useState("");
  const [enviando, iniciar] = useTransition();
  const n = Number(monto) || 0;

  if (!abierto) {
    return (
      <div>
        <button className="btn" onClick={() => setAbierto(true)}>
          + Registrar abono
        </button>
      </div>
    );
  }

  const guardar = () => {
    if (!(n > 0)) return setError("El abono debe ser mayor a 0.");
    if (n > saldo) return setError("El abono no puede superar el saldo pendiente.");
    setError("");
    iniciar(async () => {
      const res = await registrarAbono(r.id, n);
      if (res.ok) {
        setAbierto(false);
        setMonto("");
        abonado(`Abono registrado: ${formatoPesos(n)}`);
      } else setError(res.mensaje);
    });
  };

  return (
    <div className="abono">
      <label>
        Monto del abono
        <input
          inputMode="numeric"
          placeholder="Solo números"
          value={monto}
          autoFocus
          onChange={(e) => {
            setMonto(e.target.value.replace(/\D/g, ""));
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && guardar()}
          className={error ? "invalid" : ""}
        />
        {error && <small className="err">{error}</small>}
      </label>
      <div className="abono-info">
        <button type="button" className="btn" onClick={() => (setMonto(String(saldo)), setError(""))}>
          Pagó el saldo ({formatoPesos(saldo)})
        </button>
        {n > 0 && n <= saldo && <span>Nuevo saldo: <b>{formatoPesos(saldo - n)}</b></span>}
      </div>
      <div className="abono-acciones">
        <button className="btn" onClick={() => (setAbierto(false), setMonto(""), setError(""))} disabled={enviando}>
          Cancelar
        </button>
        <button className="btn primary" onClick={guardar} disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar abono"}
        </button>
      </div>
    </div>
  );
}
