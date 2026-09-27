"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Item } from "@/lib/catalogos";
import { MESES } from "@/lib/fechas";
import { SeleccionMultiple } from "@/components/seleccion-multiple";

type Props = {
  categorias: Item[];
  cuentas: Item[];
  socios: Item[];
  anios: number[];
  anioActual: number;
  mesActual: number; // 1-12
};

// Sin parámetros = año y mes actuales. `anio=todos` quita el filtro de fecha.
// `mes=todos` (con un año) muestra el año completo. Año, mes y categoría admiten
// varios valores separados por coma: `anio=2025,2026&mes=8,9&categoria=1,3`.
export function FiltrosGastos({ categorias, cuentas, socios, anios, anioActual, mesActual }: Props) {
  const router = useRouter();
  const ruta = usePathname();
  const params = useSearchParams();

  const anioParam = params.get("anio");
  const mesParam = params.get("mes");
  const lista = (v: string | null) => (!v || v === "todos" ? [] : v.split(","));
  const aniosSel = anioParam === null ? [String(anioActual)] : lista(anioParam);
  const meses = anioParam === null && mesParam === null ? [String(mesActual)] : lista(mesParam);
  const categoriasSel = lista(params.get("categoria"));

  const ir = (cambio: Record<string, string>) => {
    const nuevo = new URLSearchParams(params.toString());
    nuevo.set("anio", aniosSel.join(",") || "todos");
    nuevo.set("mes", meses.join(",") || "todos");
    for (const [k, v] of Object.entries(cambio)) {
      if (v) nuevo.set(k, v);
      else nuevo.delete(k);
    }
    nuevo.delete("pagina");
    router.replace(`${ruta}?${nuevo.toString()}`);
  };

  const hayFiltros = ["anio", "mes", "tipo", "socio", "categoria", "cuenta"].some((k) => params.get(k));

  return (
    <div className="filtros">
      <SeleccionMultiple
        etiqueta="Año"
        todos="Todos los años"
        plural="años"
        opciones={anios.map((a) => ({ valor: String(a), nombre: String(a) }))}
        valor={aniosSel}
        cambiar={(v) => ir({ anio: v.join(",") || "todos" })}
      />
      <SeleccionMultiple
        etiqueta="Mes"
        todos="Todos los meses"
        plural="meses"
        opciones={MESES.map((m, i) => ({ valor: String(i + 1), nombre: m.charAt(0).toUpperCase() + m.slice(1), corto: m.charAt(0).toUpperCase() + m.slice(1, 3) }))}
        valor={meses}
        cambiar={(v) => ir({ mes: v.join(",") || "todos" })}
        deshabilitado={aniosSel.length === 0}
      />
      <label>
        Tipo
        <select value={params.get("tipo") ?? ""} onChange={(e) => ir({ tipo: e.target.value })}>
          <option value="">Todos</option>
          <option value="casa">Casa</option>
          <option value="personal">Personal</option>
        </select>
      </label>
      <label>
        Socio
        <select value={params.get("socio") ?? ""} onChange={(e) => ir({ socio: e.target.value })}>
          <option value="">Todos</option>
          {socios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
          <option value="pendiente">Por confirmar</option>
        </select>
      </label>
      <SeleccionMultiple
        etiqueta="Categoría"
        todos="Todas"
        plural="categorías"
        opciones={categorias.map((c) => ({ valor: String(c.id), nombre: c.nombre }))}
        valor={categoriasSel}
        cambiar={(v) => ir({ categoria: v.join(",") })}
        maxNombres={1}
      />
      <label>
        Se pagó con
        <select value={params.get("cuenta") ?? ""} onChange={(e) => ir({ cuenta: e.target.value })}>
          <option value="">Todas</option>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>
      {hayFiltros && (
        <button className="btn ghost" onClick={() => router.replace(ruta)}>
          Mes actual
        </button>
      )}
    </div>
  );
}
