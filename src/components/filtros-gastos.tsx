"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Item } from "@/lib/catalogos";
import { MESES } from "@/lib/fechas";

type Props = {
  categorias: Item[];
  anios: number[];
  anioActual: number;
  mesActual: number; // 1-12
};

// Sin parámetros = año y mes actuales. `anio=todos` quita el filtro de fecha.
// `mes=todos` (con un año) muestra el año completo.
export function FiltrosGastos({ categorias, anios, anioActual, mesActual }: Props) {
  const router = useRouter();
  const ruta = usePathname();
  const params = useSearchParams();

  const anioParam = params.get("anio");
  const mesParam = params.get("mes");
  const anio = anioParam === null ? String(anioActual) : anioParam;
  const mes = anioParam === null && mesParam === null ? String(mesActual) : (mesParam ?? "todos");

  const ir = (cambio: Record<string, string>) => {
    const nuevo = new URLSearchParams(params.toString());
    nuevo.set("anio", anio);
    nuevo.set("mes", mes);
    for (const [k, v] of Object.entries(cambio)) {
      if (v) nuevo.set(k, v);
      else nuevo.delete(k);
    }
    nuevo.delete("pagina");
    router.replace(`${ruta}?${nuevo.toString()}`);
  };

  return (
    <div className="filtros">
      <label>
        Año
        <select value={anio} onChange={(e) => ir({ anio: e.target.value })}>
          <option value="todos">Todos los años</option>
          {anios.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>
      <label>
        Mes
        <select value={anio === "todos" ? "todos" : mes} disabled={anio === "todos"} onChange={(e) => ir({ mes: e.target.value })}>
          <option value="todos">Todos los meses</option>
          {MESES.map((m, i) => (
            <option key={m} value={i + 1}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Categoría
        <select value={params.get("categoria") ?? ""} onChange={(e) => ir({ categoria: e.target.value })}>
          <option value="">Todas</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>
      {(anioParam !== null || mesParam !== null || params.get("categoria")) && (
        <button className="btn ghost" onClick={() => router.replace(ruta)}>
          Mes actual
        </button>
      )}
    </div>
  );
}
