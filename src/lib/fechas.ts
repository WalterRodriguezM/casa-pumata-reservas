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
