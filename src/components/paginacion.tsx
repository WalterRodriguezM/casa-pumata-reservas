import Link from "next/link";

type Props = {
  ruta: string;
  params: Record<string, string | undefined>;
  pagina: number;
  paginas: number;
};

export function Paginacion({ ruta, params, pagina, paginas }: Props) {
  if (paginas <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    if (p > 1) q.set("pagina", String(p));
    const s = q.toString();
    return s ? `${ruta}?${s}` : ruta;
  };
  return (
    <nav className="paginacion" aria-label="Paginación">
      {pagina > 1 ? <Link className="btn" href={href(pagina - 1)}>← Anterior</Link> : <span className="btn off">← Anterior</span>}
      <span>
        Página {pagina} de {paginas}
      </span>
      {pagina < paginas ? <Link className="btn" href={href(pagina + 1)}>Siguiente →</Link> : <span className="btn off">Siguiente →</span>}
    </nav>
  );
}
