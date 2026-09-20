import { Suspense } from "react";
import { BotonNuevoGasto } from "@/components/modal-gasto";
import { FiltrosGastos } from "@/components/filtros-gastos";
import { Paginacion } from "@/components/paginacion";
import { TablaGastos } from "@/components/tabla-gastos";
import { hoyColombia, formatoPesos } from "@/lib/fechas";
import { anioMasAntiguoGastos, categoriasGasto, listarGastos } from "@/lib/gastos";

type Busqueda = Promise<Record<string, string | string[] | undefined>>;

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

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
  const categoria = /^\d+$/.test(uno(sp.categoria)) ? Number(uno(sp.categoria)) : null;
  const pagina = Math.max(1, /^\d+$/.test(uno(sp.pagina)) ? Number(uno(sp.pagina)) : 1);

  const [categorias, primerAnio, { filas, total, suma, paginas }] = await Promise.all([
    categoriasGasto(),
    anioMasAntiguoGastos(),
    listarGastos({ desde, hasta, categoriaId: categoria, pagina }),
  ]);
  const anios: number[] = [];
  for (let a = anioActual + 1; a >= Math.min(primerAnio ?? anioActual, anioActual - 1); a--) anios.push(a);

  return (
    <div className="wrap estrecho">
      <header className="topbar">
        <h1>
          <small>Registro</small>Gastos
        </h1>
        <BotonNuevoGasto categorias={categorias} hoy={hoy} />
      </header>
      <section className="panel">
        <Suspense>
          <FiltrosGastos categorias={categorias} anios={anios} anioActual={anioActual} mesActual={mesActual} />
        </Suspense>
        <p className="ayuda" style={{ marginTop: 14 }}>
          <b>Edita directo en la tabla:</b> haz clic en una celda, cambia el valor y presiona <kbd>Enter</kbd> para
          guardar o <kbd>Esc</kbd> para cancelar.
        </p>
        <TablaGastos filas={filas} categorias={categorias} />
        <div className="pie">
          <span>
            {total} {total === 1 ? "gasto" : "gastos"} · más recientes primero
          </span>
          <span className="total-gastos">
            Total: <b>{formatoPesos(suma)}</b>
          </span>
        </div>
        <Paginacion
          ruta="/gastos"
          params={{ anio: anioParam || undefined, mes: mesParam || undefined, categoria: categoria ? String(categoria) : undefined }}
          pagina={pagina}
          paginas={paginas}
        />
      </section>
    </div>
  );
}
