export function ChipEstado({ estado }: { estado: string }) {
  const cls = estado === "Confirmada" ? "conf" : estado === "Pendiente" ? "pend" : "canc";
  return <span className={`estado-chip ${cls}`}>{estado}</span>;
}
