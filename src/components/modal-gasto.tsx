"use client";

import { useState, useTransition } from "react";
import { crearGasto } from "@/app/(app)/gastos/actions";
import { useAviso } from "@/components/aviso";
import type { Item } from "@/lib/catalogos";
import { formatoPesos } from "@/lib/fechas";

export function BotonNuevoGasto({ categorias, hoy }: { categorias: Item[]; hoy: string }) {
  const [abierto, setAbierto] = useState(false);
  const [aviso, mostrar] = useAviso();
  return (
    <>
      <button className="btn primary" onClick={() => setAbierto(true)}>
        + Nuevo gasto
      </button>
      {abierto && (
        <ModalGasto
          categorias={categorias}
          hoy={hoy}
          cerrar={() => setAbierto(false)}
          creado={(m) => {
            setAbierto(false);
            mostrar(m);
          }}
        />
      )}
      {aviso}
    </>
  );
}

function ModalGasto({
  categorias, hoy, cerrar, creado,
}: {
  categorias: Item[];
  hoy: string;
  cerrar: () => void;
  creado: (mensaje: string) => void;
}) {
  const [fecha, setFecha] = useState(hoy);
  const [categoriaId, setCategoriaId] = useState("");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [errores, setErrores] = useState<{ fecha?: string; categoria?: string; monto?: string; envio?: string }>({});
  const [enviando, iniciar] = useTransition();

  const guardar = () => {
    const e = {
      fecha: fecha ? undefined : "Elige la fecha del gasto.",
      categoria: categoriaId ? undefined : "Elige una categoría.",
      monto: Number(monto) > 0 ? undefined : "El monto debe ser mayor a 0.",
    };
    setErrores(e);
    if (e.fecha || e.categoria || e.monto) return;
    iniciar(async () => {
      const r = await crearGasto({ fecha, categoriaId: Number(categoriaId), monto: Number(monto), descripcion });
      if (r.ok) {
        const cat = categorias.find((c) => c.id === Number(categoriaId))?.nombre ?? "";
        creado(`Gasto registrado: ${cat} · ${formatoPesos(Number(monto))}`);
      } else setErrores({ envio: r.mensaje });
    });
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && cerrar()}>
      <div className="modal modal-chico" role="dialog" aria-modal="true" aria-labelledby="gasto-titulo" onKeyDown={(e) => e.key === "Escape" && cerrar()}>
        <div className="mh">
          <h3 id="gasto-titulo">Nuevo gasto</h3>
          <button className="btn ghost" onClick={cerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="mb">
          {errores.envio && <div className="alert" role="alert">{errores.envio}</div>}
          <label>
            Fecha *
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={errores.fecha ? "invalid" : ""} />
            {errores.fecha && <small className="err">{errores.fecha}</small>}
          </label>
          <label>
            Categoría *
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className={errores.categoria ? "invalid" : ""} autoFocus>
              <option value="">Elige una categoría…</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            {errores.categoria && <small className="err">{errores.categoria}</small>}
          </label>
          <label>
            Monto *
            <input
              inputMode="numeric"
              placeholder="Solo números"
              value={monto}
              onChange={(e) => setMonto(e.target.value.replace(/\D/g, ""))}
              className={errores.monto ? "invalid" : ""}
            />
            {errores.monto && <small className="err">{errores.monto}</small>}
          </label>
          <label>
            Descripción (opcional)
            <textarea rows={2} maxLength={200} placeholder="Ej.: recibo de agua de agosto" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </label>
          <small className="ayuda">* Obligatorio</small>
        </div>
        <div className="mf">
          <button className="btn" onClick={cerrar} disabled={enviando}>
            Cancelar
          </button>
          <button className="btn primary" onClick={guardar} disabled={enviando}>
            {enviando ? "Guardando…" : "Guardar gasto"}
          </button>
        </div>
      </div>
    </div>
  );
}
