import { cerrarSesion } from "@/app/login/actions";
import { Calendario } from "@/components/calendario";
import { hoyColombia } from "@/lib/fechas";
import { reservasActivas } from "@/lib/reservas";

export default async function Home() {
  const hoy = hoyColombia();
  const reservas = await reservasActivas(hoy);

  return (
    <div className="wrap">
      <Calendario reservas={reservas} hoy={hoy} salir={cerrarSesion} />
    </div>
  );
}
