"use client";

import {
  buildEnergyProjectionSegments,
  buildPdeTrace,
  buildStabilityScan,
  buildTrace,
  createCustomThetaPdeMethod,
  createEnergyCorrectedEulerMethod,
  energyCorrectedEulerCode,
  format,
  oscillatorEnergy,
} from "@methodslab/methods-engine/core";
import { examples, methods, pdeExamples, pdeMethods } from "@methodslab/methods-engine/presets";
import { MethodScene, PdeScene } from "@methodslab/visual-engine/react";
import type { EnergySample, ExampleId, ExampleSpec, LayerSpec, MethodId, PdeExampleId, PdeMethodId, StabilityScanTrace } from "@methodslab/methods-engine/core";
import IntegralLab from "./integral-lab";
import {
  Activity,
  Box,
  Code2,
  Crosshair,
  Focus,
  GitCompare,
  Layers,
  Orbit,
  Play,
  RotateCcw,
  ScanSearch,
  Sparkles,
  Sigma,
  Thermometer,
  Braces,
  TrendingUp,
  Waves,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";

type EnergyGraphSeries = {
  id: string;
  name: string;
  color: string;
  samples: EnergySample[];
};

const overlayMethodIds = new Set<MethodId>(["euler", "rk4", "symplectic"]);
type LabMode = "ode" | "integral" | "pde" | "custom";

export default function MethodLab() {
  const [labMode, setLabMode] = useState<LabMode>("integral");

  if (labMode === "integral") {
    return <IntegralLab onSwitchToOde={() => setLabMode("ode")} onSwitchToPde={() => setLabMode("pde")} onSwitchToCustom={() => setLabMode("custom")} />;
  }

  if (labMode === "pde") {
    return <PdeLab onSwitchToIntegral={() => setLabMode("integral")} onSwitchToOde={() => setLabMode("ode")} onSwitchToCustom={() => setLabMode("custom")} />;
  }

  if (labMode === "custom") {
    return <CustomLab onOpenMode={setLabMode} />;
  }

  return <OdeLab onSwitchToIntegral={() => setLabMode("integral")} onSwitchToPde={() => setLabMode("pde")} onSwitchToCustom={() => setLabMode("custom")} />;
}

function OdeLab({ onSwitchToIntegral, onSwitchToPde, onSwitchToCustom }: { onSwitchToIntegral: () => void; onSwitchToPde: () => void; onSwitchToCustom: () => void }) {
  const [methodId, setMethodId] = useState<MethodId>("euler");
  const [exampleId, setExampleId] = useState<ExampleId>("oscillator");
  const [showField, setShowField] = useState(true);
  const [showStages, setShowStages] = useState(true);
  const [showComparison, setShowComparison] = useState(true);
  const [showStability, setShowStability] = useState(true);
  const [showJacobian, setShowJacobian] = useState(true);
  const [showLocalError, setShowLocalError] = useState(true);
  const [showCritical, setShowCritical] = useState(true);
  const [showProjection, setShowProjection] = useState(true);
  const [hybridGenerated, setHybridGenerated] = useState(false);
  const [errorGain, setErrorGain] = useState(3);
  const [stageFocus, setStageFocus] = useState(0.36);
  const [stepByExample, setStepByExample] = useState<Record<ExampleId, number>>({
    helix: examples[0].defaultStep,
    oscillator: examples[1].defaultStep,
  });

  const method = methods.find((item) => item.id === methodId)!;
  const example = examples.find((item) => item.id === exampleId)!;
  const step = stepByExample[exampleId];
  const targetEnergy = oscillatorEnergy(example.initial);
  const hybridMethod = useMemo(() => createEnergyCorrectedEulerMethod(targetEnergy), [targetEnergy]);
  const trace = useMemo(() => buildTrace(method, example, step), [method, example, step]);
  const eulerMethod = methods.find((item) => item.id === "euler")!;
  const overlayMethods = useMemo(() => methods.filter((item) => overlayMethodIds.has(item.id)), []);
  const eulerTrace = useMemo(() => buildTrace(eulerMethod, example, step), [eulerMethod, example, step]);
  const hybridTrace = useMemo(() => buildTrace(hybridMethod, example, step), [hybridMethod, example, step]);
  const projectionSegments = useMemo(
    () => (example.id === "oscillator" ? buildEnergyProjectionSegments(eulerTrace, hybridTrace, 22) : []),
    [eulerTrace, example.id, hybridTrace],
  );

  const comparisonTraces = useMemo(
    () => [
      ...overlayMethods
        .filter((item) => item.id !== methodId)
        .map((item) => ({
          id: item.id,
          name: item.name,
          color: item.color,
          trace: buildTrace(item, example, step),
        })),
      ...(hybridGenerated && methodId !== hybridMethod.id
        ? [
            {
              id: hybridMethod.id,
              name: hybridMethod.name,
              color: hybridMethod.color,
              trace: hybridTrace,
            },
          ]
        : []),
    ],
    [example, hybridGenerated, hybridMethod, hybridTrace, methodId, overlayMethods, step],
  );

  const energySeries = useMemo<EnergyGraphSeries[]>(
    () => [
      {
        id: "exact",
        name: "true flow",
        color: "#56b4e9",
        samples: buildExactEnergySeries(example),
      },
      ...overlayMethods.map((item) => ({
        id: item.id,
        name: item.name,
        color: item.color,
        samples: buildTrace(item, example, step).energySeries,
      })),
      ...(hybridGenerated
        ? [
            {
              id: hybridMethod.id,
              name: hybridMethod.name,
              color: hybridMethod.color,
              samples: hybridTrace.energySeries,
            },
          ]
        : []),
    ],
    [example, hybridGenerated, hybridMethod, hybridTrace, overlayMethods, step],
  );

  const stabilityScan = useMemo(
    () => buildStabilityScan(hybridGenerated ? [...overlayMethods, hybridMethod] : overlayMethods, example, 0.05, 3.2, 48),
    [example, hybridGenerated, hybridMethod, overlayMethods],
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
      projection: showProjection,
      errorGain,
      stepIndex,
    }),
    [
      errorGain,
      showComparison,
      showCritical,
      showField,
      showJacobian,
      showLocalError,
      showProjection,
      showStability,
      showStages,
      stepIndex,
    ],
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
    setShowProjection(true);
  }

  return (
    <main className="h-screen overflow-hidden bg-[#f4f7f8] text-[#152026]">
      <section className="grid h-screen grid-rows-[minmax(0,52vh)_minmax(0,48vh)] overflow-hidden lg:grid-cols-[430px_1fr] lg:grid-rows-1">
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

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" className="flex h-9 items-center justify-center gap-2 rounded bg-[#14222b] px-3 text-sm font-medium text-white">
              <Box size={16} />
              ODE
            </button>
            <button
              type="button"
              onClick={onSwitchToIntegral}
              className="flex h-9 items-center justify-center gap-2 rounded border border-[#cfd9dd] bg-white px-3 text-sm font-medium hover:bg-[#eef4f5]"
            >
              <Sigma size={16} />
              Integral
            </button>
          </div>
          <button
            type="button"
            onClick={onSwitchToPde}
            className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded border border-[#cfd9dd] bg-white px-3 text-sm font-medium hover:bg-[#eef4f5]"
          >
            <Thermometer size={16} />
            PDE
          </button>
          <button
            type="button"
            onClick={onSwitchToCustom}
            className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded border border-[#cfd9dd] bg-white px-3 text-sm font-medium hover:bg-[#eef4f5]"
          >
            <Sparkles size={16} />
            Custom
          </button>

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
                <span className="font-mono text-[#6d28d9]">
                  {stepIndex + 1}/{trace.steps.length}
                </span>
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
                <ToggleButton active={false} icon={<RotateCcw size={16} />} label="Reset" onClick={resetStep} />
                <ToggleButton active={showField} icon={<Play size={16} />} label="Maydon" onClick={() => setShowField((value) => !value)} />
                <ToggleButton active={showStages} icon={<Focus size={16} />} label="Stage" onClick={() => setShowStages((value) => !value)} />
                <ToggleButton active={showComparison} icon={<Layers size={16} />} label="Compare" onClick={() => setShowComparison((value) => !value)} />
                <ToggleButton active={showProjection} icon={<Zap size={16} />} label="Projection" onClick={() => setShowProjection((value) => !value)} />
                <ToggleButton active={showStability} icon={<Orbit size={16} />} label="Region" onClick={() => setShowStability((value) => !value)} />
                <ToggleButton active={showJacobian} icon={<ScanSearch size={16} />} label="Jacobian" onClick={() => setShowJacobian((value) => !value)} />
                <ToggleButton active={showLocalError} icon={<Waves size={16} />} label="Local error" onClick={() => setShowLocalError((value) => !value)} />
                <ToggleButton active={showCritical} icon={<Crosshair size={16} />} label="Critical" onClick={() => setShowCritical((value) => !value)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Metric label="Qadam" value={`${trace.points.length - 1}`} />
              <Metric label="Xato" value={format(trace.metrics.finalError)} />
              <Metric label={example.metricLabel} value={format(trace.metrics.metricValue)} />
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <TrendingUp size={17} />
                Energy graph
              </div>
              <EnergyGraph series={energySeries} targetEnergy={targetEnergy} />
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <Orbit size={17} />
                Stability map
              </div>
              <StabilityMap scan={stabilityScan} currentH={step} />
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                  <Sparkles size={17} />
                  Hybrid method demo
                </div>
                <button
                  type="button"
                  onClick={() => setHybridGenerated(true)}
                  className="flex h-9 items-center gap-2 rounded bg-[#14222b] px-3 text-sm font-medium text-white hover:bg-[#203342]"
                >
                  <Sparkles size={15} />
                  Create
                </button>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">
                Euler qadamidan keyin trajectory energiya sirtiga proyeksiya qilinadi: sariq arrowlar correction yo‘nalishini, sariq path esa resulting trajectoryni ko‘rsatadi.
              </p>
              {hybridGenerated ? (
                <div className="mt-4 rounded border border-[#d8e0e3] bg-[#0b1117] p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#dbeafe]">
                    <Code2 size={14} />
                    generated rule
                  </div>
                  <pre className="overflow-x-auto text-xs leading-5 text-[#d7e3ea]">{energyCorrectedEulerCode}</pre>
                </div>
              ) : null}
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <GitCompare size={17} />
                Geometrik talqin
              </div>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{method.geometry}</p>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{example.interpretation}</p>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">
                Overlay: true flow, Euler, RK4 va Symplectic Euler bitta sahnada solishtiriladi. Hybrid yoqilganda energy-corrected trajectory ham qo‘shiladi.
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
            projectionSegments={projectionSegments}
            layers={layers}
          />
          <div className="pointer-events-none absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-2 text-xs font-medium">
            <span className="rounded bg-[#38bdf8] px-2 py-1 text-[#082f49]">true flow</span>
            {overlayMethods.map((item) => (
              <span key={item.id} className="rounded px-2 py-1 text-[#111827]" style={{ background: item.color }}>
                {item.name}
              </span>
            ))}
            {hybridGenerated ? <span className="rounded bg-[#facc15] px-2 py-1 text-[#422006]">energy-corrected</span> : null}
            <span className="rounded bg-[#fed7aa] px-2 py-1 text-[#7c2d12]">critical</span>
          </div>
        </div>
      </section>
    </main>
  );
}

function PdeLab({ onSwitchToIntegral, onSwitchToOde, onSwitchToCustom }: { onSwitchToIntegral: () => void; onSwitchToOde: () => void; onSwitchToCustom: () => void }) {
  const [methodId, setMethodId] = useState<PdeMethodId>("ftcs");
  const [exampleId, setExampleId] = useState<PdeExampleId>("heated-string");
  const [theta, setTheta] = useState(0.5);
  const [cellsByExample, setCellsByExample] = useState<Record<string, number>>({
    "heated-string": pdeExamples[0].defaultCells,
    "double-bump": pdeExamples[1].defaultCells,
  });
  const [timeStepsByExample, setTimeStepsByExample] = useState<Record<string, number>>({
    "heated-string": pdeExamples[0].defaultTimeSteps,
    "double-bump": pdeExamples[1].defaultTimeSteps,
  });

  const example = pdeExamples.find((item) => item.id === exampleId)!;
  const presetMethod = pdeMethods.find((item) => item.id === methodId);
  const customMethod = useMemo(() => createCustomThetaPdeMethod(theta), [theta]);
  const method = presetMethod ?? customMethod;
  const cells = cellsByExample[exampleId];
  const timeSteps = timeStepsByExample[exampleId];
  const trace = useMemo(() => buildPdeTrace(method, example, cells, timeSteps), [cells, example, method, timeSteps]);
  const lastError = trace.errors.at(-1);

  return (
    <main className="h-screen overflow-hidden bg-[#f4f7f8] text-[#152026]">
      <section className="grid h-screen grid-rows-[minmax(0,52vh)_minmax(0,48vh)] overflow-hidden lg:grid-cols-[430px_1fr] lg:grid-rows-1">
        <aside className="order-2 min-h-0 overflow-y-auto border-t border-[#d8e0e3] bg-[#fbfcfc] p-5 lg:order-1 lg:h-screen lg:border-r lg:border-t-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded bg-[#14222b] text-white">
              <Thermometer size={21} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5c717c]">MethodsLab Visualizer</p>
              <h1 className="text-2xl font-semibold">{method.name} PDE laboratoriyasi</h1>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onSwitchToOde}
              className="flex h-9 items-center justify-center gap-2 rounded border border-[#cfd9dd] bg-white px-3 text-sm font-medium hover:bg-[#eef4f5]"
            >
              <Box size={16} />
              ODE
            </button>
            <button
              type="button"
              onClick={onSwitchToIntegral}
              className="flex h-9 items-center justify-center gap-2 rounded border border-[#cfd9dd] bg-white px-3 text-sm font-medium hover:bg-[#eef4f5]"
            >
              <Sigma size={16} />
              Integral
            </button>
            <button type="button" className="flex h-9 items-center justify-center gap-2 rounded bg-[#14222b] px-3 text-sm font-medium text-white">
              <Thermometer size={16} />
              PDE
            </button>
            <button
              type="button"
              onClick={onSwitchToCustom}
              className="flex h-9 items-center justify-center gap-2 rounded border border-[#cfd9dd] bg-white px-3 text-sm font-medium hover:bg-[#eef4f5]"
            >
              <Sparkles size={16} />
              Custom
            </button>
          </div>

          <div className="mt-6 space-y-5">
            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="text-sm font-semibold text-[#31424b]">Metod</div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {pdeMethods.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMethodId(item.id)}
                    className={`min-h-10 rounded border px-3 text-left text-sm font-medium ${
                      item.id === methodId ? "border-[#14222b] bg-[#14222b] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setMethodId("custom-theta")}
                  className={`min-h-10 rounded border px-3 text-left text-sm font-medium ${
                    methodId === "custom-theta" ? "border-[#ea580c] bg-[#ea580c] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
                  }`}
                >
                  Custom theta method
                </button>
              </div>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="text-sm font-semibold text-[#31424b]">PDE misoli</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {pdeExamples.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setExampleId(item.id)}
                    className={`min-h-10 rounded border px-3 text-left text-sm font-medium ${
                      item.id === exampleId ? "border-[#0f766e] bg-[#0f766e] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
                    }`}
                  >
                    {item.shortName}
                  </button>
                ))}
              </div>
            </div>

            {methodId === "custom-theta" ? (
              <div className="rounded border border-[#dce4e7] bg-white p-4">
                <label htmlFor="theta" className="flex items-center justify-between text-sm font-semibold text-[#31424b]">
                  Theta
                  <span className="font-mono text-[#ea580c]">{theta.toFixed(2)}</span>
                </label>
                <input
                  id="theta"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={theta}
                  onChange={(event) => setTheta(Number(event.target.value))}
                  className="mt-4 w-full accent-[#ea580c]"
                />
                <p className="mt-3 text-sm leading-6 text-[#50626b]">
                  `0` explicit FTCS tomoni, `0.5` Crank-Nicolson, `1` backward-Euler tomoni.
                </p>
              </div>
            ) : null}

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <Activity size={17} />
                PDE modeli
              </div>
              <div className="mt-3 space-y-2 font-mono text-[13px] leading-6 text-[#20303a]">
                <p>{example.equation}</p>
                <p>{method.formula}</p>
                <p>{method.stability}</p>
              </div>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <label htmlFor="cells" className="flex items-center justify-between text-sm font-semibold text-[#31424b]">
                Spatial cells
                <span className="font-mono text-[#0f766e]">{cells}</span>
              </label>
              <input
                id="cells"
                type="range"
                min={example.minCells}
                max={example.maxCells}
                step="1"
                value={cells}
                onChange={(event) => setCellsByExample((current) => ({ ...current, [exampleId]: Number(event.target.value) }))}
                className="mt-4 w-full accent-[#0f766e]"
              />

              <label htmlFor="timesteps" className="mt-4 flex items-center justify-between text-sm font-semibold text-[#31424b]">
                Time steps
                <span className="font-mono text-[#a21caf]">{timeSteps}</span>
              </label>
              <input
                id="timesteps"
                type="range"
                min={example.minTimeSteps}
                max={example.maxTimeSteps}
                step="1"
                value={timeSteps}
                onChange={(event) => setTimeStepsByExample((current) => ({ ...current, [exampleId]: Number(event.target.value) }))}
                className="mt-4 w-full accent-[#a21caf]"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Metric label="r" value={trace.r.toFixed(3)} />
              <Metric label="Final L2" value={lastError ? lastError.l2.toExponential(2) : "0"} />
              <Metric label="Final L∞" value={lastError ? lastError.linf.toExponential(2) : "0"} />
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <Code2 size={17} />
                Nima ko&apos;ryapmiz
              </div>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{method.geometry}</p>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{example.interpretation}</p>
            </div>
          </div>
        </aside>

        <div className="order-1 min-h-0 overflow-hidden bg-[#021017] lg:order-2">
          <PdeScene className="h-full w-full" trace={trace} />
        </div>
      </section>
    </main>
  );
}

type CustomSuggestion = {
  mode: LabMode;
  title: string;
  visual: string;
  reason: string;
  method: string;
};

function CustomLab({ onOpenMode }: { onOpenMode: (mode: LabMode) => void }) {
  const [formula, setFormula] = useState("u_t = 0.12 u_xx\nu(x,0)=sin(pi x)\nu(0,t)=u(1,t)=0");
  const suggestion = useMemo(() => suggestVisualizer(formula), [formula]);

  return (
    <main className="h-screen overflow-hidden bg-[#f4f7f8] text-[#152026]">
      <section className="grid h-screen grid-rows-[minmax(0,52vh)_minmax(0,48vh)] overflow-hidden lg:grid-cols-[430px_1fr] lg:grid-rows-1">
        <aside className="order-2 min-h-0 overflow-y-auto border-t border-[#d8e0e3] bg-[#fbfcfc] p-5 lg:order-1 lg:h-screen lg:border-r lg:border-t-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded bg-[#14222b] text-white">
              <Braces size={21} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5c717c]">MethodsLab Custom</p>
              <h1 className="text-2xl font-semibold">Custom metod/formula</h1>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onOpenMode("ode")} className="flex h-9 items-center justify-center gap-2 rounded border border-[#cfd9dd] bg-white px-3 text-sm font-medium hover:bg-[#eef4f5]"><Box size={16} />ODE</button>
            <button type="button" onClick={() => onOpenMode("integral")} className="flex h-9 items-center justify-center gap-2 rounded border border-[#cfd9dd] bg-white px-3 text-sm font-medium hover:bg-[#eef4f5]"><Sigma size={16} />Integral</button>
            <button type="button" onClick={() => onOpenMode("pde")} className="flex h-9 items-center justify-center gap-2 rounded border border-[#cfd9dd] bg-white px-3 text-sm font-medium hover:bg-[#eef4f5]"><Thermometer size={16} />PDE</button>
            <button type="button" className="flex h-9 items-center justify-center gap-2 rounded bg-[#14222b] px-3 text-sm font-medium text-white"><Sparkles size={16} />Custom</button>
          </div>

          <div className="mt-6 space-y-5">
            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="text-sm font-semibold text-[#31424b]">Formula yoki metod yozing</div>
              <textarea
                value={formula}
                onChange={(event) => setFormula(event.target.value)}
                spellCheck={false}
                className="mt-3 h-44 w-full resize-none rounded border border-[#cfd9dd] bg-[#071115] p-3 font-mono text-sm leading-6 text-[#d7e3ea] outline-none focus:border-[#0f766e]"
              />
              <p className="mt-3 text-sm leading-6 text-[#50626b]">
                Birinchi versiyada tizim formulani o‘qib, mos vizual oilani tanlaydi: trajectory, quadrature yoki heatmap/profile.
              </p>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <ScanSearch size={17} />
                Avtomatik tanlov
              </div>
              <div className="mt-3 space-y-2 text-sm leading-6 text-[#20303a]">
                <p><span className="font-semibold">Tur:</span> {suggestion.title}</p>
                <p><span className="font-semibold">Vizual:</span> {suggestion.visual}</p>
                <p><span className="font-semibold">Tavsiya metod:</span> {suggestion.method}</p>
                <p><span className="font-semibold">Sabab:</span> {suggestion.reason}</p>
              </div>
              <button
                type="button"
                onClick={() => onOpenMode(suggestion.mode)}
                className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded bg-[#14222b] px-3 text-sm font-medium text-white"
              >
                <Sparkles size={16} />
                {suggestion.title} visualizer&apos;ga o&apos;tish
              </button>
            </div>
          </div>
        </aside>

        <div className="order-1 min-h-0 overflow-hidden bg-[#021017] p-6 lg:order-2">
          <div className="grid h-full gap-4 lg:grid-cols-2">
            <div className="rounded border border-[#17313a] bg-[#03161d] p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7ea0ad]">Detected family</div>
              <div className="mt-3 text-3xl font-semibold text-white">{suggestion.title}</div>
              <p className="mt-4 text-sm leading-7 text-[#9fb3bb]">{suggestion.reason}</p>
            </div>
            <div className="rounded border border-[#17313a] bg-[#071922] p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7ea0ad]">Planned visual</div>
              <div className="mt-3 text-xl font-semibold text-white">{suggestion.visual}</div>
              <div className="mt-4 rounded border border-[#17313a] bg-black/30 p-4 font-mono text-sm leading-6 text-[#d7e3ea] whitespace-pre-wrap">
                {formula}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function suggestVisualizer(input: string): CustomSuggestion {
  const source = input.toLowerCase();
  if (source.includes("u_t") || source.includes("u_xx") || source.includes("partial") || source.includes("∂")) {
    return {
      mode: "pde",
      title: "PDE",
      visual: "space-time heatmap + final profile + error curve",
      reason: "Formulada vaqt bo‘yicha va fazo bo‘yicha hosilalar bor, demak bu evolyutsion maydon.",
      method: "Crank-Nicolson yoki FTCS",
    };
  }
  if (source.includes("int") || source.includes("∫") || source.includes("dA".toLowerCase()) || source.includes("dv")) {
    return {
      mode: "integral",
      title: "Integral",
      visual: "panels / surface mesh / volume columns",
      reason: "Matnda integral operatori yoki o‘lchov elementi ko‘rindi, demak yig‘indi-geometriya vizuali kerak.",
      method: "Simpson yoki Trapezoid",
    };
  }
  return {
    mode: "ode",
    title: "ODE",
    visual: "trajectory + vector field + stage lens",
    reason: "Ko‘rinishidan bu differensial oqim yoki step-by-step trajectory oilasiga yaqin.",
    method: "RK4 yoki Symplectic Euler",
  };
}

function ToggleButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-9 items-center gap-2 rounded border px-3 text-sm font-medium ${
        active ? "border-[#0f766e] bg-[#e8f7f4]" : "border-[#cfd9dd] hover:bg-[#eef4f5]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[#dce4e7] bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#647780]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function EnergyGraph({ series, targetEnergy }: { series: EnergyGraphSeries[]; targetEnergy: number }) {
  const all = series.flatMap((item) => item.samples);
  const minT = Math.min(...all.map((sample) => sample.t));
  const maxT = Math.max(...all.map((sample) => sample.t));
  const maxEnergy = Math.max(targetEnergy * 1.15, ...all.map((sample) => sample.value));
  const minEnergy = Math.min(targetEnergy * 0.85, ...all.map((sample) => sample.value));
  const width = 340;
  const height = 150;
  const pad = 18;
  const x = (t: number) => pad + ((t - minT) / Math.max(maxT - minT, 1e-9)) * (width - pad * 2);
  const y = (value: number) => height - pad - ((value - minEnergy) / Math.max(maxEnergy - minEnergy, 1e-9)) * (height - pad * 2);
  const targetY = y(targetEnergy);

  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full overflow-visible rounded bg-[#071115]">
        <line x1={pad} x2={width - pad} y1={targetY} y2={targetY} stroke="#d7dee4" strokeDasharray="4 4" strokeOpacity="0.42" />
        {series.map((item) => (
          <path
            key={item.id}
            d={item.samples.map((sample, index) => `${index === 0 ? "M" : "L"} ${x(sample.t).toFixed(2)} ${y(sample.value).toFixed(2)}`).join(" ")}
            fill="none"
            stroke={item.color}
            strokeWidth={item.id === "energy-corrected-euler" ? 2.4 : 1.8}
            strokeOpacity={item.id === "exact" ? 0.9 : 0.82}
          />
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {series.map((item) => (
          <span key={item.id} className="flex items-center gap-1 text-[#50626b]">
            <span className="inline-block size-2 rounded-full" style={{ background: item.color }} />
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function StabilityMap({ scan, currentH }: { scan: StabilityScanTrace[]; currentH: number }) {
  return (
    <div className="mt-3 space-y-3">
      {scan.map((row) => {
        const firstUnstable = row.samples.find((sample) => !sample.stable);
        const minH = row.samples[0]?.h ?? 0;
        const maxH = row.samples.at(-1)?.h ?? 1;
        const marker = `${Math.min(100, Math.max(0, ((currentH - minH) / Math.max(maxH - minH, 1e-9)) * 100))}%`;

        return (
          <div key={row.methodId}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-[#31424b]">{row.methodName}</span>
              <span className="font-mono text-[#647780]">{firstUnstable ? `unstable ~ h>${format(firstUnstable.h)}` : "bounded in scan"}</span>
            </div>
            <div className="relative flex h-4 overflow-hidden rounded bg-[#e7eef1]">
              {row.samples.map((sample) => (
                <span
                  key={`${row.methodId}-${sample.h}`}
                  className="h-full flex-1"
                  style={{
                    background: sample.stable ? row.color : "#ef4444",
                    opacity: sample.stable ? 0.72 : Math.min(0.95, 0.35 + Math.log10(sample.growth + 1) * 0.35),
                  }}
                />
              ))}
              <span className="absolute top-0 h-full w-0.5 bg-[#111827]" style={{ left: marker }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function buildExactEnergySeries(example: ExampleSpec): EnergySample[] {
  const samples = 220;
  return Array.from({ length: samples }, (_, index) => {
    const t = (example.endTime * index) / (samples - 1);
    return {
      index,
      t,
      value: oscillatorEnergy(example.exact(t)),
    };
  });
}
