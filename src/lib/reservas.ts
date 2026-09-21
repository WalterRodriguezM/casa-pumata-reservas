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
  metodo_pago_id: number | null;
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
  metodos_pago: { nombre: string } | null;
  estados_reserva: { nombre: string };
};

const CANCELADA = 3;

const SELECT = `id, huesped_id, origen_reserva_id, metodo_pago_id, estado_reserva_id, fecha_checkin, fecha_checkout, numero_huespedes, monto_total, monto_pagado, notas,
       huespedes(nombre_completo, numero_documento, telefono, correo, tipos_documento(nombre)),
       origenes_reserva(nombre), metodos_pago(nombre), estados_reserva(nombre)`;

function mapear(f: Fila): Reserva {
  return {
    id: f.id,
    huespedId: f.huesped_id,
    origenId: f.origen_reserva_id,
    metodoId: f.metodo_pago_id ?? 0, // 0 = sin definir
    estadoId: f.estado_reserva_id,
    checkin: f.fecha_checkin,
    checkout: f.fecha_checkout,
    numeroHuespedes: f.numero_huespedes,
    estado: f.estados_reserva.nombre,
    origen: f.origenes_reserva.nombre,
    metodoPago: f.metodos_pago?.nombre ?? "Sin definir",
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
  };
}

// Reservas no canceladas desde un año atrás (para el calendario y el Home).
export async function reservasActivas(hoy: string): Promise<Reserva[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservas")
    .select(SELECT)
    .neq("estado_reserva_id", CANCELADA)
    .gte("fecha_checkout", sumarDias(hoy, -365))
    .order("fecha_checkin")
    .overrideTypes<Fila[], { merge: false }>();

  if (error) throw new Error("No se pudieron cargar las reservas: " + error.message);
  return data.map(mapear);
}

export const POR_PAGINA = 20;

export type FiltrosReservas = {
  q: string;
  origenId: number | null;
  estadoId: number | null;
  pagina: number;
};

// Listado paginado con filtros, incluye canceladas. Más recientes primero.
export async function listarReservas(f: FiltrosReservas) {
  const supabase = await createClient();
  const desde = (f.pagina - 1) * POR_PAGINA;
  let query = supabase
    .from("reservas")
    .select(f.q ? SELECT.replace("huespedes(", "huespedes!inner(") : SELECT, { count: "exact" })
    .order("fecha_checkin", { ascending: false })
    .order("created_at", { ascending: false })
    .range(desde, desde + POR_PAGINA - 1);

  if (f.q) query = query.ilike("huespedes.nombre_completo", `%${f.q.replace(/[%_\\]/g, "\\$&")}%`);
  if (f.origenId) query = query.eq("origen_reserva_id", f.origenId);
  if (f.estadoId) query = query.eq("estado_reserva_id", f.estadoId);

  const { data, error, count } = await query.overrideTypes<Fila[], { merge: false }>();
  if (error) throw new Error("No se pudieron cargar las reservas: " + error.message);
  const total = count ?? 0;
  return { filas: data.map(mapear), total, paginas: Math.max(1, Math.ceil(total / POR_PAGINA)) };
}
