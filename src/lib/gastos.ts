import { createClient } from "@/lib/supabase/server";

export type Gasto = {
  id: string;
  fecha: string;
  categoriaId: number;
  categoria: string;
  monto: number;
  descripcion: string | null;
};

type Fila = {
  id: string;
  fecha: string;
  categoria_gasto_id: number;
  monto: number | string;
  descripcion: string | null;
  categorias_gasto: { nombre: string };
};

export const GASTOS_POR_PAGINA = 20;

const rangoMes = (mes: string) => {
  const [y, m] = mes.split("-").map(Number);
  const ultimo = new Date(y, m, 0).getDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${String(ultimo).padStart(2, "0")}` };
};

export type FiltrosGastos = {
  desde: string | null; // fechas inclusivas YYYY-MM-DD; null = sin filtro de fecha
  hasta: string | null;
  categoriaId: number | null;
  pagina: number;
};

// Listado paginado (más recientes primero) más total y cuenta del filtro completo.
export async function listarGastos(f: FiltrosGastos) {
  const supabase = await createClient();
  const rango = f.desde && f.hasta ? { desde: f.desde, hasta: f.hasta } : null;
  const desde = (f.pagina - 1) * GASTOS_POR_PAGINA;

  let consulta = supabase
    .from("gastos")
    .select("id, fecha, categoria_gasto_id, monto, descripcion, categorias_gasto(nombre)", { count: "exact" });
  let sumas = supabase.from("gastos").select("monto");
  if (rango) {
    consulta = consulta.gte("fecha", rango.desde).lte("fecha", rango.hasta);
    sumas = sumas.gte("fecha", rango.desde).lte("fecha", rango.hasta);
  }
  if (f.categoriaId) {
    consulta = consulta.eq("categoria_gasto_id", f.categoriaId);
    sumas = sumas.eq("categoria_gasto_id", f.categoriaId);
  }

  const [lista, montos] = await Promise.all([
    consulta
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .range(desde, desde + GASTOS_POR_PAGINA - 1)
      .overrideTypes<Fila[], { merge: false }>(),
    sumas.limit(10000),
  ]);

  if (lista.error) throw new Error("No se pudieron cargar los gastos: " + lista.error.message);
  const total = lista.count ?? 0;
  const suma = (montos.data ?? []).reduce((a, g) => a + Number(g.monto), 0);
  return {
    filas: lista.data.map<Gasto>((g) => ({
      id: g.id,
      fecha: g.fecha,
      categoriaId: g.categoria_gasto_id,
      categoria: g.categorias_gasto.nombre,
      monto: Number(g.monto),
      descripcion: g.descripcion,
    })),
    total,
    suma,
    paginas: Math.max(1, Math.ceil(total / GASTOS_POR_PAGINA)),
  };
}

export async function sumaGastosMes(mes: string): Promise<number> {
  const supabase = await createClient();
  const { desde, hasta } = rangoMes(mes);
  const { data, error } = await supabase.from("gastos").select("monto").gte("fecha", desde).lte("fecha", hasta).limit(10000);
  if (error) throw new Error("No se pudieron cargar los gastos: " + error.message);
  return data.reduce((a, g) => a + Number(g.monto), 0);
}

export async function categoriasGasto() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categorias_gasto").select("id, nombre").order("id");
  if (error) throw new Error("No se pudieron cargar las categorías: " + error.message);
  return data as { id: number; nombre: string }[];
}

// Año del gasto más antiguo, para poblar el selector de año.
export async function anioMasAntiguoGastos(): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("gastos").select("fecha").order("fecha").limit(1);
  return data?.[0] ? Number(data[0].fecha.slice(0, 4)) : null;
}
