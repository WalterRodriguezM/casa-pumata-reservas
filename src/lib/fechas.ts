// Fechas como 'YYYY-MM-DD' (columnas `date` de Postgres), sin husos horarios.
export const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
export const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export const aIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const desdeIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const sumarDias = (s: string, n: number) => {
  const d = desdeIso(s);
  d.setDate(d.getDate() + n);
  return aIso(d);
};

export const diferenciaDias = (a: string, b: string) =>
  Math.round((desdeIso(b).getTime() - desdeIso(a).getTime()) / 864e5);

export const formatoFecha = (s: string) => {
  const d = desdeIso(s);
  return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
};

export const formatoPesos = (n: number) => "$" + Number(n || 0).toLocaleString("es-CO");

// Hoy en Colombia, para que servidor y navegador coincidan.
export const hoyColombia = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

export const formatoPesosSigno = (n: number) => (n < 0 ? "− " : "") + formatoPesos(Math.abs(n));

export type RangoFechas = { desde: string; hasta: string }; // inclusivo

// Rangos de fechas de los meses (1-12) elegidos en cada año; sin meses = el año completo.
// Los meses seguidos se unen en un solo rango (dic 2025 + ene 2026 incluido).
export function rangosDeMeses(anios: number[], meses: number[]): RangoFechas[] {
  const pares: RangoFechas[] = [];
  for (const a of [...anios].sort((x, y) => x - y)) {
    const ms = meses.length ? [...meses].sort((x, y) => x - y) : [];
    if (!ms.length) {
      pares.push({ desde: `${a}-01-01`, hasta: `${a}-12-31` });
      continue;
    }
    for (const m of ms) {
      const mm = String(m).padStart(2, "0");
      const ultimo = String(new Date(a, m, 0).getDate()).padStart(2, "0");
      pares.push({ desde: `${a}-${mm}-01`, hasta: `${a}-${mm}-${ultimo}` });
    }
  }
  const unidos: RangoFechas[] = [];
  for (const r of pares) {
    const ult = unidos[unidos.length - 1];
    if (ult && sumarDias(ult.hasta, 1) === r.desde) ult.hasta = r.hasta;
    else unidos.push({ ...r });
  }
  return unidos;
}

// Parámetro de URL con varios valores separados por coma: "6,7,8" -> [6, 7, 8] (solo enteros en [min, max]).
export function listaEnteros(v: string, min: number, max: number): number[] {
  const out = new Set<number>();
  for (const p of v.split(",")) if (/^\d+$/.test(p) && Number(p) >= min && Number(p) <= max) out.add(Number(p));
  return [...out].sort((a, b) => a - b);
}
