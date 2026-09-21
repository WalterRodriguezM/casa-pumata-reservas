"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buscarHuespedes,
  crearReserva,
  type HuespedNuevo,
  type HuespedResumen,
} from "@/app/(app)/reservas/actions";
import type { Catalogos } from "@/lib/catalogos";
import { fondoCelda, type Ocupacion } from "@/lib/ocupacion";
import {
  DIAS_SEMANA,
  MESES,
  aIso,
  desdeIso,
  diferenciaDias,
  formatoFecha,
  formatoPesos,
} from "@/lib/fechas";
import {
  MAX_HUESPEDES,
  errorCorreo,
  errorDocumento,
  errorNombre,
  errorTelefono,
} from "@/lib/validacion";

type Props = {
  catalogos: Catalogos;
  hoy: string;
  ocupacion: Ocupacion;
  inicial: { a: string | null; b: string | null };
  cerrar: () => void;
  creada: (mensaje: string) => void;
};

export type Huesped = {
  id?: string;
  nuevo?: HuespedNuevo;
  nombre: string;
  documento: string;
  telefono: string;
  correo: string;
};

const soloDigitos = (v: string) => v.replace(/\D/g, "");
const contacto = (h: { telefono: string; correo: string }) =>
  [h.telefono, h.correo].filter(Boolean).join(" · ") || "Sin datos de contacto";

