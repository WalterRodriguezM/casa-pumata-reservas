import { cerrarSesion } from "@/app/login/actions";
import { Calendario } from "@/components/calendario";
import { cargarCatalogos } from "@/lib/catalogos";
import { hoyColombia } from "@/lib/fechas";
import { reservasActivas } from "@/lib/reservas";

export default async function Home() {
  const hoy = hoyColombia();
  const [reservas, catalogos] = await Promise.all([reservasActivas(hoy), cargarCatalogos()]);

  return (
    <div className="wrap">
      <Calendario reservas={reservas} hoy={hoy} catalogos={catalogos} salir={cerrarSesion} />
    </div>
  );
}
