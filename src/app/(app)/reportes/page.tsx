import { Suspense } from "react";
import Link from "next/link";
import { VistaCuadre } from "@/components/cuadre";
import { FiltrosReportes } from "@/components/filtros-reportes";
import { GraficoMeses, type MesGrafico } from "@/components/grafico-meses";
import { MESES, formatoPesosSigno as pesos, hoyColombia } from "@/lib/fechas";
import {
  agregar, calcularCuadre, cargarDatos, cargarSocios, etiquetaPeriodo, gastosPorCategoria, ingresosPorOrigen, leerFiltros,
  periodo, periodoAnterior, primerAnioConDatos, type Busqueda,
} from "@/lib/reportes";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default async function ReportesPage({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const hoy = hoyColombia();
  const { anio, mes, comparar, vista } = leerFiltros(await searchParams, hoy);
  const anioActual = Number(hoy.slice(0, 4));

  const [datos, primerAnio] = await Promise.all([cargarDatos(anio), primerAnioConDatos()]);
  const anios: number[] = [];
  for (let a = anioActual; a >= Math.min(primerAnio ?? anioActual, anio); a--) anios.push(a);
  if (!anios.includes(anio)) anios.unshift(anio);

  const A = agregar(datos, periodo(anio, mes), hoy);
  const etq = cap(etiquetaPeriodo(anio, mes));
  const hrefVista = (v: "resumen" | "cuadre") => `/reportes?anio=${anio}&mes=${mes}${v === "cuadre" ? "&vista=cuadre" : ""}`;
  const pestanas = (
    <div className="tabs" role="tablist">
      <Link role="tab" aria-selected={vista === "resumen"} href={hrefVista("resumen")}>Resumen</Link>
      <Link role="tab" aria-selected={vista === "cuadre"} href={hrefVista("cuadre")}>Cuadre por socio</Link>
    </div>
  );
  if (vista === "cuadre") {
    const socios = await cargarSocios();
    const cuadre = calcularCuadre(datos, periodo(anio, mes), hoy, socios);
    return (
      <div className="wrap estrecho">
        <header className="topbar">
          <h1>
            <small>Análisis</small>Reportes
          </h1>
          <Suspense>
            <FiltrosReportes anios={anios} anio={anio} mes={mes} comparar={false} soloPeriodo />
          </Suspense>
        </header>
        {pestanas}
        <VistaCuadre c={cuadre} etq={etq} />
      </div>
    );
  }

  const previo = comparar ? periodoAnterior(anio, mes) : null;
  // Hay período anterior si termina en o después del primer año con datos.
  const hayPrevio = !!previo && primerAnio !== null && previo.hasta >= `${primerAnio}-01-01`;
  const P = previo && hayPrevio ? agregar(datos, previo, hoy) : null;
  const etqPrevio = previo ? etiquetaPeriodo(previo.anio, previo.mes) : "";

  const meses = Array.from({ length: 12 }, (_, i) => ({ i: i + 1, ...agregar(datos, periodo(anio, i + 1), hoy) }));
  const grafico: MesGrafico[] = meses.map((m) => ({
    i: m.i, ingresos: m.ingresos, gastos: m.gastosTotal, balance: m.balance, vacio: m.dias === 0,
  }));
  const anual = agregar(datos, periodo(anio, 0), hoy);
  const categorias = gastosPorCategoria(A.gastos);
  const origenes = ingresosPorOrigen(A.reservas);

  return (
    <div className="wrap estrecho">
      <header className="topbar">
        <h1>
          <small>Análisis</small>Reportes
        </h1>
        <Suspense>
          <FiltrosReportes anios={anios} anio={anio} mes={mes} comparar={comparar} />
        </Suspense>
      </header>
      {pestanas}

      <section className="kpis" aria-label="Resumen del período">
        <Kpi t="Ingresos cobrados" v={pesos(A.ingresos)} n={`${A.reservas.length} reservas con check-in en el período`}
          d={comparar && <Delta cur={A.ingresos} ant={P?.ingresos} bueno={1} etq={etqPrevio} />} />
        <Kpi t="Gastos de la casa" v={pesos(A.gastosTotal)} n={`${A.gastos.length} gastos registrados`}
          d={comparar && <Delta cur={A.gastosTotal} ant={P?.gastosTotal} bueno={-1} etq={etqPrevio} />} />
        <Kpi t="Utilidad" v={(A.balance >= 0 ? "+ " : "") + pesos(A.balance)} n="Ingresos cobrados − gastos de la casa" tono={A.balance < 0 ? "neg" : "pos"}
          d={comparar && <Delta cur={A.balance} ant={P?.balance} bueno={1} etq={etqPrevio} />} />
        <Kpi t="Ocupación" v={A.dias ? `${A.pct}%` : "—"} n={A.dias ? `${A.ocupados} de ${A.dias} noches` : "Período sin noches transcurridas"}
          d={comparar && A.dias > 0 && <Delta cur={A.pct} ant={P?.pct} bueno={1} pp etq={etqPrevio} />} />
        <Kpi t="Por cobrar" v={pesos(A.porCobrar)} n="Saldo de las reservas del período"
          d={comparar && <Delta cur={A.porCobrar} ant={P?.porCobrar} bueno={0} etq={etqPrevio} />} />
      </section>

      <section className="panel">
        <div className="panel-h">
          <h2>Ingresos y gastos por mes · {anio}</h2>
          <span className="sub-h">Ingresos = monto cobrado, por mes de check-in</span>
        </div>
        <div className="leyenda-serie">
          <span><i className="sw" style={{ background: "var(--ing)" }} />Ingresos cobrados</span>
          <span><i className="sw" style={{ background: "var(--gas)" }} />Gastos</span>
        </div>
        <GraficoMeses meses={grafico} seleccionado={mes} anio={anio} />
      </section>

      <div className="dos">
        <section className="panel">
          <div className="panel-h">
            <h2>Gastos por categoría</h2>
            <span className="sub-h">{etq} · total {pesos(A.gastosTotal)}</span>
          </div>
          <Barras filas={categorias.map((c) => ({ nombre: c.nombre, valor: c.valor }))} total={A.gastosTotal} color="var(--gas)" />
        </section>
        <section className="panel">
          <div className="panel-h">
            <h2>Ingresos por origen</h2>
            <span className="sub-h">{etq} · total {pesos(A.ingresos)}</span>
          </div>
          <Barras filas={origenes} total={A.ingresos} color="var(--ing)" />
        </section>
      </div>

      {comparar && (
        <section className="panel">
          <div className="panel-h">
            <h2>Comparativo con el período anterior</h2>
            {P && <span className="sub-h">{etq} frente a {cap(etqPrevio)}</span>}
          </div>
          <div className="tabla">
            <table style={{ minWidth: 560 }}>
              <thead>
                <tr>
                  <th>Métrica</th>
                  <th className="r">{etq}</th>
                  <th className="r">{cap(etqPrevio)}</th>
                  <th className="r">Diferencia</th>
                  <th className="r">Variación</th>
                </tr>
              </thead>
              <tbody>
                {!P ? (
                  <tr><td colSpan={5} className="vacio">No hay datos del período anterior para comparar.</td></tr>
                ) : (
                  <>
                    <FilaCmp n="Ingresos cobrados" a={A.ingresos} b={P.ingresos} bueno={1} f={pesos} />
                    <FilaCmp n="Gastos" a={A.gastosTotal} b={P.gastosTotal} bueno={-1} f={pesos} />
                    <FilaCmp n="Balance" a={A.balance} b={P.balance} bueno={1} f={pesos} />
                    <FilaCmp n="Reservas" a={A.reservas.length} b={P.reservas.length} bueno={1} f={String} />
                    <FilaCmp n="Noches" a={A.noches} b={P.noches} bueno={1} f={String} />
                    <FilaCmp n="Ocupación" a={A.pct} b={P.pct} bueno={1} f={(x) => x + "%"} pp />
                  </>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-h">
          <h2>Resumen por mes · {anio}</h2>
          <span className="sub-h">También es la vista en tabla del gráfico</span>
        </div>
        <div className="tabla">
          <table>
            <thead>
              <tr>
                <th>Mes</th><th className="r">Reservas</th><th className="r">Noches</th><th className="r">Ocupación</th>
                <th className="r">Ingresos</th><th className="r">Gastos</th><th className="r">Balance</th>
              </tr>
            </thead>
            <tbody>
              {meses.map((x) => (
                <tr key={x.i} className={mes === x.i ? "sel" : ""}>
                  <td>{cap(MESES[x.i - 1])}</td>
                  {x.dias === 0 ? (
                    <><td className="r">—</td><td className="r">—</td><td className="r">—</td><td className="r">—</td><td className="r">—</td><td className="r">—</td></>
                  ) : (
                    <>
                      <td className="r">{x.reservas.length}</td>
                      <td className="r">{x.noches}</td>
                      <td className="r">{x.pct}%</td>
                      <td className="r">{pesos(x.ingresos)}</td>
                      <td className="r">{pesos(x.gastosTotal)}</td>
                      <td className={`r ${x.balance < 0 ? "neg" : ""}`}>{pesos(x.balance)}</td>
                    </>
                  )}
                </tr>
              ))}
              <tr className="tot">
                <td>Total {anio}</td>
                <td className="r">{anual.reservas.length}</td>
                <td className="r">{anual.noches}</td>
                <td className="r">{anual.dias ? anual.pct + "%" : "—"}</td>
                <td className="r">{pesos(anual.ingresos)}</td>
                <td className="r">{pesos(anual.gastosTotal)}</td>
                <td className={`r ${anual.balance < 0 ? "neg" : ""}`}>{pesos(anual.balance)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="nota">
          Ocupación = noches ocupadas (del check-in a la noche anterior al check-out) sobre las noches transcurridas del período.
          Las reservas canceladas no cuentan.
        </p>
      </section>
    </div>
  );
}

function Kpi({ t, v, n, d, tono }: { t: string; v: string; n: string; d?: React.ReactNode; tono?: string }) {
  return (
    <div className="kpi">
      <span className="t">{t}</span>
      <span className={`v ${tono ?? ""}`}>{v}</span>
      <span className="n">{n}</span>
      {d}
    </div>
  );
}

// bueno: 1 = subir es bueno, -1 = subir es malo, 0 = neutro.
function Delta({ cur, ant, bueno, pp, etq }: { cur: number; ant: number | undefined; bueno: 1 | -1 | 0; pp?: boolean; etq: string }) {
  if (ant === undefined) return <span className="delta igual">Sin datos del período anterior</span>;
  const d = cur - ant;
  const cls = d === 0 || bueno === 0 ? "igual" : d > 0 === bueno > 0 ? "bien" : "mal";
  const icono = d > 0 ? "▲" : d < 0 ? "▼" : "=";
  const txt = pp ? `${Math.abs(d)} pts` : ant ? `${Math.abs(Math.round((d / ant) * 100))} %` : "nuevo";
  return (
    <span className={`delta ${cls}`}>
      {icono} {d === 0 ? "Sin cambio" : txt} <span>vs {etq}</span>
    </span>
  );
}

function FilaCmp({ n, a, b, bueno, f, pp }: { n: string; a: number; b: number; bueno: 1 | -1; f: (x: number) => string; pp?: boolean }) {
  const d = a - b;
  const color = d === 0 ? undefined : d > 0 === bueno > 0 ? "var(--ok)" : "var(--bad-ink)";
  const dif = pp ? `${d > 0 ? "+" : d < 0 ? "−" : ""}${Math.abs(d)} pts` : `${d > 0 ? "+ " : d < 0 ? "− " : ""}${f(Math.abs(d))}`;
  const pc = pp || !b ? "—" : `${d > 0 ? "▲ " : d < 0 ? "▼ " : ""}${Math.abs(Math.round((d / b) * 100))} %`;
  return (
    <tr>
      <td>{n}</td>
      <td className="r">{f(a)}</td>
      <td className="r">{f(b)}</td>
      <td className="r" style={{ color }}>{dif}</td>
      <td className="r" style={{ color }}>{pc}</td>
    </tr>
  );
}

function Barras({ filas, total, color }: { filas: { nombre: string; valor: number; n?: number }[]; total: number; color: string }) {
  if (filas.length === 0) return <div className="vacio">Sin datos en este período.</div>;
  const max = filas[0].valor || 1;
  return (
    <div className="hb">
      {filas.map((f) => (
        <div key={f.nombre} className="hb-i">
          <span className="l" title={f.nombre}>{f.nombre}</span>
          <div className="b"><i style={{ width: `${(f.valor / max) * 100}%`, background: color }} /></div>
          <span className="n">
            {pesos(f.valor)}
            <small>{total ? Math.round((f.valor / total) * 100) : 0}%{f.n ? ` · ${f.n} res.` : ""}</small>
          </span>
        </div>
      ))}
    </div>
  );
}
