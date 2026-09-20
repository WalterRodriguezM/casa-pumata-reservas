"use client";

import { useState } from "react";
import { useAviso } from "@/components/aviso";
import { ChipEstado } from "@/components/chip-estado";
import { ReservaModal } from "@/components/detalle-reserva";
import type { Catalogos } from "@/lib/catalogos";
import { formatoFecha, formatoPesos } from "@/lib/fechas";
import type { Reserva } from "@/lib/reservas";

export function TablaReservas({ filas, catalogos }: { filas: Reserva[]; catalogos: Catalogos }) {
  const [abiertaId, setAbiertaId] = useState<string | null>(null);
  const [aviso, mostrar] = useAviso();
  const abierta = filas.find((f) => f.id === abiertaId) ?? null;

  if (filas.length === 0) return <div className="vacio">Ninguna reserva coincide con los filtros.</div>;

  return (
    <>
      <div className="tabla">
        <table>
          <thead>
            <tr>
              <th>Huésped</th>
              <th>Entrada</th>
              <th>Salida</th>
              <th className="r">Personas</th>
              <th className="r">Costo</th>
              <th>Estado</th>
              <th>Origen</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((r) => (
              <tr
                key={r.id}
                className="fila-click"
                tabIndex={0}
                onClick={() => setAbiertaId(r.id)}
                onKeyDown={(e) => e.key === "Enter" && setAbiertaId(r.id)}
              >
                <td className="nom">{r.huesped.nombre}</td>
                <td>{formatoFecha(r.checkin)}</td>
                <td>{formatoFecha(r.checkout)}</td>
                <td className="r">{r.numeroHuespedes}</td>
                <td className="r">{formatoPesos(r.montoTotal)}</td>
                <td>
                  <ChipEstado estado={r.estado} />
                </td>
                <td>{r.origen}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
