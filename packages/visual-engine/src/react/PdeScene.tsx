"use client";

import { useMemo } from "react";
import type { PdeTrace } from "@methodslab/methods-engine/core";

export type PdeSceneProps = {
  trace: PdeTrace;
  className?: string;
};

export function PdeScene({ trace, className }: PdeSceneProps) {
  const lastFrame = trace.frames.at(-1) ?? trace.frames[0];
  const maxError = trace.errors.reduce((best, sample) => Math.max(best, sample.linf), 0);
  const [minValue, maxValue] = trace.valueRange;
  const width = 720;
  const height = 240;

  const numericPath = useMemo(() => buildPath(trace.xs, lastFrame.values, width, height), [height, lastFrame.values, trace.xs, width]);
  const exactPath = useMemo(() => buildPath(trace.xs, lastFrame.exactValues, width, height), [height, lastFrame.exactValues, trace.xs, width]);
  const errorPath = useMemo(() => buildErrorPath(trace.errors, width, 120), [trace.errors]);

  return (
    <div className={className}>
      <div className="grid h-full gap-3 p-4 lg:grid-cols-[1.2fr_0.8fr] lg:grid-rows-[minmax(0,1fr)_140px]">
        <section className="rounded border border-[#17313a] bg-[#03161d] p-3 lg:row-span-2">
          <div className="mb-3 flex items-center justify-between text-xs text-[#9fb3bb]">
            <span>space-time heatmap</span>
            <span>{trace.metadata.methodName}</span>
          </div>
          <div
            className="grid h-[calc(100%-1.5rem)] w-full overflow-hidden rounded border border-[#12303a]"
            style={{ gridTemplateColumns: `repeat(${trace.xs.length}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${trace.frames.length}, minmax(0, 1fr))` }}
          >
            {trace.frames.flatMap((frame, rowIndex) =>
              frame.values.map((value, columnIndex) => (
                <div
                  key={`${rowIndex}-${columnIndex}`}
                  title={`t=${frame.time.toFixed(3)}, x=${trace.xs[columnIndex].toFixed(3)}, u=${value.toFixed(4)}, exact=${frame.exactValues[columnIndex].toFixed(4)}`}
                  style={{ background: heatColor(value, minValue, maxValue) }}
                />
              )),
            )}
          </div>
        </section>

        <section className="rounded border border-[#17313a] bg-[#071922] p-3">
          <div className="mb-3 flex items-center justify-between text-xs text-[#9fb3bb]">
            <span>final profile</span>
            <span>t = {lastFrame.time.toFixed(2)}</span>
          </div>
          <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
            <rect width={width} height={height} fill="#071922" />
            <path d={exactPath} fill="none" stroke="#fde047" strokeWidth="3" />
            <path d={numericPath} fill="none" stroke="#38bdf8" strokeWidth="3" strokeDasharray="8 5" />
          </svg>
        </section>

        <section className="rounded border border-[#17313a] bg-[#071922] p-3">
          <div className="mb-3 flex items-center justify-between text-xs text-[#9fb3bb]">
            <span>error over time</span>
            <span>L∞ max = {maxError.toExponential(2)}</span>
          </div>
          <svg viewBox={`0 0 ${width} 120`} className="h-full w-full">
            <rect width={width} height={120} fill="#071922" />
            <path d={errorPath} fill="none" stroke="#f472b6" strokeWidth="3" />
          </svg>
        </section>
      </div>
    </div>
  );
}

function buildPath(xs: number[], values: number[], width: number, height: number) {
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const scale = max - min || 1;
  return xs
    .map((x, index) => {
      const px = (x - xs[0]) / Math.max(xs.at(-1)! - xs[0], 1e-9) * width;
      const py = height - ((values[index] - min) / scale) * height;
      return `${index === 0 ? "M" : "L"} ${px.toFixed(2)} ${py.toFixed(2)}`;
    })
    .join(" ");
}

function buildErrorPath(errors: PdeTrace["errors"], width: number, height: number) {
  const max = Math.max(...errors.map((sample) => sample.linf), 1e-9);
  const lastTime = errors.at(-1)?.time ?? 1;
  return errors
    .map((sample, index) => {
      const x = (sample.time / Math.max(lastTime, 1e-9)) * width;
      const y = height - (sample.linf / max) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function heatColor(value: number, min: number, max: number) {
  const t = (value - min) / Math.max(max - min, 1e-9);
  const r = Math.round(18 + t * 220);
  const g = Math.round(34 + (1 - Math.abs(t - 0.5) * 2) * 120);
  const b = Math.round(52 + (1 - t) * 190);
  return `rgb(${r}, ${g}, ${b})`;
}
