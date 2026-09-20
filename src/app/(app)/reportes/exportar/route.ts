import { hoyColombia } from "@/lib/fechas";
import { cargarDatos, csvDetalle, csvResumen, leerFiltros } from "@/lib/reportes";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tipo = url.searchParams.get("tipo");
  if (tipo !== "resumen" && tipo !== "detalle") {
    return new Response("Tipo de exportación inválido.", { status: 400 });
  }

  const hoy = hoyColombia();
  const { anio, mes } = leerFiltros(Object.fromEntries(url.searchParams), hoy);
  const datos = await cargarDatos(anio);
  const csv = tipo === "resumen" ? csvResumen(datos, anio, mes, hoy) : csvDetalle(datos, anio, mes);
  const periodo = mes ? `${anio}-${String(mes).padStart(2, "0")}` : String(anio);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="casa-pumata-${tipo}-${periodo}.csv"`,
    },
  });
}