export function WizardReserva({ catalogos, hoy, ocupacion, inicial, cerrar, creada }: Props) {
  const router = useRouter();
  const precargado = !!(inicial.a && inicial.b);
  const [paso, setPaso] = useState<1 | 2 | 3>(precargado ? 2 : 1);
  const [pick, setPick] = useState<string | null>(inicial.b ? null : inicial.a);
  const [rango, setRango] = useState<{ a: string; b: string } | null>(
    inicial.a && inicial.b ? { a: inicial.a, b: inicial.b } : null,
  );
  const [numHuespedes, setNumHuespedes] = useState(2);
  const [huesped, setHuesped] = useState<Huesped | null>(null);
  const [origenId, setOrigenId] = useState(catalogos.origenes[0]?.id ?? 0);
  const [metodoId, setMetodoId] = useState(catalogos.metodos[0]?.id ?? 0);
  const [estadoId, setEstadoId] = useState(catalogos.estados[0]?.id ?? 0);
  const [total, setTotal] = useState("");
  const [pagado, setPagado] = useState("0");
  const [notas, setNotas] = useState("");
  const [conflicto, setConflicto] = useState<string | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [cerrar]);

  const nTotal = Number(total) || 0;
  const nPagado = Number(pagado) || 0;
  const puedeRevisar = !!huesped && nTotal > 0 && nPagado <= nTotal;

  async function confirmar() {
    if (!rango || !huesped) return;
    setEnviando(true);
    setErrorEnvio(null);
    const res = await crearReserva({
      checkin: rango.a,
      checkout: rango.b,
      numeroHuespedes: numHuespedes,
      huesped: huesped.id ? { id: huesped.id } : { nuevo: huesped.nuevo! },
      origenId,
      metodoId,
      estadoId,
      montoTotal: nTotal,
      montoPagado: nPagado,
      notas,
    });
    setEnviando(false);
    if (res.ok) {
      creada(`Reserva creada para ${huesped.nombre}`);
      return;
    }
    if (res.huespedId && huesped.nuevo) {
      // El huésped ya quedó creado: se reutiliza al reintentar.
      setHuesped({ ...huesped, id: res.huespedId, nuevo: undefined });
    }
    if (res.tipo === "conflicto") {
      setConflicto(res.mensaje);
      setRango(null);
      setPick(null);
      setPaso(1);
      router.refresh(); // trae las reservas nuevas para bloquear esas fechas
    } else {
      setErrorEnvio(res.mensaje);
      if (res.tipo === "documento" || res.tipo === "validacion") setPaso(2);
    }
  }

  const titulos = ["Fechas", "Detalles", "Confirmación"];

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && cerrar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="wiz-titulo">
        <div className="mh">
          <h3 id="wiz-titulo">Nueva reserva</h3>
          <button className="btn ghost" onClick={cerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="steps">
          {titulos.map((t, i) => {
            const n = i + 1;
            const cls = n === paso ? "on" : n < paso ? "done" : "";
            return (
              <div key={t} className={`step ${cls}`}>
                {n}. {t}
                {n === 1 && precargado && paso > 1 ? " · precargado" : ""}
              </div>
            );
          })}
        </div>

        {paso === 1 && (
          <PasoFechas
            hoy={hoy}
            ocupacion={ocupacion}
            rango={rango}
            pick={pick}
            setPick={setPick}
            setRango={(r) => {
              setRango(r);
              setConflicto(null);
            }}
            numHuespedes={numHuespedes}
            setNumHuespedes={setNumHuespedes}
            conflicto={conflicto}
            cancelar={cerrar}
            siguiente={() => setPaso(2)}
          />
        )}

        {paso === 2 && rango && (
          <>
            <div className="mb">
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div className="chip">
                  {resumenRango(rango)} · {numHuespedes} huésp.
                </div>
                <button className="btn ghost" onClick={() => setPaso(1)}>
                  Cambiar fechas
                </button>
              </div>
              {errorEnvio && (
                <div className="alert" role="alert">
                  {errorEnvio}
                </div>
              )}
              <CamposDetalle
                catalogos={catalogos}
                estados={catalogos.estados}
                huesped={huesped}
                setHuesped={setHuesped}
                origenId={origenId}
                setOrigenId={setOrigenId}
                metodoId={metodoId}
                setMetodoId={setMetodoId}
                estadoId={estadoId}
                setEstadoId={setEstadoId}
                total={total}
                setTotal={setTotal}
                pagado={pagado}
                setPagado={setPagado}
                notas={notas}
                setNotas={setNotas}
              />
            </div>
            <div className="mf entre">
              <button className="btn" onClick={() => setPaso(1)}>
                ← Atrás
              </button>
              <button className="btn primary" disabled={!puedeRevisar} onClick={() => setPaso(3)}>
                Revisar →
              </button>
            </div>
          </>
        )}

        {paso === 3 && rango && huesped && (
          <>
            <div className="mb">
              {errorEnvio && (
                <div className="alert" role="alert">
                  {errorEnvio}
                </div>
              )}
              <dl>
                <dt>Fechas</dt>
                <dd>{formatoFecha(rango.a)} → {formatoFecha(rango.b)}</dd>
                <dt>Noches</dt>
                <dd>{diferenciaDias(rango.a, rango.b)}</dd>
                <dt>Huéspedes</dt>
                <dd>{numHuespedes}</dd>
                <dt>Huésped principal</dt>
                <dd>{huesped.nombre}{huesped.nuevo ? " (nuevo)" : ""}</dd>
                <dt>Contacto</dt>
                <dd>{contacto(huesped)}</dd>
                <dt>Documento</dt>
                <dd>{huesped.documento}</dd>
                <dt>Origen</dt>
                <dd>{catalogos.origenes.find((o) => o.id === origenId)?.nombre}</dd>
                <dt>Método de pago</dt>
                <dd>{catalogos.metodos.find((o) => o.id === metodoId)?.nombre}</dd>
                <dt>Estado</dt>
                <dd>{catalogos.estados.find((o) => o.id === estadoId)?.nombre}</dd>
                {notas.trim() && (
                  <>
                    <dt>Notas</dt>
                    <dd>{notas}</dd>
                  </>
                )}
              </dl>
              <dl className="total">
                <dt>Total</dt>
                <dd>{formatoPesos(nTotal)}</dd>
                <dt>Pagado</dt>
                <dd>{formatoPesos(nPagado)}</dd>
                <dt>Saldo pendiente</dt>
                <dd style={{ color: nTotal - nPagado > 0 ? "var(--accent)" : "var(--ok)" }}>
                  {formatoPesos(nTotal - nPagado)}
                </dd>
              </dl>
            </div>
            <div className="mf entre">
              <button className="btn" onClick={() => setPaso(2)} disabled={enviando}>
                ← Atrás
              </button>
              <button className="btn primary" onClick={confirmar} disabled={enviando}>
                {enviando ? "Guardando…" : "Confirmar reserva"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Campos del Paso 2 (compartidos con la edición) ---------- */
export function CamposDetalle(p: {
  editando?: boolean;
  catalogos: Catalogos;
  estados: { id: number; nombre: string }[];
  huesped: Huesped | null;
  setHuesped: (h: Huesped | null) => void;
  origenId: number;
  setOrigenId: (n: number) => void;
  metodoId: number;
  setMetodoId: (n: number) => void;
  estadoId: number;
  setEstadoId: (n: number) => void;
  total: string;
  setTotal: (v: string) => void;
  pagado: string;
  setPagado: (v: string) => void;
  notas: string;
  setNotas: (v: string) => void;
}) {
  const nTotal = Number(p.total) || 0;
  const nPagado = Number(p.pagado) || 0;
  const errTotal = p.total !== "" && !(nTotal > 0) ? "El total debe ser mayor a 0." : "";
  const errPagado = nTotal > 0 && nPagado > nTotal ? "El pagado no puede superar el total." : "";
  const cancelada = p.estados.find((e) => e.id === p.estadoId)?.nombre === "Cancelada";
  return (
    <>
      <BuscadorHuesped catalogos={p.catalogos} huesped={p.huesped} setHuesped={p.setHuesped} />
      <div className="row">
        <Select id="origen" label="Origen de la reserva" valor={p.origenId} setValor={p.setOrigenId} items={p.catalogos.origenes} />
        <Select id="metodo" label="Método de pago" valor={p.metodoId} setValor={p.setMetodoId} items={p.metodoId === 0 ? [{ id: 0, nombre: "Sin definir" }, ...p.catalogos.metodos] : p.catalogos.metodos} />
      </div>
      <div className="row">
        <Select id="estado" label="Estado" valor={p.estadoId} setValor={p.setEstadoId} items={p.estados} />
        <label>
          Costo total de la reserva *
          <input
            id="total"
            inputMode="numeric"
            placeholder="Solo números"
            value={p.total}
            onChange={(e) => p.setTotal(soloDigitos(e.target.value))}
            className={errTotal ? "invalid" : ""}
          />
          {errTotal && <small className="err">{errTotal}</small>}
        </label>
      </div>
      {cancelada && (
        <div className="alert" role="status">
          Al cancelar, las fechas quedan libres en el calendario.
        </div>
      )}
      <div className="row">
        <label>
          {p.editando ? "Total pagado (solo para corregir)" : "Abono (opcional)"}
          <input
            id="pagado"
            inputMode="numeric"
            value={p.pagado}
            onChange={(e) => p.setPagado(soloDigitos(e.target.value))}
            className={errPagado ? "invalid" : ""}
          />
          {errPagado && <small className="err">{errPagado}</small>}
          {!errPagado && nTotal > 0 && (
            <small className="ayuda" style={{ margin: 0 }}>
              Saldo pendiente: <b>{formatoPesos(nTotal - nPagado)}</b>
            </small>
          )}
        </label>
        {!p.editando && (
          <div style={{ display: "flex", alignItems: "end" }}>
            <button type="button" className="btn" onClick={() => p.setPagado(p.total || "0")} title="Copia el costo total en «Abono»">
              Ya pagó todo
            </button>
          </div>
        )}
      </div>
      <label>
        Notas (opcional)
        <textarea id="notas" value={p.notas} onChange={(e) => p.setNotas(e.target.value)} />
      </label>
      <small className="ayuda">
        * Obligatorio. Para continuar se requiere huésped (con su nombre) y monto total.
      </small>
    </>
  );
}

function resumenRango(r: { a: string; b: string }) {
  const n = diferenciaDias(r.a, r.b);
  return `${formatoFecha(r.a)} → ${formatoFecha(r.b)} · ${n} ${n === 1 ? "noche" : "noches"}`;
}

function Select({
  id, label, valor, setValor, items,
}: {
  id: string;
  label: string;
  valor: number;
  setValor: (n: number) => void;
  items: { id: number; nombre: string }[];
}) {
  return (
    <label>
      {label}
      <select id={id} value={valor} onChange={(e) => setValor(Number(e.target.value))}>
        {items.map((i) => (
          <option key={i.id} value={i.id}>
            {i.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ---------- Paso 1 ---------- */
function PasoFechas({
  hoy, ocupacion, rango, pick, setPick, setRango, numHuespedes, setNumHuespedes, conflicto, cancelar, siguiente,
}: {
  hoy: string;
  ocupacion: Ocupacion;
  rango: { a: string; b: string } | null;
  pick: string | null;
  setPick: (d: string | null) => void;
  setRango: (r: { a: string; b: string } | null) => void;
  numHuespedes: number;
  setNumHuespedes: (n: number) => void;
  conflicto: string | null;
  cancelar: () => void;
  siguiente: () => void;
}) {
  const ref = desdeIso(rango?.a ?? pick ?? hoy);
  const [vista, setVista] = useState({ y: ref.getFullYear(), m: ref.getMonth() });
  const [hover, setHover] = useState<string | null>(null);

  const libre = (d: string) => d >= hoy && !ocupacion.nocheOcupada(d);
  const rangoValido = (a: string, b: string) => ocupacion.rangoValido(a, b, hoy);

  const clic = (d: string) => {
    if (!pick) {
      if (!libre(d)) return;
      setRango(null);
      setPick(d);
      return;
    }
    if (d <= pick) {
      if (libre(d)) setPick(d);
      return;
    }
    if (!rangoValido(pick, d)) return;
    setRango({ a: pick, b: d });
    setPick(null);
    setHover(null);
  };

  const prev = pick ? { a: pick, b: hover && hover > pick ? hover : pick } : rango;
  const prevValido = prev && prev.a < prev.b ? rangoValido(prev.a, prev.b) : true;

  const primero = new Date(vista.y, vista.m, 1);
  const relleno = (primero.getDay() + 6) % 7;
  const dias = new Date(vista.y, vista.m + 1, 0).getDate();
  const mover = (n: number) =>
    setVista((v) => {
      const d = new Date(v.y, v.m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const celdas = useMemo(() => {
    const out = [];
    for (let i = 0; i < relleno; i++) out.push(<div key={"b" + i} className="cell blank" />);
    for (let dia = 1; dia <= dias; dia++) {
      const d = aIso(new Date(vista.y, vista.m, dia));
      let cls = "cell";
      const fondo = fondoCelda(ocupacion, d);
      if (d === hoy) cls += " hoy";
      if (d < hoy) cls += " pasada";
      else if (!fondo) cls += " libre-hover";
      if (prev) {
        if (prev.a < prev.b) {
          if (d >= prev.a && d < prev.b) cls += prevValido ? " sel" : " bad";
          if (d === prev.b) cls += prevValido ? " sel-end" : " bad";
        } else if (d === prev.a) cls += " sel-end";
      }
      out.push(
        <div key={d} className={cls} data-d={d} style={fondo ? { backgroundImage: fondo } : undefined} onClick={() => clic(d)} onPointerEnter={() => pick && setHover(d)}>
          <span className="n">{dia}</span>
        </div>,
      );
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, ocupacion, prev?.a, prev?.b, prevValido, pick, hover, hoy]);

  return (
    <>
      <div className="mb">
        {conflicto && (
          <div className="alert" role="alert">
            {conflicto} Tus demás datos se conservan.
          </div>
        )}
        <div className="calhead" style={{ margin: 0 }}>
          <b style={{ textTransform: "capitalize" }}>
            {MESES[vista.m]} {vista.y}
          </b>
          <div className="nav">
            <button className="btn" onClick={() => mover(-1)} aria-label="Mes anterior">←</button>
            <button className="btn" onClick={() => mover(1)} aria-label="Mes siguiente">→</button>
          </div>
        </div>
        <div className="mini">
          <div className="dow">
            {DIAS_SEMANA.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid">{celdas}</div>
        </div>
        <div className="status">
          {pick ? (
            <>Check-in <b>{formatoFecha(pick)}</b>. Ahora elige el check-out.</>
          ) : rango ? (
            resumenRango(rango)
          ) : (
            "Elige el día de check-in."
          )}
        </div>
        <label style={{ maxWidth: 240 }}>
          Número de huéspedes (máx. {MAX_HUESPEDES})
          <div className="stepper">
            <button onClick={() => setNumHuespedes(Math.max(1, numHuespedes - 1))} aria-label="Menos">−</button>
            <output>{numHuespedes}</output>
            <button onClick={() => setNumHuespedes(Math.min(MAX_HUESPEDES, numHuespedes + 1))} aria-label="Más">+</button>
          </div>
        </label>
      </div>
      <div className="mf entre">
        <button className="btn ghost" onClick={cancelar}>Cancelar</button>
        <button className="btn primary" disabled={!rango} onClick={siguiente}>Siguiente →</button>
      </div>
    </>
  );
}

/* ---------- Buscador de huésped ---------- */
function BuscadorHuesped({
  catalogos, huesped, setHuesped,
}: {
  catalogos: Catalogos;
  huesped: Huesped | null;
  setHuesped: (h: Huesped | null) => void;
}) {
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<HuespedResumen[] | null>(null);
  const [creando, setCreando] = useState(false);
  const seq = useRef(0);
  const lista = q.trim().length < 2 ? null : resultados;

  useEffect(() => {
    if (q.trim().length < 2) return;
    const mio = ++seq.current;
    const t = setTimeout(async () => {
      const r = await buscarHuespedes(q);
      if (mio === seq.current) setResultados(r);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  if (huesped) {
    return (
      <section style={{ display: "grid", gap: 10 }}>
        <b>Huésped</b>
        <div className="guest">
          <b>{huesped.nombre}{huesped.nuevo ? " (nuevo)" : ""}</b>
          <small>{huesped.documento}</small>
          <small>{contacto(huesped)}</small>
          <div>
            <button className="btn ghost" style={{ padding: "6px 0" }} onClick={() => { setHuesped(null); setQ(""); setCreando(false); }}>
              Cambiar huésped
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={{ display: "grid", gap: 10 }}>
      <b>Huésped</b>
      <label>
        Buscar huésped por nombre
        <input
          id="buscar"
          type="search"
          autoComplete="off"
          placeholder="Escribe al menos 2 letras…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setCreando(false); }}
        />
      </label>
      {lista && lista.length > 0 && (
        <div className="results">
          {lista.map((h) => (
            <button
              key={h.id}
              onClick={() =>
                setHuesped({
                  id: h.id,
                  nombre: h.nombre,
                  documento: h.documento,
                  telefono: h.telefono ?? "",
                  correo: h.correo ?? "",
                })
              }
            >
              <b>{h.nombre}</b>
              <small>{h.documento}{h.telefono ? ` · ${h.telefono}` : ""}</small>
            </button>
          ))}
        </div>
      )}
      {lista && lista.length === 0 && !creando && (
        <div className="guest">
          <b>«{q.trim()}» no existe.</b>
          <small>¿Deseas crearlo?</small>
          <div>
            <button className="btn primary" style={{ marginTop: 6 }} onClick={() => setCreando(true)}>
              Crear huésped
            </button>
          </div>
        </div>
      )}
      {creando && (
        <FormularioHuesped
          catalogos={catalogos}
          nombreInicial={q.trim()}
          usar={(n) =>
            setHuesped({
              nuevo: n,
              nombre: n.nombre.trim(),
              documento: n.numeroDocumento.trim()
                ? `${catalogos.tiposDocumento.find((t) => t.id === n.tipoDocumentoId)?.nombre ?? ""} ${n.numeroDocumento.trim()}`.trim()
                : "Sin documento",
              telefono: n.telefono.trim(),
              correo: n.correo.trim(),
            })
          }
        />
      )}
    </section>
  );
}

function FormularioHuesped({
  catalogos, nombreInicial, usar,
}: {
  catalogos: Catalogos;
  nombreInicial: string;
  usar: (n: HuespedNuevo) => void;
}) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [tipoId, setTipoId] = useState(catalogos.tiposDocumento[0]?.id ?? 0);
  const [numDoc, setNumDoc] = useState("");
  const [tel, setTel] = useState("");
  const [correo, setCorreo] = useState("");
  const [generoId, setGeneroId] = useState<number | "">("");
  const [tocado, setTocado] = useState<Record<string, boolean>>({});

  const errores = {
    nombre: errorNombre(nombre),
    doc: errorDocumento(numDoc),
    tel: errorTelefono(tel),
    correo: errorCorreo(correo),
  };
  const ver = (k: keyof typeof errores) => (tocado[k] ? errores[k] : "");
  const tocar = (k: string) => setTocado((t) => ({ ...t, [k]: true }));

  const enviar = () => {
    if (Object.values(errores).some(Boolean)) {
      setTocado({ nombre: true, doc: true, tel: true, correo: true });
      return;
    }
    usar({
      nombre,
      tipoDocumentoId: numDoc.trim() ? tipoId : null,
      numeroDocumento: numDoc,
      telefono: tel,
      correo,
      generoId: generoId === "" ? null : generoId,
    });
  };

  return (
    <div className="guest" style={{ gap: 12 }}>
      <b>Nuevo huésped</b>
      <label>
        Nombre completo *
        <input id="n-nombre" value={nombre} autoComplete="off" onChange={(e) => setNombre(e.target.value)} onBlur={() => tocar("nombre")} className={ver("nombre") ? "invalid" : ""} />
        {ver("nombre") && <small className="err">{ver("nombre")}</small>}
      </label>
      <div className="row">
        <label>
          Tipo de documento
          <select id="n-tipo" value={tipoId} onChange={(e) => setTipoId(Number(e.target.value))}>
            {catalogos.tiposDocumento.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </label>
        <label>
          Número de documento (opcional)
          <input id="n-doc" value={numDoc} onChange={(e) => setNumDoc(e.target.value)} onBlur={() => tocar("doc")} className={ver("doc") ? "invalid" : ""} />
          {ver("doc") && <small className="err">{ver("doc")}</small>}
        </label>
      </div>
      <div className="row">
        <label>
          Teléfono (opcional, solo números)
          <input id="n-tel" inputMode="numeric" maxLength={15} value={tel} onChange={(e) => setTel(soloDigitos(e.target.value))} onBlur={() => tocar("tel")} className={ver("tel") ? "invalid" : ""} />
          {ver("tel") && <small className="err">{ver("tel")}</small>}
        </label>
        <label>
          Correo (opcional)
          <input id="n-correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} onBlur={() => tocar("correo")} className={ver("correo") ? "invalid" : ""} />
          {ver("correo") && <small className="err">{ver("correo")}</small>}
        </label>
      </div>
      <label style={{ maxWidth: 260 }}>
        Género (opcional)
        <select id="n-genero" value={generoId} onChange={(e) => setGeneroId(e.target.value === "" ? "" : Number(e.target.value))}>
          <option value="">Sin especificar</option>
          {catalogos.generos.map((g) => (
            <option key={g.id} value={g.id}>{g.nombre}</option>
          ))}
        </select>
      </label>
      <div>
        <button className="btn primary" onClick={enviar}>Usar este huésped</button>
      </div>
    </div>
  );
}
