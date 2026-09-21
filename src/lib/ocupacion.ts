import { sumarDias } from "@/lib/fechas";
import type { Reserva } from "@/lib/reservas";

// Una reserva ocupa las noches [check-in, check-out): el día de check-out queda
// libre desde la tarde y otra reserva puede entrar ese mismo día.
export type Ocupacion = {
  noche: Map<string, Reserva>; // día -> reserva que ocupa esa noche
  salida: Map<string, Reserva>; // día -> reserva que sale ese día
  nocheOcupada: (d: string) => boolean;
  // Reserva que ocupa la mitad del día: "L" = mañana (sale), "R" = noche (duerme).
  enMitad: (d: string, mitad: "L" | "R") => Reserva | undefined;
  rangoValido: (a: string, b: string, hoy: string) => boolean;
};

export function crearOcupacion(reservas: Reserva[]): Ocupacion {
  const noche = new Map<string, Reserva>();
  const salida = new Map<string, Reserva>();
  for (const r of reservas) {
    for (let d = r.checkin; d < r.checkout; d = sumarDias(d, 1)) noche.set(d, r);
    salida.set(r.checkout, r);
  }
  const enMitad = (d: string, mitad: "L" | "R") => {
    if (mitad === "R") return noche.get(d);
    const r = noche.get(d);
    return salida.get(d) ?? (r && r.checkin < d ? r : undefined);
  };
  return {
    noche,
    salida,
    nocheOcupada: (d) => noche.has(d),
    enMitad,
    // Todas las noches [a, b) deben estar libres y el check-in no puede ser pasado.
    rangoValido: (a, b, hoy) => {
      if (!(a < b) || a < hoy) return false;
      for (let d = a; d < b; d = sumarDias(d, 1)) if (noche.has(d)) return false;
      return true;
    },
  };
}

// Fondo de una celda dividida: mitad izquierda = mañana, derecha = noche.
export function fondoCelda(o: Ocupacion, d: string): string | undefined {
  const izq = !!o.enMitad(d, "L");
  const der = o.nocheOcupada(d);
  if (!izq && !der) return undefined;
  return `linear-gradient(90deg, ${izq ? "var(--occ)" : "transparent"} 50%, ${der ? "var(--occ)" : "transparent"} 50%)`;
}
