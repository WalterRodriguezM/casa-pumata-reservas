import Link from "next/link";
import { Suspense } from "react";
import { BotonNuevoGasto } from "@/components/modal-gasto";
import { FiltrosGastos } from "@/components/filtros-gastos";
import { Paginacion } from "@/components/paginacion";
import { TablaGastos } from "@/components/tabla-gastos";
import { formatoPesos, hoyColombia } from "@/lib/fechas";
import {
  anioMasAntiguoGastos, catalogosGastos, gastosPendientes, listarGastos, type TipoGasto,
} from "@/lib/gastos";

type Busqueda = Promise<Record<string, string | string[] | undefined>>;

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const entero = (v: string) => (/^\d+$/.test(v) ? Number(v) : null);

export default async function GastosPage({ searchParams }: { searchParams: Busqueda }) {
  const sp = await searchParams;
  const hoy = hoyColombia();
  const anioActual = Number(hoy.slice(0, 4));
  const mesActual = Number(hoy.slice(5, 7));
  const anioParam = uno(sp.anio);
  const mesParam = uno(sp.mes);

  // Sin parámetros: mes actual. Con año y sin mes (o mes=todos): año completo. anio=todos: sin filtro.
  const anio = anioParam === "todos" ? null : /^\d{4}$/.test(anioParam) ? Number(anioParam) : anioActual;
  const mesNum = /^(?:[1-9]|1[0-2])$/.test(mesParam) ? Number(mesParam) : null;
  const mes = !anioParam && !mesParam ? mesActual : mesNum;
  let desde: string | null = null;
  let hasta: string | null = null;
  if (anio !== null) {
    if (mes) {
      const dd = String(new Date(anio, mes, 0).getDate()).padStart(2, "0");
      const mm = String(mes).padStart(2, "0");
      desde = `${anio}-${mm}-01`;
      hasta = `${anio}-${mm}-${dd}`;
    } else {
      desde = `${anio}-01-01`;
      hasta = `${anio}-12-31`;
    }
  }

  const tipoParam = uno(sp.tipo);
  const tipo: TipoGasto | null = tipoParam === "casa" || tipoParam === "personal" ? tipoParam : null;
  const socioParam = uno(sp.socio);
  const socio = socioParam === "pendiente" ? "pendiente" : entero(socioParam);
  const categoria = entero(uno(sp.categoria));
  const cuenta = entero(uno(sp.cuenta));
  const pagina = Math.max(1, entero(uno(sp.pagina)) ?? 1);

  const [cats, primerAnio, pendientes, { filas, total, casa, personal, paginas }] = await Promise.all([
    catalogosGastos(),
    anioMasAntiguoGastos(),
    gastosPendientes(),
    listarGastos({ desde, hasta, tipo, socio, categoriaId: categoria, cuentaId: cuenta, pagina }),
  ]);
  const anios: number[] = [];
  for (let a = anioActual + 1; a >= Math.min(primerAnio ?? anioActual, anioActual - 1); a--) anios.push(a);

  const params: Record<string, string | undefined> = {
    anio: anioParam || undefined,
    mes: mesParam || undefined,
    tipo: tipo ?? undefined,
    socio: socioParam || undefined,
    categoria: categoria ? String(categoria) : undefined,
    cuenta: cuenta ? String(cuenta) : undefined,
  };

  return (
    <div className="wrap estrecho">
      <header className="topbar">
        <h1>
          <small>Registro</small>Gastos
        </h1>
        <BotonNuevoGasto categoriasCasa={cats.categoriasCasa} cuentas={cats.cuentas} socios={cats.socios} hoy={hoy} />
      </header>
      <section className="panel">
        <Suspense>
          <FiltrosGastos
            categorias={cats.categorias}
            cuentas={cats.cuentas}
            socios={cats.socios}
            anios={anios}
            anioActual={anioActual}
            mesActual={mesActual}
          />
        </Suspense>
        {pendientes.n > 0 && (
          <div className="aviso-pend">
            <span>
              <b>
                {pendientes.n} gasto{pendientes.n > 1 ? "s" : ""} personal{pendientes.n > 1 ? "es" : ""} sin socio
              </b>{" "}
              ({formatoPesos(pendientes.suma)}). No entran en el cuadre de nadie hasta que elijas un socio.
            </span>
            <Link className="btn" href="/gastos?anio=todos&tipo=personal&socio=pendiente">
              Ver solo esos
            </Link>
          </div>
        )}
        <p className="ayuda" style={{ marginTop: 14 }}>
          <b>Edita directo en la tabla:</b> haz clic en una celda, cambia el valor y presiona <kbd>Enter</kbd> (o elige una
          opción de la lista). <kbd>Esc</kbd> cancela.
        </p>
        <TablaGastos filas={filas} categoriasCasa={cats.categoriasCasa} cuentas={cats.cuentas} socios={cats.socios} />
        <div className="pie">
          <span>
            {total} {total === 1 ? "gasto" : "gastos"} · más recientes primero
          </span>
          <span className="total-gastos">
            Casa <b>{formatoPesos(casa)}</b> · Personal <b>{formatoPesos(personal)}</b> · Total <b>{formatoPesos(casa + personal)}</b>
          </span>
        </div>
        <Paginacion ruta="/gastos" params={params} pagina={pagina} paginas={paginas} />
      </section>
    </div>
  );
}
