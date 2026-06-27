"use client";

import {
  buildIntegrationConvergence,
  buildIntegrationTrace,
  buildResolutionConvergence,
  buildSurfaceIntegralTrace,
  buildVolumeIntegralTrace,
  compileCustomAreaIntegralMethod,
  compileCustomSurfaceIntegralMethod,
  compileCustomVolumeIntegralMethod,
  format,
} from "@methodslab/methods-engine/core";
import {
  integrationExamples,
  integrationMethods,
  surfaceIntegralExamples,
  surfaceIntegrationMethods,
  volumeIntegralExamples,
  volumeIntegrationMethods,
} from "@methodslab/methods-engine/presets";
import { IntegrationScene, MultiIntegralScene } from "@methodslab/visual-engine/react";
import type {
  IntegrationConvergenceTrace,
  IntegrationExampleId,
  IntegrationMethodId,
  SurfaceIntegrationMethodId,
  SurfaceIntegralExampleId,
  VolumeIntegrationMethodId,
  VolumeIntegralExampleId,
} from "@methodslab/methods-engine/core";
import { Activity, AreaChart, BarChart3, Box, Crosshair, FunctionSquare, GitCompare, RotateCcw, ScanSearch, Sigma, Sparkles, Thermometer, TrendingUp, Waves } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BenchmarkLink, CompactBenchmarkSummary } from "./analyzer/benchmark-ui";
import {
  buildAreaIntegralBenchmarkRows,
  buildSurfaceIntegralBenchmarkRows,
  buildVolumeIntegralBenchmarkRows,
  summarizeBenchmark,
} from "./analyzer/benchmark-utils";

export type IntegralLabProps = {
  onSwitchToOde: () => void;
  onSwitchToPde: () => void;
  onSwitchToCustom: () => void;
  onOpenFamily?: (familyId: string) => void;
};

type IntegralKind = "area" | "surface" | "volume";

export default function IntegralLab({ onSwitchToOde, onSwitchToPde, onSwitchToCustom, onOpenFamily }: IntegralLabProps) {
  const [integralKind, setIntegralKind] = useState<IntegralKind>("area");

  if (integralKind === "surface") {
    return (
      <SurfaceIntegralLab
        activeKind={integralKind}
        onSetKind={setIntegralKind}
        onSwitchToOde={onSwitchToOde}
        onSwitchToPde={onSwitchToPde}
        onSwitchToCustom={onSwitchToCustom}
        onOpenFamily={onOpenFamily}
      />
    );
  }

  if (integralKind === "volume") {
    return (
      <VolumeIntegralLab
        activeKind={integralKind}
        onSetKind={setIntegralKind}
        onSwitchToOde={onSwitchToOde}
        onSwitchToPde={onSwitchToPde}
        onSwitchToCustom={onSwitchToCustom}
        onOpenFamily={onOpenFamily}
      />
    );
  }

  return (
    <AreaIntegralLab
      activeKind={integralKind}
      onSetKind={setIntegralKind}
      onSwitchToOde={onSwitchToOde}
      onSwitchToPde={onSwitchToPde}
      onSwitchToCustom={onSwitchToCustom}
      onOpenFamily={onOpenFamily}
    />
  );
}

