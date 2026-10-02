import { sumarDias } from "@/lib/fechas";
import type { Reserva } from "@/lib/reservas";

// Una reserva ocupa las noches [check-in, check-out): el día de check-out queda
// libre desde la tarde y otra reserva puede entrar ese mismo día.
export type Ocupacion = {
  noche: Map<string, Reserva>; // día -> reserva que ocupa esa noche
  salida: Map<string, Reserva>; // día -> reserva que sale ese día
  tono: Map<string, 0 | 1>; // id de reserva -> tono de su barra en el calendario
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
    tono: tonosPorCadena(reservas),
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

const CANCELADA = 3;

// Tono de cada reserva: en una cadena de reservas pegadas (la siguiente entra el día
// que sale la anterior) los tonos alternan 0, 1, 0…; una reserva sin otra pegada
// antes vuelve al 0. Así el tono no cambia al crear reservas en otras fechas.
export function tonosPorCadena(reservas: Reserva[]): Map<string, 0 | 1> {
  const orden = reservas.filter((r) => r.estadoId !== CANCELADA).sort((a, b) => a.checkin.localeCompare(b.checkin));
  const tono = new Map<string, 0 | 1>();
  orden.forEach((r, i) => {
    const previa = orden[i - 1];
    tono.set(r.id, previa && previa.checkout === r.checkin ? (tono.get(previa.id) === 0 ? 1 : 0) : 0);
  });
  return tono;
}

// Tramos de barra que se dibujan en un día:
//  * sale: la reserva que sale ese día (ocupa la mañana, termina antes de la mitad).
//  * noche: la reserva que duerme esa noche; `entra` si ese día es su check-in
//    (empieza después de la mitad), si no, viene del día anterior y ocupa la celda entera.
export type TramosDia = { sale?: Reserva; noche?: Reserva; entra: boolean };

export function tramosDia(o: Ocupacion, d: string): TramosDia {
  const noche = o.noche.get(d);
  return { sale: o.salida.get(d), noche, entra: !!noche && noche.checkin === d };
}
