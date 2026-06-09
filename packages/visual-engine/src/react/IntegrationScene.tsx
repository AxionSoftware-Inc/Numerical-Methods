"use client";

import type { IntegrationTrace } from "@methodslab/methods-engine/core";

export type IntegrationComparisonTrace = {
  id: string;
  name: string;
  color: string;
  trace: IntegrationTrace;
};

export type IntegrationSceneProps = {
  trace: IntegrationTrace;
  comparisonTraces?: IntegrationComparisonTrace[];
  showComparison?: boolean;
  className?: string;
};

export function IntegrationScene({ trace, comparisonTraces = [], showComparison = true, className }: IntegrationSceneProps) {
  const width = 1000;
  const height = 640;
  const pad = { left: 70, right: 34, top: 42, bottom: 76 };
  const allY = [
    0,
    ...trace.curve.map((sample) => sample.y),
    ...trace.panels.flatMap((panel) => panel.polygon.map((point) => point[1])),
  ];
  const minX = trace.curve[0]?.x ?? 0;
  const maxX = trace.curve.at(-1)?.x ?? 1;
  const minY = Math.min(0, ...allY);
  const maxY = Math.max(...allY) * 1.1;
  const xScale = (x: number) => pad.left + ((x - minX) / Math.max(maxX - minX, 1e-12)) * (width - pad.left - pad.right);
  const yScale = (y: number) => height - pad.bottom - ((y - minY) / Math.max(maxY - minY, 1e-12)) * (height - pad.top - pad.bottom);
  const curvePath = toPath(trace.curve.map((sample) => [xScale(sample.x), yScale(sample.y)]));
  const baselineY = yScale(0);

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full bg-[#071115]">
        <defs>
          <pattern id="integral-grid" width="42" height="42" patternUnits="userSpaceOnUse">
            <path d="M 42 0 L 0 0 0 42" fill="none" stroke="#18313a" strokeWidth="1" opacity="0.72" />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#integral-grid)" />
        <line x1={pad.left} y1={baselineY} x2={width - pad.right} y2={baselineY} stroke="#8aa1ad" strokeWidth="1.4" opacity="0.72" />
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={height - pad.bottom} stroke="#8aa1ad" strokeWidth="1.4" opacity="0.72" />

        {trace.panels.map((panel) => (
          <g key={panel.index}>
            <polygon
              points={panel.polygon.map(([x, y]) => `${xScale(x).toFixed(2)},${yScale(y).toFixed(2)}`).join(" ")}
              fill={trace.metadata.methodId === "simpson" ? "#cc79a7" : "#e69f00"}
              fillOpacity="0.18"
              stroke={panel.error >= 0 ? "#f59e0b" : "#38bdf8"}
              strokeOpacity="0.68"
              strokeWidth="1.2"
            >
              <title>{`panel ${panel.index + 1}: area=${panel.area.toFixed(6)}, error=${panel.error.toExponential(2)}`}</title>
            </polygon>
            {panel.nodes.map(([x, y], nodeIndex) => (
              <circle key={`${panel.index}-${nodeIndex}`} cx={xScale(x)} cy={yScale(y)} r="3.2" fill="#f8fafc" opacity="0.86">
                <title>{`node x=${x.toFixed(4)}, f=${y.toFixed(4)}`}</title>
              </circle>
            ))}
          </g>
        ))}

        {showComparison
          ? comparisonTraces.map((item) => (
              <path
                key={item.id}
                d={toPanelTopPath(item.trace, xScale, yScale)}
                fill="none"
                stroke={item.color}
                strokeWidth="2"
                strokeOpacity="0.42"
                strokeDasharray={item.id === trace.metadata.methodId ? undefined : "7 6"}
              />
            ))
          : null}

        <path d={curvePath} fill="none" stroke="#56b4e9" strokeWidth="3.2" strokeLinecap="round" />
        <text x={pad.left} y={height - 28} fill="#d7e3ea" fontSize="18" fontFamily="ui-monospace, monospace">
          {trace.metadata.methodName}: numeric {trace.numericValue.toFixed(7)} | exact {trace.exactValue.toFixed(7)} | error {trace.error.toExponential(2)}
        </text>
        <text x={width - pad.right} y={height - 28} textAnchor="end" fill="#8fb3c5" fontSize="16" fontFamily="ui-monospace, monospace">
          panels {trace.panelCount}
        </text>
      </svg>
    </div>
  );
}

function toPath(points: Array<[number, number]>) {
  return points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
}

function toPanelTopPath(trace: IntegrationTrace, xScale: (x: number) => number, yScale: (y: number) => number) {
  const points = trace.panels.flatMap((panel) => panel.polygon.filter(([, y]) => y !== 0));
  return toPath(points.map(([x, y]) => [xScale(x), yScale(y)]));
}
