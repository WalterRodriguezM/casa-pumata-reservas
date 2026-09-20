import { cerrarSesion } from "@/app/login/actions";
import { Nav } from "@/components/nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav salir={cerrarSesion} />
      {children}
    </>
  );
}
