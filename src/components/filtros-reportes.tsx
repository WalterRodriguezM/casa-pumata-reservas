"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MESES } from "@/lib/fechas";

type Props = { anios: number[]; anio: number; mes: number; comparar: boolean; soloPeriodo?: boolean };

export function FiltrosReportes({ anios, anio, mes, comparar, soloPeriodo }: Props) {
  const router = useRouter();
  const ruta = usePathname();
  const params = useSearchParams();

  const ir = (cambio: Record<string, string>) => {
    const nuevo = new URLSearchParams(params.toString());
    nuevo.set("anio", String(anio));
    nuevo.set("mes", String(mes));
    if (comparar) nuevo.set("cmp", "1");
    for (const [k, v] of Object.entries(cambio)) {
      if (v) nuevo.set(k, v);
      else nuevo.delete(k);
    }
    router.replace(`${ruta}?${nuevo.toString()}`);
  };

  const exportar = (tipo: "resumen" | "detalle") => `/reportes/exportar?tipo=${tipo}&anio=${anio}&mes=${mes}`;

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
      <label>
        Mes
        <select value={mes} onChange={(e) => ir({ mes: e.target.value })}>
          <option value="0">Todo el año</option>
          {MESES.map((m, i) => (
            <option key={m} value={i + 1}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </option>
          ))}
        </select>
      </label>
      {!soloPeriodo && (
      <label className="check">
        <input type="checkbox" checked={comparar} onChange={(e) => ir({ cmp: e.target.checked ? "1" : "" })} />
        Comparar con el período anterior
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
