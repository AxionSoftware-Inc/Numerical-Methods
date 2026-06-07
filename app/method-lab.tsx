"use client";

import { buildTrace, format } from "@methodslab/visual-engine/core";
import { examples, methods } from "@methodslab/visual-engine/presets";
import { MethodScene } from "@methodslab/visual-engine/react";
import type { ExampleId, LayerSpec, MethodId } from "@methodslab/visual-engine/core";
import { Activity, Box, Crosshair, Focus, GitCompare, Layers, Orbit, Play, RotateCcw, ScanSearch, Waves } from "lucide-react";
import { useMemo, useState } from "react";

export default function MethodLab() {
  const [methodId, setMethodId] = useState<MethodId>("euler");
  const [exampleId, setExampleId] = useState<ExampleId>("helix");
  const [showField, setShowField] = useState(true);
  const [showStages, setShowStages] = useState(true);
  const [showComparison, setShowComparison] = useState(true);
  const [showStability, setShowStability] = useState(true);
  const [showJacobian, setShowJacobian] = useState(true);
  const [showLocalError, setShowLocalError] = useState(true);
  const [showCritical, setShowCritical] = useState(true);
  const [errorGain, setErrorGain] = useState(3);
  const [stageFocus, setStageFocus] = useState(0.36);
  const [stepByExample, setStepByExample] = useState<Record<ExampleId, number>>({
    helix: examples[0].defaultStep,
    oscillator: examples[1].defaultStep,
  });

  const method = methods.find((item) => item.id === methodId)!;
  const example = examples.find((item) => item.id === exampleId)!;
  const step = stepByExample[exampleId];
  const trace = useMemo(() => buildTrace(method, example, step), [method, example, step]);
  const comparisonTraces = useMemo(
    () =>
      methods
        .filter((item) => item.id !== methodId)
        .map((item) => ({
          id: item.id,
          name: item.name,
          color: item.color,
          trace: buildTrace(item, example, step),
        })),
    [example, methodId, step],
  );
  const stepIndex = Math.max(0, Math.min(trace.steps.length - 1, Math.floor((trace.steps.length - 1) * stageFocus)));
  const layers = useMemo<Partial<LayerSpec>>(
    () => ({
      field: showField,
      stages: showStages,
      comparison: showComparison,
      errors: true,
      stability: showStability,
      jacobian: showJacobian,
      localError: showLocalError,
      critical: showCritical,
      errorGain,
      stepIndex,
    }),
    [errorGain, showComparison, showCritical, showField, showJacobian, showLocalError, showStability, showStages, stepIndex],
  );

  function setStep(value: number) {
    setStepByExample((current) => ({ ...current, [exampleId]: value }));
  }

  function resetStep() {
    setStep(example.defaultStep);
    setErrorGain(3);
    setStageFocus(0.36);
    setShowStability(true);
    setShowJacobian(true);
    setShowLocalError(true);
    setShowCritical(true);
  }

  return (
    <main className="h-screen overflow-hidden bg-[#f4f7f8] text-[#152026]">
      <section className="grid h-screen grid-rows-[minmax(0,52vh)_minmax(0,48vh)] overflow-hidden lg:grid-cols-[410px_1fr] lg:grid-rows-1">
        <aside className="order-2 min-h-0 overflow-y-auto border-t border-[#d8e0e3] bg-[#fbfcfc] p-5 lg:order-1 lg:h-screen lg:border-r lg:border-t-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded bg-[#14222b] text-white">
              <Box size={21} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5c717c]">MethodsLab Visualizer</p>
              <h1 className="text-2xl font-semibold">{method.name} geometriyasi</h1>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="text-sm font-semibold text-[#31424b]">Metod</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {methods.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMethodId(item.id)}
                    className={`min-h-10 rounded border px-3 text-left text-sm font-medium transition ${
                      item.id === methodId ? "border-[#14222b] bg-[#14222b] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="text-sm font-semibold text-[#31424b]">Misol sahnasi</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {examples.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setExampleId(item.id)}
                    className={`min-h-10 rounded border px-3 text-left text-sm font-medium transition ${
                      item.id === exampleId ? "border-[#0f766e] bg-[#0f766e] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
                    }`}
                  >
                    {item.shortName}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <Activity size={17} />
                Metod modeli
              </div>
              <div className="mt-3 space-y-2 font-mono text-[13px] leading-6 text-[#20303a]">
                <p>{method.formula}</p>
                <p>{example.equation}</p>
                <p>{method.stability}</p>
              </div>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <label htmlFor="step" className="flex items-center justify-between text-sm font-semibold text-[#31424b]">
                Qadam uzunligi
                <span className="font-mono text-[#0f766e]">h = {format(step)}</span>
              </label>
              <input
                id="step"
                type="range"
                min={example.minStep}
                max={example.maxStep}
                step="0.01"
                value={step}
                onChange={(event) => setStep(Number(event.target.value))}
                className="mt-4 w-full accent-[#0f766e]"
              />

              <label htmlFor="errorGain" className="mt-4 flex items-center justify-between text-sm font-semibold text-[#31424b]">
                Xato lens
                <span className="font-mono text-[#9f1239]">x{errorGain.toFixed(1)}</span>
              </label>
              <input
                id="errorGain"
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={errorGain}
                onChange={(event) => setErrorGain(Number(event.target.value))}
                className="mt-4 w-full accent-[#9f1239]"
              />

              <label htmlFor="stageFocus" className="mt-4 flex items-center justify-between text-sm font-semibold text-[#31424b]">
                Stage lens
                <span className="font-mono text-[#6d28d9]">{stepIndex + 1}/{trace.steps.length}</span>
              </label>
              <input
                id="stageFocus"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={stageFocus}
                onChange={(event) => setStageFocus(Number(event.target.value))}
                className="mt-4 w-full accent-[#6d28d9]"
              />

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={resetStep}
                  className="flex h-9 items-center gap-2 rounded border border-[#cfd9dd] px-3 text-sm font-medium hover:bg-[#eef4f5]"
                >
                  <RotateCcw size={16} />
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setShowField((value) => !value)}
                  className={`flex h-9 items-center gap-2 rounded border px-3 text-sm font-medium ${
                    showField ? "border-[#0f766e] bg-[#e8f7f4]" : "border-[#cfd9dd] hover:bg-[#eef4f5]"
                  }`}
                >
                  <Play size={16} />
                  Maydon
                </button>
                <button
                  type="button"
                  onClick={() => setShowStages((value) => !value)}
                  className={`flex h-9 items-center gap-2 rounded border px-3 text-sm font-medium ${
                    showStages ? "border-[#6d28d9] bg-[#f1ebff]" : "border-[#cfd9dd] hover:bg-[#eef4f5]"
                  }`}
                >
                  <Focus size={16} />
                  Stage
                </button>
                <button
                  type="button"
                  onClick={() => setShowComparison((value) => !value)}
                  className={`flex h-9 items-center gap-2 rounded border px-3 text-sm font-medium ${
                    showComparison ? "border-[#334155] bg-[#edf2f7]" : "border-[#cfd9dd] hover:bg-[#eef4f5]"
                  }`}
                >
                  <Layers size={16} />
                  Compare
                </button>
                <button
                  type="button"
                  onClick={() => setShowStability((value) => !value)}
                  className={`flex h-9 items-center gap-2 rounded border px-3 text-sm font-medium ${
                    showStability ? "border-[#0891b2] bg-[#e6f8fb]" : "border-[#cfd9dd] hover:bg-[#eef4f5]"
                  }`}
                >
                  <Orbit size={16} />
                  Region
                </button>
                <button
                  type="button"
                  onClick={() => setShowJacobian((value) => !value)}
                  className={`flex h-9 items-center gap-2 rounded border px-3 text-sm font-medium ${
                    showJacobian ? "border-[#b45309] bg-[#fff4df]" : "border-[#cfd9dd] hover:bg-[#eef4f5]"
                  }`}
                >
                  <ScanSearch size={16} />
                  Jacobian
                </button>
                <button
                  type="button"
                  onClick={() => setShowLocalError((value) => !value)}
                  className={`flex h-9 items-center gap-2 rounded border px-3 text-sm font-medium ${
                    showLocalError ? "border-[#be123c] bg-[#fff1f2]" : "border-[#cfd9dd] hover:bg-[#eef4f5]"
                  }`}
                >
                  <Waves size={16} />
                  Local error
                </button>
                <button
                  type="button"
                  onClick={() => setShowCritical((value) => !value)}
                  className={`flex h-9 items-center gap-2 rounded border px-3 text-sm font-medium ${
                    showCritical ? "border-[#ea580c] bg-[#fff7ed]" : "border-[#cfd9dd] hover:bg-[#eef4f5]"
                  }`}
                >
                  <Crosshair size={16} />
                  Critical
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded border border-[#dce4e7] bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#647780]">Qadam</p>
                <p className="mt-2 text-2xl font-semibold">{trace.points.length - 1}</p>
              </div>
              <div className="rounded border border-[#dce4e7] bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#647780]">Xato</p>
                <p className="mt-2 text-2xl font-semibold">{format(trace.metrics.finalError)}</p>
              </div>
              <div className="rounded border border-[#dce4e7] bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#647780]">{example.metricLabel}</p>
                <p className="mt-2 text-2xl font-semibold">{format(trace.metrics.metricValue)}</p>
              </div>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <GitCompare size={17} />
                Geometrik talqin
              </div>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{method.geometry}</p>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{example.interpretation}</p>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">
                Hozirgi visualizer `TraceResult` formatida ishlaydi: path, stage, exact, stability, Jacobian, local error va metric qatlamlari ajratilgan.
              </p>
            </div>
          </div>
        </aside>

        <div className="relative order-1 min-h-0 overflow-hidden bg-[#0b0f14] lg:order-2">
          <MethodScene
            className="absolute inset-0"
            method={method}
            example={example}
            trace={trace}
            comparisonTraces={comparisonTraces}
            layers={layers}
          />
          <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded bg-[#38bdf8] px-2 py-1 text-[#082f49]">haqiqiy oqim</span>
            <span className="rounded px-2 py-1 text-[#1f1600]" style={{ background: method.color }}>
              {method.name} qadamlar
            </span>
            <span className="rounded bg-[#fb7185] px-2 py-1 text-[#4c0519]">xato lens</span>
            <span className="rounded bg-[#f1ebff] px-2 py-1 text-[#4c1d95]">stage lens</span>
            <span className="rounded bg-[#fed7aa] px-2 py-1 text-[#7c2d12]">critical</span>
          </div>
        </div>
      </section>
    </main>
  );
}
