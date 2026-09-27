import { Suspense } from "react";
import { FiltrosReservas } from "@/components/filtros-reservas";
import { Paginacion } from "@/components/paginacion";
import { TablaReservas } from "@/components/tabla-reservas";
import { cargarCatalogos } from "@/lib/catalogos";
import { anioMasAntiguoReservas, listarReservas } from "@/lib/reservas";
import { hoyColombia, listaEnteros, rangosDeMeses } from "@/lib/fechas";
import Link from "next/link";

type Busqueda = Promise<Record<string, string | string[] | undefined>>;

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const entero = (v: string) => (/^\d+$/.test(v) ? Number(v) : null);

export default async function ReservasPage({ searchParams }: { searchParams: Busqueda }) {
  const sp = await searchParams;
  const q = uno(sp.q).trim();
  const origen = uno(sp.origen);
  const estado = uno(sp.estado);
  const pagina = Math.max(1, entero(uno(sp.pagina)) ?? 1);
  // Año y mes del check-in, con varios valores separados por coma. Sin año: todas las fechas.
  const anio = uno(sp.anio);
  const mes = uno(sp.mes);
  const aniosSel = listaEnteros(anio, 1900, 2999);
  const rangos = aniosSel.length ? rangosDeMeses(aniosSel, listaEnteros(mes, 1, 12)) : null;

  const [catalogos, primerAnio, { filas, total, paginas }] = await Promise.all([
    cargarCatalogos(),
    anioMasAntiguoReservas(),
    listarReservas({ q, rangos, origenId: entero(origen), estadoId: entero(estado), pagina }),
  ]);
  const anioActual = Number(hoyColombia().slice(0, 4));
  const anios: number[] = [];
  for (let a = anioActual + 1; a >= Math.min(primerAnio ?? anioActual, anioActual); a--) anios.push(a);

  return (
    <div className="wrap estrecho">
      <header className="topbar">
        <h1>
          <small>Listado</small>Reservas
        </h1>
        <Link className="btn primary" href="/calendario">
          + Nueva reserva
        </Link>
      </header>
      <section className="panel">
        <Suspense>
          <FiltrosReservas origenes={catalogos.origenes} estados={catalogos.estadosTodos} anios={anios} />
        </Suspense>
        <div style={{ marginTop: 14 }}>
          <TablaReservas filas={filas} catalogos={catalogos} />
        </div>
        <div className="pie">
          <span>
            {total} {total === 1 ? "reserva" : "reservas"} · más recientes primero
          </span>
          <span>Clic en una fila abre el detalle y permite editarla.</span>
        </div>
        <Paginacion ruta="/reservas" params={{ q, anio, mes, origen, estado }} pagina={pagina} paginas={paginas} />
      </section>
    </div>
  );
}
