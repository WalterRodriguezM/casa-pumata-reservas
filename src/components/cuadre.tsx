import Link from "next/link";
import { formatoFecha, formatoPesosSigno as pesos } from "@/lib/fechas";
import type { calcularCuadre } from "@/lib/reportes";

type Cuadre = ReturnType<typeof calcularCuadre>;

function Barras({ filas, total }: { filas: { nombre: string; valor: number }[]; total: number }) {
  if (filas.length === 0) return <div className="vacio">Sin datos en este período.</div>;
  const max = filas[0].valor || 1;
  return (
    <div className="hb">
      {filas.map((f) => (
        <div key={f.nombre} className="hb-i">
          <span className="l" title={f.nombre}>{f.nombre}</span>
          <div className="b"><i style={{ width: `${(f.valor / max) * 100}%`, background: "var(--gas)" }} /></div>
          <span className="n">
            {pesos(f.valor)}
            <small>{total ? Math.round((f.valor / total) * 100) : 0}%</small>
          </span>
        </div>
      ))}
    </div>
  );
}

export function VistaCuadre({ c, etq }: { c: Cuadre; etq: string }) {
  const { A } = c;
  const totalCuentas = c.porCuenta.reduce((a, x) => a + x.valor, 0);
  const dif = c.comisionGenerada - c.comisionPagada;
  const porcentajes = c.porSocio.map((s) => `${Math.round(s.porcentaje)} % ${s.nombre}`).join(" · ");

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section className="panel">
        <div className="panel-h">
          <h2>Utilidad de la casa</h2>
          <span className="sub-h">{etq}</span>
        </div>
        <div className="flujo">
          <div className="paso">
            <span className="t">Ingresos cobrados</span>
            <span className="v">{pesos(A.ingresos)}</span>
            <span className="n">Monto pagado de las reservas</span>
          </div>
          <div className="paso">
            <span className="t">− Gastos de la casa</span>
            <span className="v">{pesos(A.gastosTotal)}</span>
            <span className="n">{A.gastos.length} gastos · incluye comisiones</span>
          </div>
          <div className="paso res">
            <span className="t">= Utilidad a repartir</span>
            <span className="v">{pesos(c.utilidad)}</span>
            <span className="n">{porcentajes}</span>
          </div>
        </div>
      </section>

      <div className="socios">
        {c.porSocio.map((s) => (
          <section key={s.id} className="panel socio">
            <div className="panel-h">
              <h2>
                {s.nombre}
                <small>{Math.round(s.porcentaje)} %</small>
              </h2>
              <span className={`estado ${s.saldo >= 0 ? "favor" : "debe"}`}>
                {s.saldo >= 0 ? "✔ A favor" : "▲ Debe"} {pesos(Math.abs(s.saldo))}
              </span>
            </div>
            <div className="linea">
              <span>Le corresponde ({Math.round(s.porcentaje)} % de la utilidad)</span>
              <span>{pesos(s.parte)}</span>
            </div>
            <div className="linea">
              <span>− Gastos personales, retiros y préstamos</span>
              <span className="menos">{pesos(s.descuentos)}</span>
            </div>
            <div className="linea total">
              <span>{s.saldo >= 0 ? "Saldo a favor" : "Queda debiendo"}</span>
              <span>{pesos(s.saldo)}</span>
            </div>
            <details className="mini">
              <summary>Ver {s.movimientos.length} movimientos</summary>
              {s.movimientos.length === 0 ? (
                <div><span>Sin movimientos</span></div>
              ) : (
                s.movimientos.map((g, i) => (
                  <div key={i}>
                    <span>
                      {formatoFecha(g.fecha)} · {g.descripcion || "Sin descripción"}
                    </span>
                    <span>{pesos(g.monto)}</span>
                  </div>
                ))
              )}
            </details>
          </section>
        ))}
      </div>

      {c.sinSocio.length > 0 && (
        <div className="aviso-pend">
          <span>
            <b>
              {c.sinSocio.length} gasto{c.sinSocio.length > 1 ? "s" : ""} personal{c.sinSocio.length > 1 ? "es" : ""} sin socio
            </b>{" "}
            por {pesos(c.sinSocioTotal)}: no está descontado de nadie todavía.
          </span>
          <Link className="btn" href="/gastos?anio=todos&tipo=personal&socio=pendiente">
            Asignarlos en Gastos
          </Link>
        </div>
      )}

      <div className="dos">
        <section className="panel">
          <div className="panel-h">
            <h2>Gastos por cuenta</h2>
            <span className="sub-h">Con qué se pagó · casa y personales · {etq}</span>
          </div>
          <Barras filas={c.porCuenta} total={totalCuentas} />
        </section>
        <section className="panel">
          <div className="panel-h">
            <h2>Cuenta de Ana</h2>
            <span className="sub-h">{etq}</span>
          </div>
          <div className="linea">
            <span>Comisión generada por reservas</span>
            <span>{pesos(c.comisionGenerada)}</span>
          </div>
          <div className="linea">
            <span>− Pagado a Ana (gastos «Comisión Ana»)</span>
            <span className="menos">{pesos(c.comisionPagada)}</span>
          </div>
          <div className="linea total">
            <span>{dif > 0 ? "Se le debe a Ana" : dif < 0 ? "Ana ha recibido de más" : "Al día"}</span>
            <span>{pesos(Math.abs(dif))}</span>
          </div>
          <p className="nota">
            Comisión = 7 % en Booking y Airbnb, 10 % en las demás reservas, sobre el valor de la reserva. Los pagos
            incluyen su celular, mercado y predial cuando se registran como «Comisión Ana».
          </p>
        </section>
      </div>

      <section className="panel">
        <div className="panel-h">
          <h2>Gastos de la casa por categoría</h2>
          <span className="sub-h">{etq}</span>
        </div>
        <Barras filas={c.porCategoria.map((x) => ({ nombre: x.nombre, valor: x.valor }))} total={A.gastosTotal} />
      </section>
      <p className="nota" style={{ margin: 0 }}>
        Los ingresos son lo cobrado por las reservas con check-in en el período. Los gastos de la casa se restan antes de
        repartir; lo personal (gastos, retiros y préstamos) se descuenta solo de la parte del socio que lo hizo.
      </p>
    </div>
  );
}
