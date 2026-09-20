import { Calendario } from "@/components/calendario";
import { cargarCatalogos } from "@/lib/catalogos";
import { hoyColombia } from "@/lib/fechas";
import { reservasActivas } from "@/lib/reservas";

export default async function CalendarioPage() {
  const hoy = hoyColombia();
  const [reservas, catalogos] = await Promise.all([reservasActivas(hoy), cargarCatalogos()]);

  return (
    <div className="wrap">
      <Calendario reservas={reservas} hoy={hoy} catalogos={catalogos} />
    </div>
  );
}
