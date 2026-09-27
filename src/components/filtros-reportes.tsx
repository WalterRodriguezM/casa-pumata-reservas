"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MESES } from "@/lib/fechas";
import { SeleccionMultiple } from "@/components/seleccion-multiple";

type Props = {
  anios: number[];
  anio: number;
  meses: number[]; // vacío = todo el año
  comparar: boolean;
  etqComparar: string; // período contra el que se compara, p. ej. «junio–agosto 2025»
  soloPeriodo?: boolean;
};

export function FiltrosReportes({ anios, anio, meses, comparar, etqComparar, soloPeriodo }: Props) {
  const router = useRouter();
  const ruta = usePathname();
  const params = useSearchParams();

  const ir = (cambio: Record<string, string>) => {
    const nuevo = new URLSearchParams(params.toString());
    nuevo.set("anio", String(anio));
    if (meses.length) nuevo.set("mes", meses.join(","));
    else nuevo.delete("mes");
    if (comparar) nuevo.set("cmp", "1");
    for (const [k, v] of Object.entries(cambio)) {
      if (v) nuevo.set(k, v);
      else nuevo.delete(k);
    }
    router.replace(`${ruta}?${nuevo.toString()}`);
  };

  const exportar = (tipo: "resumen" | "detalle") =>
    `/reportes/exportar?tipo=${tipo}&anio=${anio}${meses.length ? `&mes=${meses.join(",")}` : ""}`;

  return (
    <div className="filtros">
      <label>
        Año
        <select value={anio} onChange={(e) => ir({ anio: e.target.value })}>
          {anios.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>
      <SeleccionMultiple
        etiqueta="Mes"
        todos="Todo el año"
        plural="meses"
        opciones={MESES.map((m, i) => ({ valor: String(i + 1), nombre: m.charAt(0).toUpperCase() + m.slice(1), corto: m.charAt(0).toUpperCase() + m.slice(1, 3) }))}
        valor={meses.map(String)}
        cambiar={(v) => ir({ mes: v.join(",") })}
      />
      {!soloPeriodo && (
      <label className="check">
        <input type="checkbox" checked={comparar} onChange={(e) => ir({ cmp: e.target.checked ? "1" : "" })} />
        Comparar con {etqComparar}
      </label>
      )}
      {!soloPeriodo && (
      <details className="menu">
        <summary className="btn primary">Exportar ▾</summary>
        <div className="menu-l">
          <a href={exportar("resumen")} download>
            <b>Resumen del período</b>
            <small>Totales, desgloses y resumen por mes (CSV)</small>
          </a>
          <a href={exportar("detalle")} download>
            <b>Detalle de movimientos</b>
            <small>Cada reserva y cada gasto del período (CSV)</small>
          </a>
        </div>
      </details>
      )}
    </div>
  );
}
