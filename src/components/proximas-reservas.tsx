"use client";

import { useState } from "react";
import { useAviso } from "@/components/aviso";
import { ChipEstado } from "@/components/chip-estado";
import { ReservaModal } from "@/components/detalle-reserva";
import type { Catalogos } from "@/lib/catalogos";
import { MESES, diferenciaDias, formatoFecha, formatoPesos } from "@/lib/fechas";
import type { Reserva } from "@/lib/reservas";

const MESES_CORTOS = MESES.map((m) => m.slice(0, 3));

export function ProximasReservas({ reservas, catalogos }: { reservas: Reserva[]; catalogos: Catalogos }) {
  const [abiertaId, setAbiertaId] = useState<string | null>(null);
  const [aviso, mostrar] = useAviso();
  const abierta = reservas.find((r) => r.id === abiertaId) ?? null;

  if (reservas.length === 0) return <p className="vacio">No hay reservas próximas.</p>;

  return (
    <>
      <div className="prox">
        {reservas.map((r) => {
          const d = r.checkin.split("-");
          const noches = diferenciaDias(r.checkin, r.checkout);
          const saldo = r.montoTotal - r.montoPagado;
          return (
            <div
              key={r.id}
              className="prox-i click"
              role="button"
              tabIndex={0}
              aria-label={`Ver la reserva de ${r.huesped.nombre}`}
              onClick={() => setAbiertaId(r.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setAbiertaId(r.id))}
            >
              <div className="fecha">
                <b>{Number(d[2])}</b>
                <span>{MESES_CORTOS[Number(d[1]) - 1]}</span>
              </div>
              <div>
                <div className="n">{r.huesped.nombre}</div>
                <div className="d">
                  {formatoFecha(r.checkin)} → {formatoFecha(r.checkout)} · {noches} {noches === 1 ? "noche" : "noches"} · {r.numeroHuespedes} pers.
                </div>
              </div>
              <div className="der">
                <ChipEstado estado={r.estado} />
                <span className="saldo">{saldo > 0 ? <>Saldo <b>{formatoPesos(saldo)}</b></> : "Pagada"}</span>
              </div>
            </div>
          );
        })}
      </div>
      {abierta && (
        <ReservaModal
          key={abierta.id}
          reserva={abierta}
          catalogos={catalogos}
          cerrar={() => setAbiertaId(null)}
          guardada={mostrar}
        />
      )}
      {aviso}
    </>
  );
}
