import { createClient } from "@/lib/supabase/server";

export const CATEGORIA_PERSONAL = 12; // ver migración 006
export const CATEGORIA_CASA_POR_DEFECTO = 9; // «Pagos generales»

export type TipoGasto = "casa" | "personal";

export type Gasto = {
  id: string;
  fecha: string;
  tipo: TipoGasto;
  socioId: number | null; // null en personal = «Por confirmar»
  socio: string | null;
  categoriaId: number;
  categoria: string;
  cuentaId: number;
  cuenta: string;
  monto: number;
  descripcion: string | null;
};

type Fila = {
  id: string;
  fecha: string;
  tipo: TipoGasto;
  socio_id: number | null;
  categoria_gasto_id: number;
  metodo_pago_id: number;
  monto: number | string;
  descripcion: string | null;
  categorias_gasto: { nombre: string };
  metodos_pago: { nombre: string };
  socios: { nombre: string } | null;
};

export const GASTOS_POR_PAGINA = 20;

const SELECT =
  "id, fecha, tipo, socio_id, categoria_gasto_id, metodo_pago_id, monto, descripcion, categorias_gasto(nombre), metodos_pago(nombre), socios(nombre)";

export type FiltrosGastos = {
  desde: string | null; // fechas inclusivas YYYY-MM-DD; null = sin filtro de fecha
  hasta: string | null;
  tipo: TipoGasto | null;
  socio: number | "pendiente" | null;
  categoriaId: number | null;
  cuentaId: number | null;
  pagina: number;
};

// Listado paginado (más recientes primero) más totales del filtro completo.
export async function listarGastos(f: FiltrosGastos) {
  const supabase = await createClient();
  const desde = (f.pagina - 1) * GASTOS_POR_PAGINA;

  let consulta = supabase.from("gastos").select(SELECT, { count: "exact" });
  let sumas = supabase.from("gastos").select("monto, tipo");
  if (f.desde && f.hasta) {
    consulta = consulta.gte("fecha", f.desde).lte("fecha", f.hasta);
    sumas = sumas.gte("fecha", f.desde).lte("fecha", f.hasta);
  }
  if (f.tipo) {
    consulta = consulta.eq("tipo", f.tipo);
    sumas = sumas.eq("tipo", f.tipo);
  }
  if (f.socio === "pendiente") {
    consulta = consulta.eq("tipo", "personal").is("socio_id", null);
    sumas = sumas.eq("tipo", "personal").is("socio_id", null);
  } else if (f.socio) {
    consulta = consulta.eq("socio_id", f.socio);
    sumas = sumas.eq("socio_id", f.socio);
  }
  if (f.categoriaId) {
    consulta = consulta.eq("categoria_gasto_id", f.categoriaId);
    sumas = sumas.eq("categoria_gasto_id", f.categoriaId);
  }
  if (f.cuentaId) {
    consulta = consulta.eq("metodo_pago_id", f.cuentaId);
    sumas = sumas.eq("metodo_pago_id", f.cuentaId);
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
  let casa = 0;
  let personal = 0;
  for (const g of montos.data ?? []) {
    if (g.tipo === "casa") casa += Number(g.monto);
    else personal += Number(g.monto);
  }
  return {
    filas: lista.data.map<Gasto>((g) => ({
      id: g.id,
      fecha: g.fecha,
      tipo: g.tipo,
      socioId: g.socio_id,
      socio: g.socios?.nombre ?? null,
      categoriaId: g.categoria_gasto_id,
      categoria: g.categorias_gasto.nombre,
      cuentaId: g.metodo_pago_id,
      cuenta: g.metodos_pago.nombre,
      monto: Number(g.monto),
      descripcion: g.descripcion,
    })),
    total,
    casa,
    personal,
    paginas: Math.max(1, Math.ceil(total / GASTOS_POR_PAGINA)),
  };
}

// Suma de los gastos de la casa del mes (Home).
export async function sumaGastosMes(mes: string): Promise<number> {
  const supabase = await createClient();
  const [y, m] = mes.split("-").map(Number);
  const ultimo = new Date(y, m, 0).getDate();
  const { data, error } = await supabase
    .from("gastos")
    .select("monto")
    .eq("tipo", "casa")
    .gte("fecha", `${mes}-01`)
    .lte("fecha", `${mes}-${String(ultimo).padStart(2, "0")}`)
    .limit(10000);
  if (error) throw new Error("No se pudieron cargar los gastos: " + error.message);
  return data.reduce((a, g) => a + Number(g.monto), 0);
}

// Gastos personales sin socio asignado («Por confirmar»), de todas las fechas.
export async function gastosPendientes() {
  const supabase = await createClient();
  const { data } = await supabase.from("gastos").select("monto").eq("tipo", "personal").is("socio_id", null).limit(10000);
  const filas = data ?? [];
  return { n: filas.length, suma: filas.reduce((a, g) => a + Number(g.monto), 0) };
}

export type Item = { id: number; nombre: string };

export async function catalogosGastos() {
  const supabase = await createClient();
  const [cat, cuentas, socios] = await Promise.all([
    supabase.from("categorias_gasto").select("id, nombre").order("id"),
    supabase.from("metodos_pago").select("id, nombre").order("id"),
    supabase.from("socios").select("id, nombre").order("id"),
  ]);
  if (cat.error) throw new Error("No se pudieron cargar las categorías: " + cat.error.message);
  if (cuentas.error) throw new Error("No se pudieron cargar las cuentas: " + cuentas.error.message);
  if (socios.error) throw new Error("No se pudieron cargar los socios: " + socios.error.message);
  const categorias = cat.data as Item[];
  return {
    categorias, // todas (para filtrar)
    categoriasCasa: categorias.filter((c) => c.id !== CATEGORIA_PERSONAL),
    cuentas: cuentas.data as Item[],
    socios: socios.data as Item[],
  };
}

// Año del gasto más antiguo, para poblar el selector de año.
export async function anioMasAntiguoGastos(): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("gastos").select("fecha").order("fecha").limit(1);
  return data?.[0] ? Number(data[0].fecha.slice(0, 4)) : null;
}
