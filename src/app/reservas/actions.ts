"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hoyColombia } from "@/lib/fechas";
import {
  MAX_HUESPEDES,
  errorCorreo,
  errorDocumento,
  errorNombre,
  errorTelefono,
} from "@/lib/validacion";

export type HuespedResumen = {
  id: string;
  nombre: string;
  documento: string;
  telefono: string | null;
  correo: string | null;
};

export type HuespedNuevo = {
  nombre: string;
  tipoDocumentoId: number | null;
  numeroDocumento: string;
  telefono: string;
  correo: string;
  generoId: number | null;
};

export type ReservaInput = {
  checkin: string;
  checkout: string;
  numeroHuespedes: number;
  huesped: { id: string } | { nuevo: HuespedNuevo };
  origenId: number;
  metodoId: number;
  estadoId: number;
  montoTotal: number;
  montoPagado: number;
  notas: string;
};

export type ResultadoReserva =
  | { ok: true }
  | {
      ok: false;
      tipo: "conflicto" | "validacion" | "documento" | "error";
      mensaje: string;
      huespedId?: string; // huésped ya creado, para reutilizarlo al reintentar
    };

const ESTADOS_AL_CREAR = [1, 2];
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export async function buscarHuespedes(q: string): Promise<HuespedResumen[]> {
  const texto = q.trim();
  if (texto.length < 2) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("huespedes")
    .select("id, nombre_completo, numero_documento, telefono, correo, tipos_documento(nombre)")
    .ilike("nombre_completo", `%${texto.replace(/[%_]/g, "\\$&")}%`)
    .order("nombre_completo")
    .limit(8)
    .overrideTypes<
      {
        id: string;
        nombre_completo: string;
        numero_documento: string | null;
        telefono: string | null;
        correo: string | null;
        tipos_documento: { nombre: string } | null;
      }[],
      { merge: false }
    >();
  if (error) return [];
  return data.map((h) => ({
    id: h.id,
    nombre: h.nombre_completo,
    documento: h.numero_documento
      ? `${h.tipos_documento?.nombre ?? ""} ${h.numero_documento}`.trim()
      : "Sin documento",
    telefono: h.telefono,
    correo: h.correo,
  }));
}

function validar(i: ReservaInput): string | null {
  if (!RE_FECHA.test(i.checkin) || !RE_FECHA.test(i.checkout)) return "Fechas inválidas.";
  if (i.checkin < hoyColombia()) return "El check-in no puede ser una fecha pasada.";
  if (i.checkout <= i.checkin) return "El check-out debe ser posterior al check-in.";
  if (!Number.isInteger(i.numeroHuespedes) || i.numeroHuespedes < 1 || i.numeroHuespedes > MAX_HUESPEDES)
    return `El número de huéspedes debe estar entre 1 y ${MAX_HUESPEDES}.`;
  if (!ESTADOS_AL_CREAR.includes(i.estadoId)) return "Estado de reserva inválido.";
  if (!(i.montoTotal > 0)) return "El monto total debe ser mayor a 0.";
  if (i.montoPagado < 0 || i.montoPagado > i.montoTotal)
    return "El monto pagado no puede ser negativo ni superar el total.";
  if ("nuevo" in i.huesped) {
    const n = i.huesped.nuevo;
    const e =
      errorNombre(n.nombre) || errorTelefono(n.telefono) || errorCorreo(n.correo) || errorDocumento(n.numeroDocumento);
    if (e) return e;
    if (n.numeroDocumento.trim() && !n.tipoDocumentoId) return "Elige el tipo de documento.";
  }
  return null;
}

