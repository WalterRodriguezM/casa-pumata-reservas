import { createClient } from "@/lib/supabase/server";
import { MESES, diferenciaDias, sumarDias } from "@/lib/fechas";

const CANCELADA = 3;

export type ReservaR = {
  checkin: string;
  checkout: string;
  total: number;
  pagado: number;
  origen: string;
  huesped: string;
};
export type GastoR = { fecha: string; monto: number; categoria: string };
export type Datos = { reservas: ReservaR[]; gastos: GastoR[] };
export type Periodo = { desde: string; hasta: string };

export type Agregado = {
  reservas: ReservaR[];
  gastos: GastoR[];
  ingresos: number; // cobrado (monto_pagado) de reservas con check-in en el período
  gastosTotal: number;
  balance: number;
  porCobrar: number;
  noches: number;
  dias: number; // días del período transcurridos hasta hoy
  ocupados: number;
  pct: number;
};

const dosDigitos = (n: number) => String(n).padStart(2, "0");

export function periodo(anio: number, mes: number): Periodo {
  if (!mes) return { desde: `${anio}-01-01`, hasta: `${anio}-12-31` };
  const ultimo = new Date(anio, mes, 0).getDate();
  return { desde: `${anio}-${dosDigitos(mes)}-01`, hasta: `${anio}-${dosDigitos(mes)}-${dosDigitos(ultimo)}` };
}

// mes 1 -> diciembre del año anterior; mes 0 (año completo) -> año anterior.
export function periodoAnterior(anio: number, mes: number) {
  const py = mes <= 1 ? anio - 1 : anio;
  const pm = mes === 0 ? 0 : mes === 1 ? 12 : mes - 1;
  return { anio: py, mes: pm, ...periodo(py, pm) };
}

export const etiquetaPeriodo = (anio: number, mes: number) =>
  mes ? `${MESES[mes - 1]} ${anio}` : `año ${anio}`;

export function agregar(d: Datos, p: Periodo, hoy: string): Agregado {
  const reservas = d.reservas.filter((r) => r.checkin >= p.desde && r.checkin <= p.hasta);
  const gastos = d.gastos.filter((g) => g.fecha >= p.desde && g.fecha <= p.hasta);
  const ingresos = reservas.reduce((a, r) => a + r.pagado, 0);
  const porCobrar = reservas.reduce((a, r) => a + (r.total - r.pagado), 0);
  const gastosTotal = gastos.reduce((a, g) => a + g.monto, 0);

  const fin = p.hasta < hoy ? p.hasta : hoy;
  const dias = fin >= p.desde ? diferenciaDias(p.desde, fin) + 1 : 0;
  const ocupados = new Set<string>();
  for (const r of d.reservas) {
    const ini = r.checkin > p.desde ? r.checkin : p.desde;
    const fi = r.checkout < fin ? r.checkout : fin;
    for (let x = ini; x <= fi; x = sumarDias(x, 1)) ocupados.add(x);
  }

  return {
    reservas,
    gastos,
    ingresos,
    gastosTotal,
    balance: ingresos - gastosTotal,
    porCobrar,
    noches: reservas.reduce((a, r) => a + diferenciaDias(r.checkin, r.checkout), 0),
    dias,
    ocupados: ocupados.size,
    pct: dias ? Math.round((ocupados.size / dias) * 100) : 0,
  };
}

export function gastosPorCategoria(gs: GastoR[]) {
  const m = new Map<string, number>();
  for (const g of gs) m.set(g.categoria, (m.get(g.categoria) ?? 0) + g.monto);
  return [...m].map(([nombre, valor]) => ({ nombre, valor })).sort((a, b) => b.valor - a.valor);
}

export function ingresosPorOrigen(rs: ReservaR[]) {
  const m = new Map<string, { valor: number; n: number }>();
  for (const r of rs) {
    const x = m.get(r.origen) ?? { valor: 0, n: 0 };
    m.set(r.origen, { valor: x.valor + r.pagado, n: x.n + 1 });
  }
  return [...m].map(([nombre, x]) => ({ nombre, ...x })).sort((a, b) => b.valor - a.valor);
}

export type Busqueda = Record<string, string | string[] | undefined>;
const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function leerFiltros(sp: Busqueda, hoy: string) {
  const anioActual = Number(hoy.slice(0, 4));
  const a = uno(sp.anio);
  const m = uno(sp.mes);
  return {
    anio: /^\d{4}$/.test(a) ? Number(a) : anioActual,
    mes: /^(?:[1-9]|1[0-2])$/.test(m) ? Number(m) : 0,
    comparar: uno(sp.cmp) === "1",
  };
}

