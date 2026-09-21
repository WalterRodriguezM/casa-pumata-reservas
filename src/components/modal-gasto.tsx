"use client";

import { useRef, useState, useTransition } from "react";
import { crearGasto } from "@/app/(app)/gastos/actions";
import { useAviso } from "@/components/aviso";
import type { Item } from "@/lib/catalogos";
import { formatoPesos } from "@/lib/fechas";
import type { TipoGasto } from "@/lib/gastos";

type Props = { categoriasCasa: Item[]; cuentas: Item[]; socios: Item[]; hoy: string };

export function BotonNuevoGasto(props: Props) {
  const [abierto, setAbierto] = useState(false);
  const [aviso, mostrar] = useAviso();
  return (
    <>
      <button className="btn primary" onClick={() => setAbierto(true)}>
        + Nuevo gasto
      </button>
      {abierto && (
        <ModalGasto
          {...props}
          cerrar={() => setAbierto(false)}
          creado={(m, cerrar) => {
            if (cerrar) setAbierto(false);
            mostrar(m);
          }}
        />
      )}
      {aviso}
    </>
  );
}

function ModalGasto({
  categoriasCasa, cuentas, socios, hoy, cerrar, creado,
}: Props & { cerrar: () => void; creado: (mensaje: string, cerrar: boolean) => void }) {
  const efectivo = cuentas.find((c) => c.nombre === "Efectivo")?.id ?? cuentas[0]?.id ?? 0;
  const [tipo, setTipo] = useState<TipoGasto>("casa");
  const [fecha, setFecha] = useState(hoy);
  const [monto, setMonto] = useState("");
  const [socioId, setSocioId] = useState(""); // "" = aún sin elegir; "0" = Por confirmar
  const [categoriaId, setCategoriaId] = useState("");
  const [metodoId, setMetodoId] = useState(String(efectivo));
  const [descripcion, setDescripcion] = useState("");
  const [errores, setErrores] = useState<{ fecha?: string; monto?: string; socio?: string; categoria?: string; envio?: string }>({});
  const [enviando, iniciar] = useTransition();
  const [ultimo, setUltimo] = useState<string | null>(null);
  const primero = useRef<HTMLSelectElement>(null);

  // nuevo = true: guarda y deja el formulario abierto para registrar otro gasto.
  const guardar = (nuevo: boolean) => {
    setUltimo(null);
    const e = {
      fecha: fecha ? undefined : "Elige la fecha del gasto.",
      monto: Number(monto) > 0 ? undefined : "El monto debe ser mayor a 0.",
      socio: tipo === "casa" || socioId ? undefined : "Elige un socio (o «Por confirmar»).",
      categoria: tipo !== "casa" || categoriaId ? undefined : "Elige una categoría.",
    };
    setErrores(e);
    if (e.fecha || e.monto || e.socio || e.categoria) return;
    iniciar(async () => {
      const r = await crearGasto({
        fecha,
        tipo,
        socioId: tipo === "personal" && socioId !== "0" ? Number(socioId) : null,
        categoriaId: tipo === "casa" ? Number(categoriaId) : 0,
        metodoId: Number(metodoId),
        monto: Number(monto),
        descripcion,
      });
      if (r.ok) {
        const quien = tipo === "personal" ? ` · ${socios.find((s) => s.id === Number(socioId))?.nombre ?? "Por confirmar"}` : "";
        const mensaje = `Gasto registrado: ${tipo === "casa" ? "Casa" : "Personal"}${quien} · ${formatoPesos(Number(monto))}`;
        if (!nuevo) return creado(mensaje, true);
        // Conserva tipo, fecha, socio y cuenta; limpia lo que cambia de un gasto a otro.
        setMonto("");
        setDescripcion("");
        setCategoriaId("");
        setErrores({});
        setUltimo(mensaje);
        creado(mensaje, false);
        primero.current?.focus();
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
          {ultimo && !errores.envio && <div className="ok-msg" role="status">✔ {ultimo}. Puedes registrar otro.</div>}
          <div>
            <span className="ayuda" style={{ fontWeight: 500 }}>Tipo de gasto *</span>
            <div className="seg">
              <button type="button" aria-pressed={tipo === "casa"} onClick={() => setTipo("casa")}>
                Casa<small>Gasto de la casa</small>
              </button>
              <button type="button" aria-pressed={tipo === "personal"} onClick={() => setTipo("personal")}>
                Personal<small>De un socio: gastos, retiros y préstamos</small>
              </button>
            </div>
          </div>
          <div className="row">
            <label>
              Fecha *
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={errores.fecha ? "invalid" : ""} />
              {errores.fecha && <small className="err">{errores.fecha}</small>}
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
          </div>
          {tipo === "personal" ? (
            <label>
              Socio *
              <select value={socioId} onChange={(e) => setSocioId(e.target.value)} className={errores.socio ? "invalid" : ""} ref={primero} autoFocus>
                <option value="">Elige un socio…</option>
                {socios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
                <option value="0">Por confirmar</option>
              </select>
              {errores.socio && <small className="err">{errores.socio}</small>}
            </label>
          ) : (
            <label>
              Categoría *
              <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className={errores.categoria ? "invalid" : ""} ref={primero} autoFocus>
                <option value="">Elige una categoría…</option>
                {categoriasCasa.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              {errores.categoria && <small className="err">{errores.categoria}</small>}
            </label>
          )}
          <label>
            ¿Con qué se pagó?
            <select value={metodoId} onChange={(e) => setMetodoId(e.target.value)}>
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <small className="ayuda" style={{ margin: 0 }}>Efectivo o la cuenta de donde salió la plata. Sirve para ver cuánto sale de cada cuenta.</small>
          </label>
          <label>
            Descripción (opcional)
            <textarea rows={2} maxLength={200} placeholder="Ej.: recibo de agua de agosto" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </label>
          <small className="ayuda" style={{ margin: 0 }}>
            {tipo === "casa"
              ? "Se descuenta de la utilidad de la casa antes de repartirla entre los socios."
              : "Se descuenta de la parte del socio en el cuadre."}
          </small>
        </div>
        <div className="mf">
          <button className="btn" onClick={cerrar} disabled={enviando}>
            Cancelar
          </button>
          <button className="btn" onClick={() => guardar(true)} disabled={enviando}>
            Guardar y nuevo
          </button>
          <button className="btn primary" onClick={() => guardar(false)} disabled={enviando}>
            {enviando ? "Guardando…" : "Guardar gasto"}
          </button>
        </div>
      </div>
    </div>
  );
}
