"use client";

import { useState } from "react";
import { MESES, formatoPesosSigno } from "@/lib/fechas";

export type MesGrafico = { i: number; ingresos: number; gastos: number; balance: number; vacio: boolean };

const W = 760, H = 300, L = 52, R = 10, T = 10, B = 28;
const PW = W - L - R, PH = H - T - B;
const M3 = MESES.map((m) => m.slice(0, 3));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const corto = (n: number) =>
  n >= 1e6 ? "$" + (n / 1e6).toLocaleString("es-CO", { maximumFractionDigits: 1 }) + " M" : n >= 1e3 ? "$" + Math.round(n / 1e3) + " mil" : "$" + n;

export function GraficoMeses({ meses, seleccionado, anio }: { meses: MesGrafico[]; seleccionado: number; anio: number }) {
  const [tip, setTip] = useState<{ m: MesGrafico; x: number; y: number } | null>(null);

  const max = Math.max(...meses.flatMap((m) => [m.ingresos, m.gastos]), 1);
  const paso = [1e5, 2e5, 25e4, 5e5, 1e6, 2e6, 5e6, 1e7].find((p) => max / p <= 5) ?? 1e7;
  const tope = Math.ceil(max / paso) * paso;
  const y = (v: number) => T + PH - (v / tope) * PH;
  const gw = PW / 12;
  const bw = Math.min(20, gw / 2 - 4);

  const barra = (x: number, v: number, color: string, op: number) => {
    if (v <= 0) return null;
    const h = (v / tope) * PH;
    const r = Math.min(4, h, bw / 2);
    return (
      <path
        d={`M${x},${T + PH} v${-(h - r)} a${r},${r} 0 0 1 ${r},${-r} h${bw - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - r} z`}
        fill={color}
        opacity={op}
      />
    );
  };

  const ticks = [];
  for (let v = 0; v <= tope; v += paso) ticks.push(v);

  return (
    <div className="chart" onMouseLeave={() => setTip(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Ingresos y gastos por mes de ${anio}`}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--grid)" />
            <text x={L - 8} y={y(v) + 4} textAnchor="end">
              {v ? corto(v) : "$0"}
            </text>
          </g>
        ))}
        {meses.map((m, i) => {
          const cx = L + gw * i + gw / 2;
          const op = !seleccionado || seleccionado === m.i ? 1 : 0.35;
          return (
            <g
              key={m.i}
              className="col"
              onMouseMove={(e) => {
                if (m.vacio) return setTip(null);
                const caja = e.currentTarget.ownerSVGElement!.parentElement!.getBoundingClientRect();
                setTip({ m, x: e.clientX - caja.left, y: e.clientY - caja.top });
              }}
            >
              <rect className="hit" x={L + gw * i} y={T} width={gw} height={PH} fill="transparent" />
              {!m.vacio && barra(cx - bw - 1, m.ingresos, "var(--ing)", op)}
              {!m.vacio && barra(cx + 1, m.gastos, "var(--gas)", op)}
              <text
                x={cx}
                y={H - 8}
                textAnchor="middle"
                style={seleccionado === m.i ? { fill: "var(--ink)", fontWeight: 700 } : undefined}
              >
                {M3[i]}
              </text>
            </g>
          );
        })}
        <line x1={L} x2={W - R} y1={T + PH} y2={T + PH} stroke="var(--line)" />
      </svg>
      {tip && (
        <div className="tip" style={{ left: Math.max(0, tip.x > 520 ? tip.x - 214 : tip.x + 14), top: Math.max(0, tip.y - 20) }}>
          <b>
            {cap(MESES[tip.m.i - 1])} {anio}
          </b>
          <div>
            <span><i className="sw" style={{ background: "var(--ing)" }} />Ingresos</span>
            <span>{formatoPesosSigno(tip.m.ingresos)}</span>
          </div>
          <div>
            <span><i className="sw" style={{ background: "var(--gas)" }} />Gastos</span>
            <span>{formatoPesosSigno(tip.m.gastos)}</span>
          </div>
          <div>
            <span>Balance</span>
            <span style={{ fontWeight: 700 }}>{tip.m.balance >= 0 ? "+ " : ""}{formatoPesosSigno(tip.m.balance)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
