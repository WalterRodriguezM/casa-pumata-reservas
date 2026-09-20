"use client";

import { useRef, useState } from "react";

// Aviso temporal abajo de la pantalla: const [aviso, mostrar] = useAviso();
export function useAviso() {
  const [texto, setTexto] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mostrar = (t: string) => {
    setTexto(t);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setTexto(null), 3200);
  };
  const nodo = texto ? (
    <div className="toast" role="status">
      {texto}
    </div>
  ) : null;
  return [nodo, mostrar] as const;
}
