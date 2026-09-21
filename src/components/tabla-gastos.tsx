"use client";

import { useRef, useState, useTransition } from "react";
import { actualizarGasto, eliminarGasto, type GastoInput } from "@/app/(app)/gastos/actions";
import { useAviso } from "@/components/aviso";
import type { Item } from "@/lib/catalogos";
import { formatoFecha, formatoPesos } from "@/lib/fechas";
import type { Gasto } from "@/lib/gastos";

type Campo = "fecha" | "tipo" | "socio" | "categoria" | "cuenta" | "monto" | "descripcion";
const CAMPOS: Campo[] = ["fecha", "tipo", "socio", "categoria", "cuenta", "monto", "descripcion"];

type Props = { filas: Gasto[]; categoriasCasa: Item[]; cuentas: Item[]; socios: Item[] };

export function TablaGastos({ filas, categoriasCasa, cuentas, socios }: Props) {
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
        <table className="edit" style={{ minWidth: 980 }}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Socio</th>
              <th>Categoría</th>
              <th>Se pagó con</th>
              <th className="r">Monto</th>
              <th>Descripción</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {filas.map((g) => (
              <tr key={g.id}>
                {CAMPOS.map((campo) => (
                  <Celda
                    key={campo}
                    gasto={g}
                    campo={campo}
                    categoriasCasa={categoriasCasa}
                    cuentas={cuentas}
                    socios={socios}
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
  gasto, campo, categoriasCasa, cuentas, socios, activa, editar, salir, guardado,
}: {
  gasto: Gasto;
  campo: Campo;
  categoriasCasa: Item[];
  cuentas: Item[];
  socios: Item[];
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
  const personal = gasto.tipo === "personal";

  // Socio solo aplica a gastos personales; la categoría de los personales es fija.
  if (campo === "socio" && !personal)
    return <td className="tenue">—</td>;
  if (campo === "categoria" && personal)
    return <td className="tenue">Personal</td>;

  if (!activa) {
    let valor: React.ReactNode;
    if (campo === "fecha") valor = formatoFecha(gasto.fecha);
    else if (campo === "tipo") valor = <span className={`tipo-chip ${gasto.tipo}`}>{personal ? "Personal" : "Casa"}</span>;
    else if (campo === "socio") valor = gasto.socio ?? <span className="tipo-chip pend">Por confirmar</span>;
    else if (campo === "categoria") valor = gasto.categoria;
    else if (campo === "cuenta") valor = gasto.cuenta;
    else if (campo === "monto") valor = formatoPesos(gasto.monto);
    else valor = gasto.descripcion || <span className="tenue">Sin descripción</span>;
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
    : campo === "tipo" ? gasto.tipo
    : campo === "socio" ? String(gasto.socioId ?? "")
    : campo === "categoria" ? String(gasto.categoriaId)
    : campo === "cuenta" ? String(gasto.cuentaId)
    : campo === "monto" ? String(gasto.monto)
    : (gasto.descripcion ?? "");

  const guardar = (crudo: string) => {
    if (cancelado.current || yaEnvio.current) return;
    let cambio: Partial<GastoInput>;
    if (campo === "fecha") {
      if (!crudo) return setError("Elige la fecha del gasto.");
      cambio = { fecha: crudo };
    } else if (campo === "tipo") {
      cambio = { tipo: crudo === "personal" ? "personal" : "casa" };
    } else if (campo === "socio") {
      cambio = { socioId: crudo ? Number(crudo) : null };
    } else if (campo === "categoria") {
      cambio = { categoriaId: Number(crudo) };
    } else if (campo === "cuenta") {
      cambio = { metodoId: Number(crudo) };
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
  const conSelect = (opciones: { valor: string; texto: string }[]) => (
    <select {...comunes} onChange={(e) => guardar(e.currentTarget.value)}>
      {opciones.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.texto}
        </option>
      ))}
    </select>
  );

  return (
    <td className={`editando ${derecha}`}>
      {campo === "tipo"
        ? conSelect([{ valor: "casa", texto: "Casa" }, { valor: "personal", texto: "Personal" }])
        : campo === "socio"
          ? conSelect([{ valor: "", texto: "Por confirmar" }, ...socios.map((s) => ({ valor: String(s.id), texto: s.nombre }))])
          : campo === "categoria"
            ? conSelect(categoriasCasa.map((c) => ({ valor: String(c.id), texto: c.nombre })))
            : campo === "cuenta"
              ? conSelect(cuentas.map((c) => ({ valor: String(c.id), texto: c.nombre })))
              : (
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
