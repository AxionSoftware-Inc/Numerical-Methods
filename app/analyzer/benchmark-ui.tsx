import Link from "next/link";
import { Expand } from "lucide-react";
import type { BenchmarkRow, BenchmarkScoreDimension } from "./benchmark-utils";

export function CompactBenchmarkSummary({
  rows,
  methodName,
  wins,
  losses,
}: {
  rows: BenchmarkRow[];
  methodName: string;
  wins: number;
  losses: number;
}) {
  return (
    <div className="mt-3 space-y-3 text-sm">
      <div className="rounded border border-[#e2e8f0] bg-[#f8fbfc] p-3">
        <div className="font-medium text-[#20303a]">{methodName}</div>
        <div className="mt-1 text-xs leading-5 text-[#5a6b74]">
          {wins} ta mezonda eng yaxshi, {losses} ta mezonda eng sust. Benchmark metodning foydasini real diagnostika bilan solishtiradi.
        </div>
      </div>
      {rows.slice(0, 4).map((row) => (
        <div key={row.label} className="grid grid-cols-[110px_1fr] gap-2 rounded border border-[#e2e8f0] p-3">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#647780]">{row.label}</div>
          <div>
            <div className="font-mono text-xs text-[#20303a]">selected {row.selected}</div>
            <div className="mt-1 text-[11px] text-[#5a6b74]">best: {row.bestMethod} ({row.best})</div>
            <div className="text-[11px] text-[#5a6b74]">worst: {row.worstMethod} ({row.worst})</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function BenchmarkCards({ rows }: { rows: BenchmarkRow[] }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <div key={row.label} className="rounded border border-[#d7e2e6] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-[#20303a]">{row.label}</div>
            <span className="rounded bg-[#eef4f5] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#55636d]">benchmark</span>
          </div>
          <div className="mt-3 space-y-2 font-mono text-xs">
            <div className="rounded bg-[#f8fbfc] px-3 py-2 text-[#20303a]">selected: {row.selectedMethod} {"->"} {row.selected}</div>
            <div className="rounded bg-[#ecfdf5] px-3 py-2 text-[#166534]">best: {row.bestMethod} {"->"} {row.best}</div>
            <div className="rounded bg-[#fff1f2] px-3 py-2 text-[#9f1239]">worst: {row.worstMethod} {"->"} {row.worst}</div>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#55636d]">{row.interpretation}</p>
        </div>
      ))}
    </section>
  );
}

export function BenchmarkLink({ href }: { href: string }) {
  return (
    <Link href={href} className="mt-3 inline-flex items-center gap-2 rounded border border-[#cfd9dd] bg-white px-3 py-2 text-sm font-medium text-[#20303a] hover:bg-[#eef4f5]">
      <Expand size={15} />
      Full benchmark
    </Link>
  );
}

export function BenchmarkDashboard({ dimensions }: { dimensions: BenchmarkScoreDimension[] }) {
  const width = 340;
  const height = 340;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 118;
  const count = Math.max(dimensions.length, 3);

  const points = dimensions.map((dimension, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
    const scoreRadius = (dimension.score / 100) * radius;
    return {
      x: centerX + Math.cos(angle) * scoreRadius,
      y: centerY + Math.sin(angle) * scoreRadius,
      labelX: centerX + Math.cos(angle) * (radius + 28),
      labelY: centerY + Math.sin(angle) * (radius + 28),
      score: dimension.score,
      label: dimension.label,
    };
  });

  const polygon = points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <div className="rounded border border-[#dce4e7] bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-[#31424b]">Score radar</div>
        <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 w-full rounded bg-[#f8fbfc]">
          {[0.25, 0.5, 0.75, 1].map((level) => (
            <polygon
              key={level}
              points={Array.from({ length: count }, (_, index) => {
                const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
                const levelRadius = radius * level;
                return `${(centerX + Math.cos(angle) * levelRadius).toFixed(2)},${(centerY + Math.sin(angle) * levelRadius).toFixed(2)}`;
              }).join(" ")}
              fill="none"
              stroke="#d8e4ea"
            />
          ))}
          {Array.from({ length: count }, (_, index) => {
            const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
            return <line key={index} x1={centerX} y1={centerY} x2={centerX + Math.cos(angle) * radius} y2={centerY + Math.sin(angle) * radius} stroke="#d8e4ea" />;
          })}
          <polygon points={polygon} fill="rgba(15,118,110,0.18)" stroke="#0f766e" strokeWidth="2.5" />
          {points.map((point) => (
            <g key={point.label}>
              <circle cx={point.x} cy={point.y} r="4.5" fill="#0f766e" />
              <text x={point.labelX} y={point.labelY} textAnchor="middle" fontSize="11" fill="#4b5f68">
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="rounded border border-[#dce4e7] bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-[#31424b]">Dimension scores</div>
        <div className="mt-4 space-y-4">
          {dimensions.map((dimension) => (
            <div key={dimension.label}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-[#20303a]">{dimension.label}</div>
                <div className="font-mono text-xs text-[#5a6b74]">{dimension.score.toFixed(0)}/100</div>
              </div>
              <div className="h-3 overflow-hidden rounded bg-[#e6eef1]">
                <div className="h-full rounded bg-[linear-gradient(90deg,#0f766e,#38bdf8)]" style={{ width: `${dimension.score}%` }} />
              </div>
              <p className="mt-2 text-sm leading-6 text-[#55636d]">{dimension.interpretation}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
