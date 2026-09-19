import { createClient } from "@/lib/supabase/server";
import { sumarDias } from "@/lib/fechas";

export type Reserva = {
  id: string;
  huespedId: string;
  origenId: number;
  metodoId: number;
  estadoId: number;
  checkin: string;
  checkout: string;
  numeroHuespedes: number;
  estado: string;
  origen: string;
  metodoPago: string;
  montoTotal: number;
  montoPagado: number;
  notas: string | null;
  huesped: {
    nombre: string;
    documento: string;
    telefono: string | null;
    correo: string | null;
  };
};

type Fila = {
  id: string;
  huesped_id: string;
  origen_reserva_id: number;
  metodo_pago_id: number;
  estado_reserva_id: number;
  fecha_checkin: string;
  fecha_checkout: string;
  numero_huespedes: number;
  monto_total: number | string;
  monto_pagado: number | string;
  notas: string | null;
  huespedes: {
    nombre_completo: string;
    numero_documento: string | null;
    telefono: string | null;
    correo: string | null;
    tipos_documento: { nombre: string } | null;
  };
  origenes_reserva: { nombre: string };
  metodos_pago: { nombre: string };
  estados_reserva: { nombre: string };
};

const CANCELADA = 3;

// Reservas no canceladas desde un año atrás (para poder ver el historial reciente).
export async function reservasActivas(hoy: string): Promise<Reserva[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservas")
    .select(
      `id, huesped_id, origen_reserva_id, metodo_pago_id, estado_reserva_id, fecha_checkin, fecha_checkout, numero_huespedes, monto_total, monto_pagado, notas,
       huespedes(nombre_completo, numero_documento, telefono, correo, tipos_documento(nombre)),
       origenes_reserva(nombre), metodos_pago(nombre), estados_reserva(nombre)`,
    )
    .neq("estado_reserva_id", CANCELADA)
    .gte("fecha_checkout", sumarDias(hoy, -365))
    .order("fecha_checkin")
    .overrideTypes<Fila[], { merge: false }>();

  if (error) throw new Error("No se pudieron cargar las reservas: " + error.message);

  return data.map((f) => ({
    id: f.id,
    huespedId: f.huesped_id,
    origenId: f.origen_reserva_id,
    metodoId: f.metodo_pago_id,
    estadoId: f.estado_reserva_id,
    checkin: f.fecha_checkin,
    checkout: f.fecha_checkout,
    numeroHuespedes: f.numero_huespedes,
    estado: f.estados_reserva.nombre,
    origen: f.origenes_reserva.nombre,
    metodoPago: f.metodos_pago.nombre,
    montoTotal: Number(f.monto_total),
    montoPagado: Number(f.monto_pagado),
    notas: f.notas,
    huesped: {
      nombre: f.huespedes.nombre_completo,
      documento: f.huespedes.numero_documento
        ? `${f.huespedes.tipos_documento?.nombre ?? ""} ${f.huespedes.numero_documento}`.trim()
        : "Sin documento",
      telefono: f.huespedes.telefono,
      correo: f.huespedes.correo,
    },
  }));
}
