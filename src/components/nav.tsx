"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ENLACES = [
  { href: "/", texto: "Home" },
  { href: "/calendario", texto: "Calendario" },
  { href: "/reservas", texto: "Reservas" },
  { href: "/gastos", texto: "Gastos" },
];

export function Nav({ salir }: { salir: () => Promise<void> }) {
  const ruta = usePathname();
  const activa = (href: string) => (href === "/" ? ruta === "/" : ruta.startsWith(href));

  return (
    <nav className="nav" aria-label="Principal">
      <div className="nav-in">
        <span className="brand">Casa Pumata</span>
        <div className="links">
          {ENLACES.map((e) => (
            <Link key={e.href} href={e.href} aria-current={activa(e.href) ? "page" : undefined}>
              {e.texto}
            </Link>
          ))}
          <span className="deshabilitado" aria-disabled="true" title="Llega con la Fase 5">
            Reportes<small>Pronto</small>
          </span>
        </div>
        <form action={salir}>
          <button className="salir">Salir</button>
        </form>
      </div>
    </nav>
  );
}
