"use client";

import { useState } from "react";
import { actualizarReserva } from "@/app/(app)/reservas/actions";
import { CamposDetalle, type Huesped } from "@/components/wizard-reserva";
import type { Catalogos } from "@/lib/catalogos";
import { diferenciaDias, formatoFecha } from "@/lib/fechas";
import type { Reserva } from "@/lib/reservas";

type Props = {
  reserva: Reserva;
  catalogos: Catalogos;
  volver: () => void;
  guardada: (mensaje: string) => void;
};

// Reutiliza los campos del Paso 2 del wizard. Las fechas no se editan aquí.
export function EditarReserva({ reserva: r, catalogos, volver, guardada }: Props) {
  const [huesped, setHuesped] = useState<Huesped | null>({
    id: r.huespedId,
    nombre: r.huesped.nombre,
    documento: r.huesped.documento,
    telefono: r.huesped.telefono ?? "—",
    correo: r.huesped.correo ?? "—",
  });
  const [origenId, setOrigenId] = useState(r.origenId);
  const [metodoId, setMetodoId] = useState(r.metodoId);
  const [estadoId, setEstadoId] = useState(r.estadoId);
  const [total, setTotal] = useState(String(r.montoTotal));
  const [pagado, setPagado] = useState(String(r.montoPagado));
  const [notas, setNotas] = useState(r.notas ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const nTotal = Number(total) || 0;
  const nPagado = Number(pagado) || 0;
  const valido = !!huesped && nTotal > 0 && nPagado <= nTotal;
  const noches = diferenciaDias(r.checkin, r.checkout);

  async function guardar() {
    if (!huesped) return;
    setGuardando(true);
    setError(null);
    const res = await actualizarReserva(r.id, {
      huesped: huesped.id ? { id: huesped.id } : { nuevo: huesped.nuevo! },
      origenId,
      metodoId,
      estadoId,
      montoTotal: nTotal,
      montoPagado: nPagado,
      notas,
    });
    setGuardando(false);
    if (res.ok) {
      guardada(estadoId === 3 ? "Reserva cancelada: las fechas quedaron libres" : "Cambios guardados");
      return;
    }
    if (res.huespedId && huesped.nuevo) setHuesped({ ...huesped, id: res.huespedId, nuevo: undefined });
    setError(res.mensaje);
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && volver()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-titulo">
        <div className="mh">
          <h3 id="edit-titulo">Editar reserva de {r.huesped.nombre}</h3>
          <button className="btn ghost" onClick={volver} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="mb">
          <div className="chip" style={{ width: "fit-content" }}>
            {formatoFecha(r.checkin)} → {formatoFecha(r.checkout)} · {noches} {noches === 1 ? "noche" : "noches"} · {r.numeroHuespedes} huésp.
          </div>
          {error && (
            <div className="alert" role="alert">
              {error}
            </div>
          )}
          <CamposDetalle
            catalogos={catalogos}
            estados={catalogos.estadosTodos}
            huesped={huesped}
            setHuesped={setHuesped}
            origenId={origenId}
            setOrigenId={setOrigenId}
            metodoId={metodoId}
            setMetodoId={setMetodoId}
            estadoId={estadoId}
            setEstadoId={setEstadoId}
            total={total}
            setTotal={setTotal}
            pagado={pagado}
            setPagado={setPagado}
            notas={notas}
            setNotas={setNotas}
          />
        </div>
        <div className="mf entre">
          <button className="btn" onClick={volver} disabled={guardando}>
            Cancelar
          </button>
          <button className="btn primary" onClick={guardar} disabled={!valido || guardando}>
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
