import Link from "next/link";
import { ChipEstado } from "@/components/chip-estado";
import { MESES, diferenciaDias, formatoFecha, formatoPesos, hoyColombia, sumarDias } from "@/lib/fechas";
import { sumaGastosMes } from "@/lib/gastos";
import { reservasActivas } from "@/lib/reservas";

const MESES_CORTOS = MESES.map((m) => m.slice(0, 3));

export default async function Home() {
  const hoy = hoyColombia();
  const mes = hoy.slice(0, 7);
  const [y, m] = mes.split("-").map(Number);
  const diasMes = new Date(y, m, 0).getDate();

  const [reservas, gastos] = await Promise.all([reservasActivas(hoy), sumaGastosMes(mes)]);

  // Próximas: check-in de hoy en adelante, las 5 más cercanas.
  const proximas = reservas.filter((r) => r.checkin >= hoy).slice(0, 5);

  // Ocupación: días del mes ocupados (check-in a check-out, ambos incluidos).
  const ocupados = new Set<number>();
  for (const r of reservas) {
    for (let d = r.checkin; d <= r.checkout; d = sumarDias(d, 1)) {
      if (d.startsWith(mes)) ocupados.add(Number(d.slice(8)));
    }
  }
  const pct = Math.round((ocupados.size / diasMes) * 100);

  // Ingresos: lo cobrado de las reservas con check-in en el mes.
  const delMes = reservas.filter((r) => r.checkin.startsWith(mes));
  const cobrado = delMes.reduce((a, r) => a + r.montoPagado, 0);
  const porCobrar = delMes.reduce((a, r) => a + (r.montoTotal - r.montoPagado), 0);
  const balance = cobrado - gastos;
  const maxBarra = Math.max(cobrado, gastos, 1);

  const fechaLarga = new Date(hoy + "T12:00:00").toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="wrap estrecho">
      <header className="topbar">
        <h1>
          <small style={{ textTransform: "capitalize" }}>{fechaLarga}</small>
          Resumen de {MESES[m - 1]}
        </h1>
        <Link className="btn primary" href="/calendario">
          + Nueva reserva
        </Link>
      </header>

      <div className="home">
        <div className="col">
          <section className="panel">
            <div className="panel-h">
              <h2>Próximas reservas</h2>
              <Link className="link" href="/reservas">
                Ver todas
              </Link>
            </div>
            {proximas.length === 0 ? (
              <p className="vacio">No hay reservas próximas.</p>
            ) : (
              <div className="prox">
                {proximas.map((r) => {
                  const d = r.checkin.split("-");
                  const noches = diferenciaDias(r.checkin, r.checkout);
                  const saldo = r.montoTotal - r.montoPagado;
                  return (
                    <div key={r.id} className="prox-i">
                      <div className="fecha">
                        <b>{Number(d[2])}</b>
                        <span>{MESES_CORTOS[Number(d[1]) - 1]}</span>
                      </div>
                      <div>
                        <div className="n">{r.huesped.nombre}</div>
                        <div className="d">
                          {formatoFecha(r.checkin)} → {formatoFecha(r.checkout)} · {noches} {noches === 1 ? "noche" : "noches"} · {r.numeroHuespedes} pers.
                        </div>
                      </div>
                      <div className="der">
                        <ChipEstado estado={r.estado} />
                        <span className="saldo">{saldo > 0 ? <>Saldo <b>{formatoPesos(saldo)}</b></> : "Pagada"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="col">
          <section className="panel">
            <div className="panel-h">
              <h2>Ocupación de {MESES[m - 1]}</h2>
            </div>
            <div className="big">
              {pct}%<small>{ocupados.size} de {diasMes} días</small>
            </div>
            <div className="strip" role="img" aria-label={`${ocupados.size} de ${diasMes} días ocupados`}>
              {Array.from({ length: diasMes }, (_, i) => i + 1).map((d) => (
                <i key={d} className={`${ocupados.has(d) ? "o" : ""} ${d === Number(hoy.slice(8)) ? "h" : ""}`} title={`${d} de ${MESES[m - 1]}`} />
              ))}
            </div>
            <div className="leyenda">
              <span><i className="o" />Ocupado</span>
              <span><i className="l" />Libre</span>
              <span>Contorno: hoy</span>
            </div>
          </section>

          <section className="panel">
            <div className="panel-h">
              <h2>Ingresos y gastos de {MESES[m - 1]}</h2>
            </div>
            <div className="bar">
              <span>Cobrado</span>
              <div className="t"><i style={{ width: `${(cobrado / maxBarra) * 100}%`, background: "var(--ok)" }} /></div>
              <b>{formatoPesos(cobrado)}</b>
            </div>
            <div className="bar">
              <span>Gastos</span>
              <div className="t"><i style={{ width: `${(gastos / maxBarra) * 100}%`, background: "var(--accent)" }} /></div>
              <b>{formatoPesos(gastos)}</b>
            </div>
            <div className="balance">
              <span>Balance</span>
              <span className={balance < 0 ? "neg" : "pos"}>
                {balance < 0 ? "− " : "+ "}
                {formatoPesos(Math.abs(balance))}
              </span>
            </div>
            <div className="sub">
              Por cobrar de reservas del mes: <b>{formatoPesos(porCobrar)}</b>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
