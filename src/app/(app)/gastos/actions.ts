"use server";

import { revalidatePath } from "next/cache";
import { CATEGORIA_CASA_POR_DEFECTO, CATEGORIA_PERSONAL, type TipoGasto } from "@/lib/gastos";
import { createClient } from "@/lib/supabase/server";

export type ResultadoGasto = { ok: true } | { ok: false; mensaje: string };

export type GastoInput = {
  fecha: string;
  tipo: TipoGasto;
  socioId: number | null; // solo en personal; null = «Por confirmar»
  categoriaId: number; // en personal se ignora: siempre «Personal»
  metodoId: number; // con qué se pagó
  monto: number;
  descripcion: string;
};

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function validar(g: Partial<GastoInput>): string | null {
  if (g.fecha !== undefined && !RE_FECHA.test(g.fecha)) return "Elige la fecha del gasto.";
  if (g.tipo !== undefined && g.tipo !== "casa" && g.tipo !== "personal") return "Elige el tipo de gasto.";
  if (g.socioId !== undefined && g.socioId !== null && !Number.isInteger(g.socioId)) return "Elige un socio.";
  if (g.categoriaId !== undefined && !Number.isInteger(g.categoriaId)) return "Elige una categoría.";
  if (g.metodoId !== undefined && !Number.isInteger(g.metodoId)) return "Elige con qué se pagó.";
  if (g.monto !== undefined && !(g.monto > 0 && g.monto < 1e10)) return "El monto debe ser mayor a 0.";
  if (g.descripcion !== undefined && g.descripcion.length > 200) return "La descripción admite hasta 200 caracteres.";
  return null;
}

async function sesion() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? supabase : null;
}

const SIN_SESION: ResultadoGasto = { ok: false, mensaje: "Tu sesión expiró. Vuelve a iniciar sesión." };

export async function crearGasto(g: GastoInput): Promise<ResultadoGasto> {
  const invalido = validar(g);
  if (invalido) return { ok: false, mensaje: invalido };
  if (g.tipo === "casa" && g.categoriaId === CATEGORIA_PERSONAL)
    return { ok: false, mensaje: "Elige una categoría para el gasto de la casa." };
  const supabase = await sesion();
  if (!supabase) return SIN_SESION;

  const personal = g.tipo === "personal";
  const { error } = await supabase.from("gastos").insert({
    fecha: g.fecha,
    tipo: g.tipo,
    socio_id: personal ? g.socioId : null,
    categoria_gasto_id: personal ? CATEGORIA_PERSONAL : g.categoriaId,
    metodo_pago_id: g.metodoId,
    monto: g.monto,
    descripcion: g.descripcion.trim() || null,
  });
  if (error) return { ok: false, mensaje: "No se pudo guardar el gasto. Intenta de nuevo." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function actualizarGasto(id: string, cambio: Partial<GastoInput>): Promise<ResultadoGasto> {
  const invalido = validar(cambio);
  if (invalido) return { ok: false, mensaje: invalido };
  const supabase = await sesion();
  if (!supabase) return SIN_SESION;

  const fila: Record<string, string | number | null> = {};
  if (cambio.fecha !== undefined) fila.fecha = cambio.fecha;
  if (cambio.monto !== undefined) fila.monto = cambio.monto;
  if (cambio.metodoId !== undefined) fila.metodo_pago_id = cambio.metodoId;
  if (cambio.descripcion !== undefined) fila.descripcion = cambio.descripcion.trim() || null;
  if (cambio.socioId !== undefined) fila.socio_id = cambio.socioId;
  if (cambio.categoriaId !== undefined) fila.categoria_gasto_id = cambio.categoriaId;
  // Cambiar el tipo ajusta socio y categoría para respetar las reglas de la base.
  if (cambio.tipo === "casa") {
    fila.tipo = "casa";
    fila.socio_id = null;
    fila.categoria_gasto_id = cambio.categoriaId ?? CATEGORIA_CASA_POR_DEFECTO;
  } else if (cambio.tipo === "personal") {
    fila.tipo = "personal";
    fila.categoria_gasto_id = CATEGORIA_PERSONAL;
  }
  if (Object.keys(fila).length === 0) return { ok: true };

  const { error } = await supabase.from("gastos").update(fila).eq("id", id);
  if (error) return { ok: false, mensaje: "No se pudo guardar el cambio. Intenta de nuevo." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function eliminarGasto(id: string): Promise<ResultadoGasto> {
  const supabase = await sesion();
  if (!supabase) return SIN_SESION;
  const { error } = await supabase.from("gastos").delete().eq("id", id);
  if (error) return { ok: false, mensaje: "No se pudo eliminar el gasto. Intenta de nuevo." };
  revalidatePath("/", "layout");
  return { ok: true };
}
