import { Suspense } from "react";
import { FiltrosReservas } from "@/components/filtros-reservas";
import { Paginacion } from "@/components/paginacion";
import { TablaReservas } from "@/components/tabla-reservas";
import { cargarCatalogos } from "@/lib/catalogos";
import { listarReservas } from "@/lib/reservas";
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

  const [catalogos, { filas, total, paginas }] = await Promise.all([
    cargarCatalogos(),
    listarReservas({ q, origenId: entero(origen), estadoId: entero(estado), pagina }),
  ]);

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
          <FiltrosReservas origenes={catalogos.origenes} estados={catalogos.estadosTodos} />
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
        <Paginacion ruta="/reservas" params={{ q, origen, estado }} pagina={pagina} paginas={paginas} />
      </section>
    </div>
  );
}