function AreaIntegralLab({
  activeKind,
  onSetKind,
  onSwitchToOde,
  onSwitchToPde,
  onSwitchToCustom,
  onOpenFamily,
}: IntegralLabProps & { activeKind: IntegralKind; onSetKind: (kind: IntegralKind) => void }) {
  const [methodId, setMethodId] = useState<IntegrationMethodId>("trapezoid");
  const [customMethodInput, setCustomMethodInput] = useState("adaptive simpson singular integral");
  const [useCustomMethod, setUseCustomMethod] = useState(false);
  const [exampleId, setExampleId] = useState<IntegrationExampleId>("smooth-wave");
  const [showComparison, setShowComparison] = useState(true);
  const [panelsByExample, setPanelsByExample] = useState<Record<IntegrationExampleId, number>>({
    "smooth-wave": integrationExamples[0].defaultPanels,
    "sharp-peak": integrationExamples[1].defaultPanels,
    "singular-edge": integrationExamples[2].defaultPanels,
    oscillatory: integrationExamples[3].defaultPanels,
  });

  const customMethod = useMemo(() => compileCustomAreaIntegralMethod(customMethodInput), [customMethodInput]);
  const presetMethod = integrationMethods.find((item) => item.id === methodId)!;
  const method = useCustomMethod ? customMethod.method : presetMethod;
  const example = integrationExamples.find((item) => item.id === exampleId)!;
  const panels = panelsByExample[exampleId];
  const trace = useMemo(() => buildIntegrationTrace(method, example, panels), [example, method, panels]);
  const comparisonTraces = useMemo(
    () =>
      integrationMethods
        .filter((item) => item.id !== (useCustomMethod ? customMethod.baseMethodId : methodId))
        .map((item) => buildIntegrationTrace(item, example, panels)),
    [customMethod.baseMethodId, example, methodId, panels, useCustomMethod],
  );
  const convergence = useMemo(
    () => buildIntegrationConvergence(integrationMethods, example, Math.max(example.maxPanels, panels)),
    [example, panels],
  );
  const benchmarkRows = useMemo(() => buildAreaIntegralBenchmarkRows(trace, comparisonTraces), [comparisonTraces, trace]);
  const benchmarkSummary = useMemo(() => summarizeBenchmark(benchmarkRows, trace.metadata.methodName), [benchmarkRows, trace.metadata.methodName]);

  function setPanels(value: number) {
    setPanelsByExample((current) => ({ ...current, [exampleId]: value }));
  }

  function reset() {
    setPanels(example.defaultPanels);
    setShowComparison(true);
  }

  const densityLabel =
    method.category === "stochastic"
      ? `samples ${trace.sampleCount}`
      : `panels ${trace.panelCount}`;
  const stderrValue =
    trace.estimatorStdError > 0 ? trace.estimatorStdError.toExponential(2) : "det";

  return (
    <main className="h-screen overflow-hidden bg-[#f4f7f8] text-[#152026]">
      <section className="grid h-screen grid-rows-[minmax(0,52vh)_minmax(0,48vh)] overflow-hidden lg:grid-cols-[430px_1fr] lg:grid-rows-1">
        <aside className="relative z-10 order-2 min-h-0 overflow-y-auto border-t border-[#d8e0e3] bg-[#fbfcfc] p-5 lg:order-1 lg:h-screen lg:border-r lg:border-t-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded bg-[#14222b] text-white">
              <Sigma size={21} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5c717c]">OperatorLab Integral</p>
              <h1 className="text-2xl font-semibold">{method.name} geometriyasi</h1>
            </div>
          </div>

          <OperatorFamilyNav
            current="integral"
            onSwitchToOde={onSwitchToOde}
            onSwitchToPde={onSwitchToPde}
            onSwitchToCustom={onSwitchToCustom}
            onOpenFamily={onOpenFamily}
          />

          <IntegralKindTabs activeKind={activeKind} onSetKind={onSetKind} />

          <div className="mt-6 space-y-5">
            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="text-sm font-semibold text-[#31424b]">Integral metodi</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {integrationMethods.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setMethodId(item.id);
                      setUseCustomMethod(false);
                    }}
                    className={`min-h-10 rounded border px-3 text-left text-sm font-medium transition ${
                      !useCustomMethod && item.id === methodId ? "border-[#14222b] bg-[#14222b] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setUseCustomMethod(true)}
                  className={`min-h-10 rounded border px-3 text-left text-sm font-medium transition ${
                    useCustomMethod ? "border-[#be123c] bg-[#be123c] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
                  }`}
                >
                  Custom compiled
                </button>
              </div>
            </div>

            <CustomIntegralMethodCard
              title="Custom area method"
              value={customMethodInput}
              onChange={setCustomMethodInput}
              active={useCustomMethod}
              onActivate={() => setUseCustomMethod(true)}
              summary={`${customMethod.method.name} | confidence ${(customMethod.confidence * 100).toFixed(0)}%`}
              details={customMethod.notes}
              parsed={customMethod.parsed}
              execution={customMethod.execution}
            />

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="text-sm font-semibold text-[#31424b]">Funksiya</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {integrationExamples.map((item) => (
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
                <FunctionSquare size={17} />
                Model
              </div>
              <div className="mt-3 space-y-2 font-mono text-[13px] leading-6 text-[#20303a]">
                <p>{example.formula}</p>
                <p>{method.formula}</p>
                <p>{method.order}</p>
              </div>

              <label htmlFor="panels" className="mt-4 flex items-center justify-between text-sm font-semibold text-[#31424b]">
                {method.category === "stochastic" ? "Sample budget" : "Panel soni"}
                <span className="font-mono text-[#0f766e]">n = {panels}</span>
              </label>
              <input
                id="panels"
                type="range"
                min={example.minPanels}
                max={example.maxPanels}
                step="1"
                value={panels}
                onChange={(event) => setPanels(Number(event.target.value))}
                className="mt-4 w-full accent-[#0f766e]"
              />

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={reset}
                  className="flex h-9 items-center gap-2 rounded border border-[#cfd9dd] px-3 text-sm font-medium hover:bg-[#eef4f5]"
                >
                  <RotateCcw size={16} />
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setShowComparison((value) => !value)}
                  className={`flex h-9 items-center gap-2 rounded border px-3 text-sm font-medium ${
                    showComparison ? "border-[#334155] bg-[#edf2f7]" : "border-[#cfd9dd] hover:bg-[#eef4f5]"
                  }`}
                >
                  <GitCompare size={16} />
                  Overlay
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Metric label="Numeric" value={format(trace.numericValue)} />
              <Metric label="Exact" value={format(trace.exactValue)} />
              <Metric label="Abs error" value={trace.absError.toExponential(2)} />
              <Metric label="Sensitivity" value={trace.sensitivity.toExponential(2)} />
              <Metric label="Peak local" value={trace.peakPanelError.toExponential(2)} />
              <Metric label="Std err" value={stderrValue} />
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <BarChart3 size={17} />
                Error convergence
              </div>
              <ConvergenceGraph convergence={convergence} currentPanels={trace.panelCount} currentMethodId={method.id} currentError={trace.absError} />
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <GitCompare size={17} />
                Method comparison
              </div>
              <div className="mt-3 space-y-2 text-xs">
                {[trace, ...comparisonTraces].map((item) => (
                  <div key={item.metadata.methodId} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded border border-[#e2e8f0] px-2 py-2">
                    <span className="truncate font-medium text-[#31424b]">{item.metadata.methodName}</span>
                    <span className="font-mono text-[#0f766e]">{item.absError.toExponential(1)}</span>
                    <span className="font-mono text-[#be185d]">{item.metadata.category}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <AreaChart size={17} />
                Geometrik talqin
              </div>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{method.geometry}</p>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{example.interpretation}</p>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">
                Bu yerda 2D ko'rinish aniqroq: egri chiziq, panel replacement va sample nuqtalari integral xatosini ortiqcha kamera murakkabligisiz ko'rsatadi.
              </p>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <TrendingUp size={17} />
                Benchmark
              </div>
              <CompactBenchmarkSummary rows={benchmarkRows} methodName={trace.metadata.methodName} wins={benchmarkSummary.wins} losses={benchmarkSummary.losses} />
              <BenchmarkLink href={`/analyzer/benchmarks?family=integral&kind=area&method=${encodeURIComponent(useCustomMethod ? customMethod.baseMethodId : method.id)}&example=${encodeURIComponent(example.id)}&panels=${panels}${useCustomMethod ? `&formula=${encodeURIComponent(customMethodInput)}` : ""}`} />
            </div>
          </div>
        </aside>

        <div className="relative order-1 min-h-0 overflow-hidden bg-[#071115] lg:order-2">
          <IntegrationScene
            className="absolute inset-0"
            trace={trace}
            comparisonTraces={comparisonTraces.map((item) => ({
              id: item.metadata.methodId,
              name: item.metadata.methodName,
              color: integrationMethods.find((methodItem) => methodItem.id === item.metadata.methodId)?.color ?? "#cbd5e1",
              trace: item,
            }))}
            showComparison={showComparison}
          />
          <div className="pointer-events-none absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-2 text-xs font-medium">
            <span className="rounded bg-[#38bdf8] px-2 py-1 text-[#082f49]">2D analyzer</span>
            <span className="rounded px-2 py-1 text-[#111827]" style={{ background: method.color }}>
              {method.name}
            </span>
            <span className="rounded bg-[#dcfce7] px-2 py-1 text-[#166534]">{densityLabel}</span>
            {showComparison ? <span className="rounded bg-[#e2e8f0] px-2 py-1 text-[#334155]">comparison overlay</span> : null}
          </div>
          <div className="pointer-events-none absolute bottom-4 left-4 max-w-2xl rounded bg-black/35 px-3 py-2 text-sm leading-6 text-[#f3e8d1] backdrop-blur-sm">
            Adaptive metod qiyin joylarda panelni maydalaydi, Gauss va Clenshaw-Curtis sample joylashuvi bilan yutadi, Monte Carlo esa statistik xatolik bilan ko'rinadi.
          </div>
        </div>
      </section>
    </main>
  );
}

function SurfaceIntegralLab({
  activeKind,
  onSetKind,
  onSwitchToOde,
  onSwitchToPde,
  onSwitchToCustom,
  onOpenFamily,
}: IntegralLabProps & { activeKind: IntegralKind; onSetKind: (kind: IntegralKind) => void }) {
  const [methodId, setMethodId] = useState<SurfaceIntegrationMethodId>("surface-midpoint");
  const [customMethodInput, setCustomMethodInput] = useState("tensor gauss surface");
  const [useCustomMethod, setUseCustomMethod] = useState(false);
  const [exampleId, setExampleId] = useState<SurfaceIntegralExampleId>("surface-wave");
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [resolutionByExample, setResolutionByExample] = useState<Record<SurfaceIntegralExampleId, number>>({
    "surface-wave": surfaceIntegralExamples[0].defaultResolution,
    "saddle-sheet": surfaceIntegralExamples[1].defaultResolution,
    "ridge-surface": surfaceIntegralExamples[2].defaultResolution,
  });
  const customMethod = useMemo(() => compileCustomSurfaceIntegralMethod(customMethodInput), [customMethodInput]);
  const presetMethod = surfaceIntegrationMethods.find((item) => item.id === methodId)!;
  const method = useCustomMethod ? customMethod.method : presetMethod;
  const example = surfaceIntegralExamples.find((item) => item.id === exampleId)!;
  const resolution = resolutionByExample[exampleId];
  const trace = useMemo(() => buildSurfaceIntegralTrace(method, example, resolution), [example, method, resolution]);
  const convergence = useMemo(
    () =>
      buildResolutionConvergence(
        (value) => {
          const next = buildSurfaceIntegralTrace(method, example, value);
          return { resolution: next.resolution, absError: next.absError };
        },
        example.minResolution,
        example.maxResolution,
      ),
    [example, method],
  );
  const benchmarkRows = useMemo(
    () => buildSurfaceIntegralBenchmarkRows(trace, surfaceIntegrationMethods.filter((item) => item.id !== (useCustomMethod ? customMethod.baseMethodId : method.id)).map((item) => buildSurfaceIntegralTrace(item, example, resolution))),
    [customMethod.baseMethodId, example, method.id, resolution, trace, useCustomMethod],
  );
  const benchmarkSummary = useMemo(() => summarizeBenchmark(benchmarkRows, trace.metadata.methodName), [benchmarkRows, trace.metadata.methodName]);

  function setResolution(value: number) {
    setResolutionByExample((current) => ({ ...current, [exampleId]: value }));
  }

  return (
    <MultiDimensionalIntegralLayout
      activeKind={activeKind}
      convergence={convergence}
      currentError={trace.absError}
      currentResolution={trace.resolution}
      exactValue={trace.exactValue}
      formula={example.formula}
      interpretation={example.interpretation}
      metricLabel={`${method.name} | samples ${trace.sampleCount}`}
      numericValue={trace.numericValue}
      sampleCount={trace.sampleCount}
      sensitivity={trace.sensitivity}
      benchmarkRows={benchmarkRows}
      benchmarkMethodName={trace.metadata.methodName}
      benchmarkWins={benchmarkSummary.wins}
      benchmarkLosses={benchmarkSummary.losses}
      benchmarkHref={`/analyzer/benchmarks?family=integral&kind=surface&method=${encodeURIComponent(useCustomMethod ? customMethod.baseMethodId : method.id)}&example=${encodeURIComponent(example.id)}&resolution=${resolution}${useCustomMethod ? `&formula=${encodeURIComponent(customMethodInput)}` : ""}`}
      onReset={() => setResolution(example.defaultResolution)}
      onToggleAnalysis={() => setShowAnalysis((value) => !value)}
      onSetKind={onSetKind}
      onSwitchToOde={onSwitchToOde}
      onSwitchToPde={onSwitchToPde}
      onSwitchToCustom={onSwitchToCustom}
      rangeLabel={`${method.name} | mesh ${trace.resolution}x${trace.resolution}`}
      resolution={resolution}
      scene={<MultiIntegralScene className="absolute inset-0" kind="surface" showAnalysis={showAnalysis} trace={trace} />}
      showAnalysis={showAnalysis}
      title={`${example.shortName} sirt integrali`}
      minResolution={example.minResolution}
      maxResolution={example.maxResolution}
      onResolutionChange={setResolution}
    >
      <div className="rounded border border-[#dce4e7] bg-white p-4">
        <div className="text-sm font-semibold text-[#31424b]">Surface method</div>
        <div className="mt-3 grid grid-cols-1 gap-2">
          {surfaceIntegrationMethods.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setMethodId(item.id);
                setUseCustomMethod(false);
              }}
              className={`min-h-10 rounded border px-3 text-left text-sm font-medium transition ${
                !useCustomMethod && item.id === methodId ? "border-[#14222b] bg-[#14222b] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
              }`}
            >
              {item.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setUseCustomMethod(true)}
            className={`min-h-10 rounded border px-3 text-left text-sm font-medium transition ${
              useCustomMethod ? "border-[#be123c] bg-[#be123c] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
            }`}
          >
            Custom compiled
          </button>
        </div>
      </div>
      <CustomIntegralMethodCard
        title="Custom surface method"
        value={customMethodInput}
        onChange={setCustomMethodInput}
        active={useCustomMethod}
        onActivate={() => setUseCustomMethod(true)}
        summary={`${customMethod.method.name} | confidence ${(customMethod.confidence * 100).toFixed(0)}%`}
        details={customMethod.notes}
        parsed={customMethod.parsed}
        execution={customMethod.execution}
      />
      <div className="rounded border border-[#dce4e7] bg-white p-4">
        <div className="text-sm font-semibold text-[#31424b]">Surface misoli</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {surfaceIntegralExamples.map((item) => (
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
    </MultiDimensionalIntegralLayout>
  );
}

function VolumeIntegralLab({
  activeKind,
  onSetKind,
  onSwitchToOde,
  onSwitchToPde,
  onSwitchToCustom,
  onOpenFamily,
}: IntegralLabProps & { activeKind: IntegralKind; onSetKind: (kind: IntegralKind) => void }) {
  const [methodId, setMethodId] = useState<VolumeIntegrationMethodId>("volume-midpoint");
  const [customMethodInput, setCustomMethodInput] = useState("tensor gauss volume");
  const [useCustomMethod, setUseCustomMethod] = useState(false);
  const [exampleId, setExampleId] = useState<VolumeIntegralExampleId>("paraboloid-solid");
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [resolutionByExample, setResolutionByExample] = useState<Record<VolumeIntegralExampleId, number>>({
    "paraboloid-solid": volumeIntegralExamples[0].defaultResolution,
    "wave-solid": volumeIntegralExamples[1].defaultResolution,
    "ridge-solid": volumeIntegralExamples[2].defaultResolution,
  });
  const customMethod = useMemo(() => compileCustomVolumeIntegralMethod(customMethodInput), [customMethodInput]);
  const presetMethod = volumeIntegrationMethods.find((item) => item.id === methodId)!;
  const method = useCustomMethod ? customMethod.method : presetMethod;
  const example = volumeIntegralExamples.find((item) => item.id === exampleId)!;
  const resolution = resolutionByExample[exampleId];
  const trace = useMemo(() => buildVolumeIntegralTrace(method, example, resolution), [example, method, resolution]);
  const convergence = useMemo(
    () =>
      buildResolutionConvergence(
        (value) => {
          const next = buildVolumeIntegralTrace(method, example, value);
          return { resolution: next.resolution, absError: next.absError };
        },
        example.minResolution,
        example.maxResolution,
      ),
    [example, method],
  );
  const benchmarkRows = useMemo(
    () => buildVolumeIntegralBenchmarkRows(trace, volumeIntegrationMethods.filter((item) => item.id !== (useCustomMethod ? customMethod.baseMethodId : method.id)).map((item) => buildVolumeIntegralTrace(item, example, resolution))),
    [customMethod.baseMethodId, example, method.id, resolution, trace, useCustomMethod],
  );
  const benchmarkSummary = useMemo(() => summarizeBenchmark(benchmarkRows, trace.metadata.methodName), [benchmarkRows, trace.metadata.methodName]);

  function setResolution(value: number) {
    setResolutionByExample((current) => ({ ...current, [exampleId]: value }));
  }

  return (
    <MultiDimensionalIntegralLayout
      activeKind={activeKind}
      convergence={convergence}
      currentError={trace.absError}
      currentResolution={trace.resolution}
      exactValue={trace.exactValue}
      formula={example.formula}
      interpretation={example.interpretation}
      metricLabel={`${method.name} | samples ${trace.sampleCount}`}
      numericValue={trace.numericValue}
      sampleCount={trace.sampleCount}
      sensitivity={trace.sensitivity}
      benchmarkRows={benchmarkRows}
      benchmarkMethodName={trace.metadata.methodName}
      benchmarkWins={benchmarkSummary.wins}
      benchmarkLosses={benchmarkSummary.losses}
      benchmarkHref={`/analyzer/benchmarks?family=integral&kind=volume&method=${encodeURIComponent(useCustomMethod ? customMethod.baseMethodId : method.id)}&example=${encodeURIComponent(example.id)}&resolution=${resolution}${useCustomMethod ? `&formula=${encodeURIComponent(customMethodInput)}` : ""}`}
      onReset={() => setResolution(example.defaultResolution)}
      onToggleAnalysis={() => setShowAnalysis((value) => !value)}
      onSetKind={onSetKind}
      onSwitchToOde={onSwitchToOde}
      onSwitchToPde={onSwitchToPde}
      onSwitchToCustom={onSwitchToCustom}
      rangeLabel={`${method.name} | columns ${trace.resolution}x${trace.resolution}`}
      resolution={resolution}
      scene={<MultiIntegralScene className="absolute inset-0" kind="volume" showAnalysis={showAnalysis} trace={trace} />}
      showAnalysis={showAnalysis}
      title={`${example.shortName} hajm integrali`}
      minResolution={example.minResolution}
      maxResolution={example.maxResolution}
      onResolutionChange={setResolution}
    >
      <div className="rounded border border-[#dce4e7] bg-white p-4">
        <div className="text-sm font-semibold text-[#31424b]">Volume method</div>
        <div className="mt-3 grid grid-cols-1 gap-2">
          {volumeIntegrationMethods.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setMethodId(item.id);
                setUseCustomMethod(false);
              }}
              className={`min-h-10 rounded border px-3 text-left text-sm font-medium transition ${
                !useCustomMethod && item.id === methodId ? "border-[#14222b] bg-[#14222b] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
              }`}
            >
              {item.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setUseCustomMethod(true)}
            className={`min-h-10 rounded border px-3 text-left text-sm font-medium transition ${
              useCustomMethod ? "border-[#be123c] bg-[#be123c] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
            }`}
          >
            Custom compiled
          </button>
        </div>
      </div>
      <CustomIntegralMethodCard
        title="Custom volume method"
        value={customMethodInput}
        onChange={setCustomMethodInput}
        active={useCustomMethod}
        onActivate={() => setUseCustomMethod(true)}
        summary={`${customMethod.method.name} | confidence ${(customMethod.confidence * 100).toFixed(0)}%`}
        details={customMethod.notes}
        parsed={customMethod.parsed}
        execution={customMethod.execution}
      />
      <div className="rounded border border-[#dce4e7] bg-white p-4">
        <div className="text-sm font-semibold text-[#31424b]">Volume misoli</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {volumeIntegralExamples.map((item) => (
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
    </MultiDimensionalIntegralLayout>
  );
}

function MultiDimensionalIntegralLayout({
  activeKind,
  children,
  convergence,
  currentError,
  currentResolution,
  exactValue,
  formula,
  interpretation,
  maxResolution,
  metricLabel,
  minResolution,
  numericValue,
  sampleCount,
  sensitivity,
  benchmarkRows,
  benchmarkMethodName,
  benchmarkWins,
  benchmarkLosses,
  benchmarkHref,
  onReset,
  onResolutionChange,
  onSetKind,
  onSwitchToOde,
  onSwitchToPde,
  onSwitchToCustom,
  onOpenFamily,
  onToggleAnalysis,
  rangeLabel,
  resolution,
  scene,
  showAnalysis,
  title,
}: IntegralLabProps & {
  activeKind: IntegralKind;
  children: ReactNode;
  convergence: Array<{ resolution: number; absError: number }>;
  currentError: number;
  currentResolution: number;
  exactValue: number;
  formula: string;
  interpretation: string;
  maxResolution: number;
  metricLabel: string;
  minResolution: number;
  numericValue: number;
  sampleCount?: number;
  sensitivity?: number;
  benchmarkRows: import("./analyzer/benchmark-utils").BenchmarkRow[];
  benchmarkMethodName: string;
  benchmarkWins: number;
  benchmarkLosses: number;
  benchmarkHref: string;
  onReset: () => void;
  onResolutionChange: (value: number) => void;
  onSetKind: (kind: IntegralKind) => void;
  rangeLabel: string;
  resolution: number;
  scene: ReactNode;
  showAnalysis: boolean;
  title: string;
  onToggleAnalysis: () => void;
}) {
  return (
    <main className="h-screen overflow-hidden bg-[#f4f7f8] text-[#152026]">
      <section className="grid h-screen grid-rows-[minmax(0,52vh)_minmax(0,48vh)] overflow-hidden lg:grid-cols-[430px_1fr] lg:grid-rows-1">
        <aside className="relative z-10 order-2 min-h-0 overflow-y-auto border-t border-[#d8e0e3] bg-[#fbfcfc] p-5 lg:order-1 lg:h-screen lg:border-r lg:border-t-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded bg-[#14222b] text-white">
              <Sigma size={21} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5c717c]">OperatorLab Integral</p>
              <h1 className="text-2xl font-semibold">{title}</h1>
            </div>
          </div>

          <OperatorFamilyNav
            current="integral"
            onSwitchToOde={onSwitchToOde}
            onSwitchToPde={onSwitchToPde}
            onSwitchToCustom={onSwitchToCustom}
            onOpenFamily={onOpenFamily}
          />

          <IntegralKindTabs activeKind={activeKind} onSetKind={onSetKind} />

          <div className="mt-6 space-y-5">
            {children}

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <FunctionSquare size={17} />
                Model
              </div>
              <div className="mt-3 space-y-2 font-mono text-[13px] leading-6 text-[#20303a]">
                <p>{formula}</p>
                <p>{metricLabel}</p>
                <p>{rangeLabel}</p>
              </div>

              <label htmlFor="resolution" className="mt-4 flex items-center justify-between text-sm font-semibold text-[#31424b]">
                Resolution
                <span className="font-mono text-[#0f766e]">r = {currentResolution}</span>
              </label>
              <input
                id="resolution"
                type="range"
                min={minResolution}
                max={maxResolution}
                step="1"
                value={resolution}
                onChange={(event) => onResolutionChange(Number(event.target.value))}
                className="mt-4 w-full accent-[#0f766e]"
              />

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onReset}
                  className="flex h-9 items-center gap-2 rounded border border-[#cfd9dd] px-3 text-sm font-medium hover:bg-[#eef4f5]"
                >
                  <RotateCcw size={16} />
                  Reset
                </button>
                <button
                  type="button"
                  onClick={onToggleAnalysis}
                  className={`flex h-9 items-center gap-2 rounded border px-3 text-sm font-medium ${
                    showAnalysis ? "border-[#0f766e] bg-[#e8f7f4]" : "border-[#cfd9dd] hover:bg-[#eef4f5]"
                  }`}
                >
                  <ScanSearch size={16} />
                  Analysis
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Metric label="Numeric" value={format(numericValue)} />
              <Metric label="Exact" value={format(exactValue)} />
              <Metric label="Abs error" value={currentError.toExponential(2)} />
              <Metric label="Samples" value={`${sampleCount ?? currentResolution * currentResolution}`} />
              <Metric label="Sensitivity" value={(sensitivity ?? 0).toExponential(2)} />
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <BarChart3 size={17} />
                Resolution convergence
              </div>
              <ResolutionConvergenceGraph convergence={convergence} currentError={currentError} currentResolution={currentResolution} />
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <AreaChart size={17} />
                Geometrik talqin
              </div>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{interpretation}</p>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">
                Rang/opacity sample qiymatini, cell yoki column esa integral domain qanday diskret obyektlarga bo‘linayotganini ko‘rsatadi.
              </p>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <TrendingUp size={17} />
                Benchmark
              </div>
              <CompactBenchmarkSummary rows={benchmarkRows} methodName={benchmarkMethodName} wins={benchmarkWins} losses={benchmarkLosses} />
              <BenchmarkLink href={benchmarkHref} />
            </div>
          </div>
        </aside>

        <div className="relative order-1 min-h-0 overflow-hidden bg-[#071115] lg:order-2">
          {scene}
          <div className="pointer-events-none absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-2 text-xs font-medium">
            <span className="rounded bg-[#38bdf8] px-2 py-1 text-[#082f49]">{activeKind}</span>
            <span className="rounded bg-[#e2e8f0] px-2 py-1 text-[#334155]">{rangeLabel}</span>
          </div>
          <div className="pointer-events-none absolute bottom-4 left-4 max-w-xl rounded bg-black/35 px-3 py-2 text-sm leading-6 text-[#d7e3ea] backdrop-blur-sm">
            Method sample patterni va mesh/column diskretizatsiyasi sahnada alohida ko'rinadi. Hover qilsangiz qaysi element nima ekanini ko'rasiz.
          </div>
        </div>
      </section>
    </main>
  );
}

function IntegralKindTabs({ activeKind, onSetKind }: { activeKind: IntegralKind; onSetKind: (kind: IntegralKind) => void }) {
  const items: Array<{ id: IntegralKind; label: string }> = [
    { id: "area", label: "Area" },
    { id: "surface", label: "Surface" },
    { id: "volume", label: "Volume" },
  ];

  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSetKind(item.id)}
          className={`h-9 rounded border px-3 text-sm font-medium ${
            item.id === activeKind ? "border-[#0f766e] bg-[#0f766e] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function OperatorFamilyNav({
  current,
  onSwitchToOde,
  onSwitchToPde,
  onSwitchToCustom,
  onOpenFamily,
}: {
  current: "integral";
  onSwitchToOde: () => void;
  onSwitchToPde: () => void;
  onSwitchToCustom: () => void;
  onOpenFamily?: (familyId: string) => void;
}) {
  const items = [
    { id: "ode", label: "ODE", icon: <Box size={16} /> },
    { id: "integral", label: "Integral", icon: <Sigma size={16} /> },
    { id: "pde", label: "PDE", icon: <Thermometer size={16} /> },
    { id: "matrix", label: "Matrix", icon: <GitCompare size={16} /> },
    { id: "root-finding", label: "Root", icon: <Crosshair size={16} /> },
    { id: "optimization", label: "Optim", icon: <TrendingUp size={16} /> },
    { id: "probability", label: "Prob", icon: <Activity size={16} /> },
    { id: "interpolation", label: "Interp", icon: <Waves size={16} /> },
    { id: "custom", label: "Custom", icon: <Sparkles size={16} /> },
  ];

  function openFamily(id: string) {
    if (id === "ode") {
      onSwitchToOde();
      return;
    }

    if (id === "pde") {
      onSwitchToPde();
      return;
    }

    if (id === "custom") {
      onSwitchToCustom();
      return;
    }

    if (id !== "integral" && onOpenFamily) {
      onOpenFamily(id);
    }
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      {items.map((item) => {
        const active = item.id === current;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => openFamily(item.id)}
            className={`flex h-9 items-center justify-center gap-2 rounded px-3 text-sm font-medium ${
              active ? "bg-[#14222b] text-white" : "border border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function CustomIntegralMethodCard({
  title,
  value,
  onChange,
  active,
  onActivate,
  summary,
  details,
  parsed,
  execution,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  active: boolean;
  onActivate: () => void;
  summary: string;
  details: string[];
  parsed?: Record<string, number | string | boolean>;
  execution?: "matched" | "parametric-executable" | "formula-executable";
}) {
  const parsedEntries = Object.entries(parsed ?? {}).slice(0, 6);
  const executionLabel =
    execution === "formula-executable"
      ? "Formula executable"
      : execution === "parametric-executable"
        ? "Parametric executable"
        : "Family matched";
  return (
    <div className="rounded border border-[#dce4e7] bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
        <Sparkles size={16} />
        {title}
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        className="mt-3 h-24 w-full resize-none rounded border border-[#cfd9dd] bg-[#071115] p-3 font-mono text-sm leading-6 text-[#d7e3ea] outline-none focus:border-[#0f766e]"
      />
      <div className="mt-3 text-xs font-mono text-[#40525c]">{summary}</div>
      <div className="mt-2 inline-flex rounded bg-[#eef4f5] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#51636c]">
        {executionLabel}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {details.slice(0, 3).map((item) => (
          <span key={item} className="rounded bg-[#eef4f5] px-2 py-1 text-[11px] font-medium text-[#40525c]">
            {item}
          </span>
        ))}
      </div>
      {parsedEntries.length > 0 ? (
        <div className="mt-3 rounded border border-[#dbe5ea] bg-[#f8fbfc] p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#647780]">Compiled parameters</div>
          <div className="mt-2 flex flex-wrap gap-2 font-mono text-[11px] text-[#31424b]">
            {parsedEntries.map(([key, item]) => (
              <span key={key} className="rounded bg-white px-2 py-1 shadow-sm ring-1 ring-[#dbe5ea]">
                {key}={typeof item === "number" ? item.toFixed(4).replace(/\.?0+$/, "") : String(item)}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={onActivate}
        className={`mt-3 flex h-9 w-full items-center justify-center gap-2 rounded border px-3 text-sm font-medium ${
          active ? "border-[#be123c] bg-[#be123c] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
        }`}
      >
        <Sparkles size={15} />
        {active ? "Custom method active" : "Use custom method"}
      </button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[#dce4e7] bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#647780]">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function ConvergenceGraph({
  convergence,
  currentError,
  currentMethodId,
  currentPanels,
}: {
  convergence: IntegrationConvergenceTrace[];
  currentError: number;
  currentMethodId: string;
  currentPanels: number;
}) {
  const width = 340;
  const height = 150;
  const pad = 18;
  const all = convergence.flatMap((item) => item.samples);
  const minPanels = Math.min(...all.map((sample) => sample.panels));
  const maxPanels = Math.max(...all.map((sample) => sample.panels));
  const minError = Math.max(1e-10, Math.min(...all.map((sample) => sample.absError)));
  const maxError = Math.max(minError * 10, Math.max(...all.map((sample) => sample.absError)));
  const x = (panels: number) => pad + ((panels - minPanels) / Math.max(maxPanels - minPanels, 1e-9)) * (width - pad * 2);
  const y = (error: number) => {
    const low = Math.log10(minError);
    const high = Math.log10(maxError);
    return height - pad - ((Math.log10(Math.max(error, minError)) - low) / Math.max(high - low, 1e-9)) * (height - pad * 2);
  };
  const currentX = x(currentPanels);
  const currentY = y(currentError);
  const currentColor = convergence.find((item) => item.methodId === currentMethodId)?.color ?? "#f8fafc";

  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full rounded bg-[#071115]">
        {[0, 1, 2, 3].map((line) => (
          <line key={line} x1={pad} x2={width - pad} y1={pad + line * 34} y2={pad + line * 34} stroke="#18313a" />
        ))}
        {convergence.map((item) => (
          <path
            key={item.methodId}
            d={item.samples
              .map((sample, index) => `${index === 0 ? "M" : "L"} ${x(sample.panels).toFixed(2)} ${y(sample.absError).toFixed(2)}`)
              .join(" ")}
            fill="none"
            stroke={item.color}
            strokeWidth="2"
            strokeOpacity="0.86"
          />
        ))}
        <line x1={currentX} x2={currentX} y1={pad} y2={height - pad} stroke="#f8fafc" strokeDasharray="4 4" strokeOpacity="0.42" />
        <circle cx={currentX} cy={currentY} r="5" fill={currentColor} stroke="#f8fafc" strokeWidth="1.4">
          <title>{`current n=${currentPanels}, error=${currentError.toExponential(3)}`}</title>
        </circle>
      </svg>
      <div className="mt-2 font-mono text-xs text-[#50626b]">current: n={currentPanels}, error={currentError.toExponential(3)}</div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {convergence.map((item) => (
          <span key={item.methodId} className="flex items-center gap-1 text-[#50626b]">
            <span className="inline-block size-2 rounded-full" style={{ background: item.color }} />
            {item.methodName}
          </span>
        ))}
      </div>
    </div>
  );
}

function ResolutionConvergenceGraph({
  convergence,
  currentError,
  currentResolution,
}: {
  convergence: Array<{ resolution: number; absError: number }>;
  currentError: number;
  currentResolution: number;
}) {
  const width = 340;
  const height = 150;
  const pad = 18;
  const minResolution = Math.min(...convergence.map((sample) => sample.resolution));
  const maxResolution = Math.max(...convergence.map((sample) => sample.resolution));
  const minError = Math.max(1e-12, Math.min(...convergence.map((sample) => sample.absError), currentError));
  const maxError = Math.max(minError * 10, Math.max(...convergence.map((sample) => sample.absError), currentError));
  const x = (resolution: number) => pad + ((resolution - minResolution) / Math.max(maxResolution - minResolution, 1e-9)) * (width - pad * 2);
  const y = (error: number) => {
    const low = Math.log10(minError);
    const high = Math.log10(maxError);
    return height - pad - ((Math.log10(Math.max(error, minError)) - low) / Math.max(high - low, 1e-9)) * (height - pad * 2);
  };
  const currentX = x(currentResolution);
  const currentY = y(currentError);

  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full rounded bg-[#071115]">
        {[0, 1, 2, 3].map((line) => (
          <line key={line} x1={pad} x2={width - pad} y1={pad + line * 34} y2={pad + line * 34} stroke="#18313a" />
        ))}
        <path
          d={convergence.map((sample, index) => `${index === 0 ? "M" : "L"} ${x(sample.resolution).toFixed(2)} ${y(sample.absError).toFixed(2)}`).join(" ")}
          fill="none"
          stroke="#0f766e"
          strokeWidth="2.2"
          strokeOpacity="0.9"
        />
        <line x1={currentX} x2={currentX} y1={pad} y2={height - pad} stroke="#f8fafc" strokeDasharray="4 4" strokeOpacity="0.42" />
        <circle cx={currentX} cy={currentY} r="5" fill="#facc15" stroke="#f8fafc" strokeWidth="1.4">
          <title>{`current r=${currentResolution}, error=${currentError.toExponential(3)}`}</title>
        </circle>
      </svg>
      <div className="mt-2 font-mono text-xs text-[#50626b]">current: r={currentResolution}, error={currentError.toExponential(3)}</div>
    </div>
  );
}
