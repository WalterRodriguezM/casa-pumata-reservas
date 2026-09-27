"use client";

import { useEffect, useRef, useState } from "react";

type Opcion = { valor: string; nombre: string; corto?: string };

type Props = {
  etiqueta: string;
  todos: string; // texto cuando no hay nada elegido, p. ej. «Todos los meses»
  plural: string; // resumen con muchas opciones: «5 meses»
  opciones: Opcion[];
  valor: string[]; // vacío = todos
  cambiar: (v: string[]) => void;
  maxNombres?: number; // hasta cuántas opciones se nombran en el resumen
  deshabilitado?: boolean;
};

// Filtro con casillas: cada casilla aplica el filtro de inmediato, como los demás filtros.
export function SeleccionMultiple({
  etiqueta, todos, plural, opciones, valor, cambiar, maxNombres = 3, deshabilitado,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("pointerdown", fuera);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", fuera);
      window.removeEventListener("keydown", esc);
    };
  }, [abierto]);

  const elegidas = opciones.filter((o) => valor.includes(o.valor));
  const resumen =
    elegidas.length === 0
      ? todos
      : elegidas.length === 1
        ? elegidas[0].nombre
        : elegidas.length <= maxNombres
          ? elegidas.map((o) => o.corto ?? o.nombre).join(", ")
          : `${elegidas.length} ${plural}`;

  const alternar = (v: string) => {
    const nuevo = valor.includes(v) ? valor.filter((x) => x !== v) : [...valor, v];
    // Todas marcadas equivale a «todos».
    cambiar(nuevo.length === opciones.length ? [] : opciones.map((o) => o.valor).filter((x) => nuevo.includes(x)));
  };

  return (
    <div className="ms" ref={caja}>
      <span className="ms-l">{etiqueta}</span>
      <button
        type="button"
        className={`ms-b${abierto ? " on" : ""}`}
        aria-haspopup="true"
        aria-expanded={abierto}
        disabled={deshabilitado}
        onClick={() => setAbierto(!abierto)}
      >
        <span>{deshabilitado ? todos : resumen}</span>
        <small aria-hidden>{abierto ? "▴" : "▾"}</small>
      </button>
      {abierto && (
        <div className="ms-pop" role="group" aria-label={etiqueta}>
          <label className="ms-op todos">
            <input type="checkbox" checked={valor.length === 0} onChange={() => valor.length && cambiar([])} />
            {todos}
          </label>
          {opciones.map((o) => (
            <label key={o.valor} className="ms-op">
              <input type="checkbox" checked={valor.includes(o.valor)} onChange={() => alternar(o.valor)} />
              {o.nombre}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