export async function crearReserva(input: ReservaInput): Promise<ResultadoReserva> {
  const invalido = validar(input);
  if (invalido) return { ok: false, tipo: "validacion", mensaje: invalido };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, tipo: "error", mensaje: "Tu sesión expiró. Vuelve a iniciar sesión." };

  let huespedId: string;
  if ("id" in input.huesped) {
    huespedId = input.huesped.id;
  } else {
    const n = input.huesped.nuevo;
    const tieneDoc = n.numeroDocumento.trim() !== "";
    const { data, error } = await supabase
      .from("huespedes")
      .insert({
        nombre_completo: n.nombre.trim(),
        tipo_documento_id: tieneDoc ? n.tipoDocumentoId : null,
        numero_documento: tieneDoc ? n.numeroDocumento.trim() : null,
        telefono: n.telefono.trim(),
        correo: n.correo.trim(),
        genero_id: n.generoId,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505")
        return {
          ok: false,
          tipo: "documento",
          mensaje: "Ya existe un huésped con ese documento. Búscalo por nombre en lugar de crearlo.",
        };
      return { ok: false, tipo: "error", mensaje: "No se pudo crear el huésped. Intenta de nuevo." };
    }
    huespedId = data.id;
  }

  const { error } = await supabase.from("reservas").insert({
    huesped_id: huespedId,
    fecha_checkin: input.checkin,
    fecha_checkout: input.checkout,
    origen_reserva_id: input.origenId,
    metodo_pago_id: input.metodoId,
    estado_reserva_id: input.estadoId,
    monto_total: input.montoTotal,
    monto_pagado: input.montoPagado,
    numero_huespedes: input.numeroHuespedes,
    notas: input.notas.trim() || null,
  });

  if (error) {
    // 23P01 = exclusion_violation: otra reserva tomó esas fechas.
    if (error.code === "23P01")
      return {
        ok: false,
        tipo: "conflicto",
        mensaje: "Esas fechas ya no están disponibles. Elige otras fechas.",
        huespedId,
      };
    return { ok: false, tipo: "error", mensaje: "No se pudo guardar la reserva. Intenta de nuevo.", huespedId };
  }

  revalidatePath("/");
  return { ok: true };
}

export type EdicionInput = {
  huesped: { id: string } | { nuevo: HuespedNuevo };
  origenId: number;
  metodoId: number;
  estadoId: number; // 1 Pendiente, 2 Confirmada, 3 Cancelada
  montoTotal: number;
  montoPagado: number;
  notas: string;
};

export async function actualizarReserva(
  reservaId: string,
  input: EdicionInput,
): Promise<ResultadoReserva> {
  if (![1, 2, 3].includes(input.estadoId)) return { ok: false, tipo: "validacion", mensaje: "Estado de reserva inválido." };
  if (!(input.montoTotal > 0)) return { ok: false, tipo: "validacion", mensaje: "El monto total debe ser mayor a 0." };
  if (input.montoPagado < 0 || input.montoPagado > input.montoTotal)
    return { ok: false, tipo: "validacion", mensaje: "El monto pagado no puede ser negativo ni superar el total." };
  if ("nuevo" in input.huesped) {
    const n = input.huesped.nuevo;
    const e =
      errorNombre(n.nombre) || errorTelefono(n.telefono) || errorCorreo(n.correo) || errorDocumento(n.numeroDocumento);
    if (e) return { ok: false, tipo: "validacion", mensaje: e };
    if (n.numeroDocumento.trim() && !n.tipoDocumentoId)
      return { ok: false, tipo: "validacion", mensaje: "Elige el tipo de documento." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, tipo: "error", mensaje: "Tu sesión expiró. Vuelve a iniciar sesión." };

  let huespedId: string;
  if ("id" in input.huesped) {
    huespedId = input.huesped.id;
  } else {
    const n = input.huesped.nuevo;
    const tieneDoc = n.numeroDocumento.trim() !== "";
    const { data, error } = await supabase
      .from("huespedes")
      .insert({
        nombre_completo: n.nombre.trim(),
        tipo_documento_id: tieneDoc ? n.tipoDocumentoId : null,
        numero_documento: tieneDoc ? n.numeroDocumento.trim() : null,
        telefono: n.telefono.trim(),
        correo: n.correo.trim(),
        genero_id: n.generoId,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505")
        return { ok: false, tipo: "documento", mensaje: "Ya existe un huésped con ese documento. Búscalo por nombre en lugar de crearlo." };
      return { ok: false, tipo: "error", mensaje: "No se pudo crear el huésped. Intenta de nuevo." };
    }
    huespedId = data.id;
  }

  const { error } = await supabase
    .from("reservas")
    .update({
      huesped_id: huespedId,
      origen_reserva_id: input.origenId,
      metodo_pago_id: input.metodoId,
      estado_reserva_id: input.estadoId,
      monto_total: input.montoTotal,
      monto_pagado: input.montoPagado,
      notas: input.notas.trim() || null,
    })
    .eq("id", reservaId);

  if (error) {
    // Reactivar una reserva cancelada puede chocar con otra que tomó sus fechas.
    if (error.code === "23P01")
      return { ok: false, tipo: "conflicto", mensaje: "No se puede reactivar: otra reserva ocupa esas fechas.", huespedId };
    return { ok: false, tipo: "error", mensaje: "No se pudieron guardar los cambios. Intenta de nuevo.", huespedId };
  }

  revalidatePath("/");
  return { ok: true };
}
