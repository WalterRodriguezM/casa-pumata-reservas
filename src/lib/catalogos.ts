import { createClient } from "@/lib/supabase/server";

export type Item = { id: number; nombre: string };
export type Catalogos = {
  origenes: Item[];
  metodos: Item[];
  estados: Item[]; // sin Cancelada: no se ofrece al crear
  estadosTodos: Item[]; // con Cancelada: solo al editar
  tiposDocumento: Item[];
  generos: Item[];
};

const CANCELADA = 3;

export async function cargarCatalogos(): Promise<Catalogos> {
  const supabase = await createClient();
  const leer = async (tabla: string) => {
    const { data, error } = await supabase.from(tabla).select("id, nombre").order("id");
    if (error) throw new Error(`No se pudo cargar ${tabla}: ${error.message}`);
    return data as Item[];
  };
  const [origenes, metodos, estados, tiposDocumento, generos] = await Promise.all([
    leer("origenes_reserva"),
    leer("metodos_pago"),
    leer("estados_reserva"),
    leer("tipos_documento"),
    leer("generos"),
  ]);
  return {
    origenes,
    metodos,
    estadosTodos: estados,
    estados: estados.filter((e) => e.id !== CANCELADA),
    tiposDocumento,
    generos,
  };
}