// Reservas no canceladas y gastos del año pedido y del anterior (para comparar).
export async function cargarDatos(anio: number): Promise<Datos> {
  const supabase = await createClient();
  const desde = `${anio - 1}-01-01`;
  const hasta = `${anio}-12-31`;

  const [rs, gs] = await Promise.all([
    supabase
      .from("reservas")
      .select("fecha_checkin, fecha_checkout, monto_total, monto_pagado, origenes_reserva(nombre), huespedes(nombre_completo)")
      .neq("estado_reserva_id", CANCELADA)
      .lte("fecha_checkin", hasta)
      .gte("fecha_checkout", desde)
      .limit(10000)
      .overrideTypes<
        {
          fecha_checkin: string;
          fecha_checkout: string;
          monto_total: number | string;
          monto_pagado: number | string;
          origenes_reserva: { nombre: string };
          huespedes: { nombre_completo: string };
        }[],
        { merge: false }
      >(),
    supabase
      .from("gastos")
      .select("fecha, monto, categorias_gasto(nombre)")
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .limit(10000)
      .overrideTypes<{ fecha: string; monto: number | string; categorias_gasto: { nombre: string } }[], { merge: false }>(),
  ]);
  if (rs.error) throw new Error("No se pudieron cargar las reservas: " + rs.error.message);
  if (gs.error) throw new Error("No se pudieron cargar los gastos: " + gs.error.message);

  return {
    reservas: rs.data.map((r) => ({
      checkin: r.fecha_checkin,
      checkout: r.fecha_checkout,
      total: Number(r.monto_total),
      pagado: Number(r.monto_pagado),
      origen: r.origenes_reserva.nombre,
      huesped: r.huespedes.nombre_completo,
    })),
    gastos: gs.data.map((g) => ({ fecha: g.fecha, monto: Number(g.monto), categoria: g.categorias_gasto.nombre })),
  };
}

// Primer año con datos (reservas o gastos), para el selector de año.
export async function primerAnioConDatos(): Promise<number | null> {
  const supabase = await createClient();
  const [r, g] = await Promise.all([
    supabase.from("reservas").select("fecha_checkin").order("fecha_checkin").limit(1),
    supabase.from("gastos").select("fecha").order("fecha").limit(1),
  ]);
  const anios = [r.data?.[0]?.fecha_checkin, g.data?.[0]?.fecha].filter(Boolean).map((f) => Number((f as string).slice(0, 4)));
  return anios.length ? Math.min(...anios) : null;
}

/* ---------- CSV (separador «;» y decimales con coma: abre directo en Excel en español) ---------- */
const celda = (v: string | number) => {
  const s = typeof v === "number" ? String(v).replace(".", ",") : v;
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const aCsv = (filas: (string | number)[][]) => "﻿" + filas.map((f) => f.map(celda).join(";")).join("\r\n");

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function csvResumen(d: Datos, anio: number, mes: number, hoy: string) {
  const A = agregar(d, periodo(anio, mes), hoy);
  const filas: (string | number)[][] = [
    ["Reporte Casa Pumata", capitalizar(etiquetaPeriodo(anio, mes))],
    [],
    ["Indicador", "Valor"],
    ["Ingresos cobrados", A.ingresos],
    ["Gastos", A.gastosTotal],
    ["Balance", A.balance],
    ["Ocupación %", A.pct],
    ["Por cobrar", A.porCobrar],
    [],
    ["Gastos por categoría", "Monto"],
    ...gastosPorCategoria(A.gastos).map((x) => [x.nombre, x.valor]),
    [],
    ["Ingresos por origen", "Monto cobrado", "Reservas"],
    ...ingresosPorOrigen(A.reservas).map((x) => [x.nombre, x.valor, x.n]),
    [],
    ["Mes", "Reservas", "Noches", "Ocupación %", "Ingresos", "Gastos", "Balance"],
  ];
  for (let i = 1; i <= 12; i++) {
    const x = agregar(d, periodo(anio, i), hoy);
    if (x.dias) filas.push([capitalizar(MESES[i - 1]), x.reservas.length, x.noches, x.pct, x.ingresos, x.gastosTotal, x.balance]);
  }
  return aCsv(filas);
}

export function csvDetalle(d: Datos, anio: number, mes: number) {
  const p = periodo(anio, mes);
  const filas: (string | number)[][] = [["Tipo", "Fecha", "Descripción", "Origen / Categoría", "Monto", "Costo total"]];
  d.reservas
    .filter((r) => r.checkin >= p.desde && r.checkin <= p.hasta)
    .sort((a, b) => a.checkin.localeCompare(b.checkin))
    .forEach((r) =>
      filas.push(["Reserva", r.checkin, `${r.huesped} · salida ${r.checkout} · ${diferenciaDias(r.checkin, r.checkout)} noches`, r.origen, r.pagado, r.total]),
    );
  d.gastos
    .filter((g) => g.fecha >= p.desde && g.fecha <= p.hasta)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .forEach((g) => filas.push(["Gasto", g.fecha, "", g.categoria, -g.monto, ""]));
  return aCsv(filas);
}
