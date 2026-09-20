"use client";

import { useRef, useState, useTransition } from "react";
import { actualizarGasto, eliminarGasto, type GastoInput } from "@/app/(app)/gastos/actions";
import { useAviso } from "@/components/aviso";
import type { Item } from "@/lib/catalogos";
import { formatoFecha, formatoPesos } from "@/lib/fechas";
import type { Gasto } from "@/lib/gastos";

type Campo = "fecha" | "categoria" | "monto" | "descripcion";

export function TablaGastos({ filas, categorias }: { filas: Gasto[]; categorias: Item[] }) {
  const [editando, setEditando] = useState<{ id: string; campo: Campo } | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [aviso, mostrar] = useAviso();
  const [, iniciar] = useTransition();

  if (filas.length === 0) return <div className="vacio">No hay gastos con estos filtros.</div>;

  const borrar = (id: string) =>
    iniciar(async () => {
      const r = await eliminarGasto(id);
      setConfirmando(null);
      mostrar(r.ok ? "Gasto eliminado" : r.mensaje);
    });

  return (
    <>
      <div className="tabla">
        <table className="edit">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Categoría</th>
              <th className="r">Monto</th>
              <th>Descripción</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {filas.map((g) => (
              <tr key={g.id}>
                {(["fecha", "categoria", "monto", "descripcion"] as Campo[]).map((campo) => (
                  <Celda
                    key={campo}
                    gasto={g}
                    campo={campo}
                    categorias={categorias}
                    activa={editando?.id === g.id && editando.campo === campo}
                    editar={() => setEditando({ id: g.id, campo })}
                    salir={() => setEditando(null)}
                    guardado={() => mostrar("Gasto actualizado")}
                  />
                ))}
                <td className="acciones">
                  {confirmando === g.id ? (
                    <span className="confirma">
                      ¿Eliminar?
                      <button className="btn peligro" onClick={() => borrar(g.id)}>
                        Sí
                      </button>
                      <button className="btn" onClick={() => setConfirmando(null)}>
                        No
                      </button>
                    </span>
                  ) : (
                    <button className="btn ghost" onClick={() => setConfirmando(g.id)} aria-label={`Eliminar gasto de ${g.categoria}`}>
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {aviso}
    </>
  );
}

function Celda({
  gasto, campo, categorias, activa, editar, salir, guardado,
}: {
  gasto: Gasto;
  campo: Campo;
  categorias: Item[];
  activa: boolean;
  editar: () => void;
  salir: () => void;
  guardado: () => void;
}) {
  const [error, setError] = useState("");
  const [enviando, iniciar] = useTransition();
  const cancelado = useRef(false);
  const yaEnvio = useRef(false);
  const derecha = campo === "monto" ? "r" : "";

  if (!activa) {
    const valor =
      campo === "fecha" ? formatoFecha(gasto.fecha)
      : campo === "categoria" ? gasto.categoria
      : campo === "monto" ? formatoPesos(gasto.monto)
      : gasto.descripcion || <span className="tenue">Sin descripción</span>;
    return (
      <td
        className={`editable ${derecha}`}
        tabIndex={0}
        onClick={editar}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), editar())}
      >
        {valor}
      </td>
    );
  }

  const inicial =
    campo === "fecha" ? gasto.fecha
    : campo === "categoria" ? String(gasto.categoriaId)
    : campo === "monto" ? String(gasto.monto)
    : (gasto.descripcion ?? "");

  const guardar = (crudo: string) => {
    if (cancelado.current || yaEnvio.current) return;
    let cambio: Partial<GastoInput>;
    if (campo === "fecha") {
      if (!crudo) return setError("Elige la fecha del gasto.");
      cambio = { fecha: crudo };
    } else if (campo === "categoria") {
      cambio = { categoriaId: Number(crudo) };
    } else if (campo === "monto") {
      const n = Number(crudo.replace(/\D/g, ""));
      if (!(n > 0)) return setError("El monto debe ser mayor a 0.");
      cambio = { monto: n };
    } else {
      cambio = { descripcion: crudo };
    }
    if (crudo.trim() === inicial.trim()) return salir();
    yaEnvio.current = true;
    iniciar(async () => {
      const r = await actualizarGasto(gasto.id, cambio);
      if (r.ok) {
        salir();
        guardado();
      } else {
        yaEnvio.current = false;
        setError(r.mensaje);
      }
    });
  };

  const alTeclear = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      guardar(e.currentTarget.value);
    } else if (e.key === "Escape") {
      e.stopPropagation();
      cancelado.current = true;
      salir();
    }
  };

  const comunes = {
    autoFocus: true,
    defaultValue: inicial,
    disabled: enviando,
    onKeyDown: alTeclear,
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => guardar(e.currentTarget.value),
    "aria-invalid": !!error,
    className: error ? "invalid" : "",
  };

  return (
    <td className={`editando ${derecha}`}>
      {campo === "categoria" ? (
        <select {...comunes} onChange={(e) => guardar(e.currentTarget.value)}>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...comunes}
          type={campo === "fecha" ? "date" : "text"}
          inputMode={campo === "monto" ? "numeric" : undefined}
          maxLength={campo === "descripcion" ? 200 : undefined}
          placeholder={campo === "descripcion" ? "Descripción (opcional)" : undefined}
          style={campo === "monto" ? { textAlign: "right" } : undefined}
        />
      )}
      {error && <small className="err">{error}</small>}
    </td>
  );
}
