"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResultadoGasto = { ok: true } | { ok: false; mensaje: string };

export type GastoInput = {
  fecha: string;
  categoriaId: number;
  monto: number;
  descripcion: string;
};

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function validar(g: Partial<GastoInput>): string | null {
  if (g.fecha !== undefined && !RE_FECHA.test(g.fecha)) return "Elige la fecha del gasto.";
  if (g.categoriaId !== undefined && !Number.isInteger(g.categoriaId)) return "Elige una categoría.";
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
  const supabase = await sesion();
  if (!supabase) return SIN_SESION;

  const { error } = await supabase.from("gastos").insert({
    fecha: g.fecha,
    categoria_gasto_id: g.categoriaId,
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
  if (cambio.categoriaId !== undefined) fila.categoria_gasto_id = cambio.categoriaId;
  if (cambio.monto !== undefined) fila.monto = cambio.monto;
  if (cambio.descripcion !== undefined) fila.descripcion = cambio.descripcion.trim() || null;
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
