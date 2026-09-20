"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Item } from "@/lib/catalogos";

export function FiltrosReservas({ origenes, estados }: { origenes: Item[]; estados: Item[] }) {
  const router = useRouter();
  const ruta = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const primera = useRef(true);

  const ir = (cambio: Record<string, string>) => {
    const nuevo = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(cambio)) {
      if (v) nuevo.set(k, v);
      else nuevo.delete(k);
    }
    nuevo.delete("pagina");
    const s = nuevo.toString();
    router.replace(s ? `${ruta}?${s}` : ruta);
  };

  // La búsqueda por nombre espera a que dejes de escribir.
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    const t = setTimeout(() => ir({ q: q.trim() }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const hayFiltros = !!(q || params.get("origen") || params.get("estado"));

  return (
    <div className="filtros">
      <label>
        Huésped
        <input type="search" placeholder="Buscar por nombre…" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <label>
        Origen
        <select value={params.get("origen") ?? ""} onChange={(e) => ir({ origen: e.target.value })}>
          <option value="">Todos</option>
          {origenes.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombre}
            </option>
          ))}
        </select>
      </label>
      <label>
        Estado
        <select value={params.get("estado") ?? ""} onChange={(e) => ir({ estado: e.target.value })}>
          <option value="">Todos</option>
          {estados.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombre}
            </option>
          ))}
        </select>
      </label>
      {hayFiltros && (
        <button
          className="btn ghost"
          onClick={() => {
            setQ("");
            router.replace(ruta);
          }}
        >
          Limpiar
        </button>
      )}
    </div>
  );
}
