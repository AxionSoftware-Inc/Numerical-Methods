"use client";

import {
  buildEnergyProjectionSegments,
  buildPdeTrace,
  buildStabilityScan,
  buildTrace,
  analyzeOperatorInput,
  buildOptimizationTrace,
  createCustomSchemeDraft,
  createCustomThetaPdeMethod,
  createEnergyCorrectedEulerMethod,
  buildProbabilityTrace,
  energyCorrectedEulerCode,
  format,
  oscillatorEnergy,
} from "@methodslab/methods-engine/core";
import { examples, methods, operatorFamilies, operatorRegistry, optimizationExamples, optimizationMethods, pdeExamples, pdeMethods, probabilityExamples, probabilityMethods } from "@methodslab/methods-engine/presets";
import { MethodScene, PdeScene, VisualScene } from "@methodslab/visual-engine/react";
import { createOperatorFamilySceneSpec, createOptimizationTraceSceneSpec, createProbabilityTraceSceneSpec } from "@methodslab/visual-engine/core";
import type {
  EnergySample,
  ExampleId,
  ExampleSpec,
  LayerSpec,
  MethodId,
  OptimizationExampleId,
  OptimizationMethodId,
  OperatorFamilyId,
  ProbabilityExampleId,
  ProbabilityMethodId,
  PdeExampleId,
  PdeMethodId,
  StabilityScanTrace,
} from "@methodslab/methods-engine/core";
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
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type EnergyGraphSeries = {
  id: string;
  name: string;
  color: string;
  samples: EnergySample[];
};

const overlayMethodIds = new Set<MethodId>(["euler", "rk4", "symplectic"]);
type GenericFamilyId = Exclude<OperatorFamilyId, "ode" | "integral" | "pde">;
type LabMode = "ode" | "integral" | "pde" | "custom" | "operator";

const operatorFamilyInputs: Record<string, string> = {
  ode: "y' = f(t,y)\ntrajectory\nrk4",
  integral: "\\int_0^1 x^2\\,dx\nsimpson",
  pde: "u_t = 0.12 u_xx\nu(x,0)=sin(pi x)\nu(0,t)=u(1,t)=0",
  matrix: "Ax = b\nmatrix\njacobi",
  "root-finding": "f(x)=x^3-x-1\nroot\nnewton",
  optimization: "\\min_x f(x,y)=x^2+0.4y^2\ngradient descent",
  probability: "dX_t = \\mu(X_t,t)dt + \\sigma(X_t,t)dW_t\nstochastic\nbrownian",
  interpolation: "interpolation nodes\nlagrange polynomial\ncurve fit",
  custom: "u_t = 0.12 u_xx\nu(x,0)=sin(pi x)\nu(0,t)=u(1,t)=0",
};

const familyButtonMeta: Record<string, { label: string; icon: ReactNode }> = {
  ode: { label: "ODE", icon: <Box size={16} /> },
  integral: { label: "Integral", icon: <Sigma size={16} /> },
  pde: { label: "PDE", icon: <Thermometer size={16} /> },
  matrix: { label: "Matrix", icon: <GitCompare size={16} /> },
  "root-finding": { label: "Root", icon: <Crosshair size={16} /> },
  optimization: { label: "Optim", icon: <TrendingUp size={16} /> },
  probability: { label: "Prob", icon: <Activity size={16} /> },
  interpolation: { label: "Interp", icon: <Waves size={16} /> },
  custom: { label: "Custom", icon: <Sparkles size={16} /> },
};

export default function OperatorLab() {
  const [labMode, setLabMode] = useState<LabMode>("integral");
  const [customInput, setCustomInput] = useState(operatorFamilyInputs.custom);
  const [selectedFamilyId, setSelectedFamilyId] = useState<GenericFamilyId>("matrix");

  function openFamily(familyId: string) {
    if (familyId === "ode" || familyId === "integral" || familyId === "pde") {
      setLabMode(familyId);
      return;
    }

    if (familyId === "custom") {
      setCustomInput(operatorFamilyInputs.custom);
      setLabMode("custom");
      return;
    }

    setSelectedFamilyId(familyId as GenericFamilyId);
    setLabMode("operator");
  }

  if (labMode === "integral") {
    return (
      <IntegralLab
        onSwitchToOde={() => setLabMode("ode")}
        onSwitchToPde={() => setLabMode("pde")}
        onSwitchToCustom={() => openFamily("custom")}
        onOpenFamily={openFamily}
      />
    );
  }

  if (labMode === "pde") {
    return <PdeLab onOpenFamily={openFamily} />;
  }

  if (labMode === "custom") {
    return <CustomLab onOpenMode={setLabMode} onOpenFamily={openFamily} initialFormula={customInput} />;
  }

  if (labMode === "operator") {
    if (selectedFamilyId === "optimization") {
      return <OptimizationLab onOpenFamily={openFamily} />;
    }

    if (selectedFamilyId === "probability") {
      return <ProbabilityLab onOpenFamily={openFamily} />;
    }

    return <GenericOperatorLab familyId={selectedFamilyId} onOpenFamily={openFamily} onOpenCustom={() => setLabMode("custom")} />;
  }

  return <OdeLab onOpenFamily={openFamily} />;
}

function OdeLab({ onOpenFamily }: { onOpenFamily: (familyId: string) => void }) {
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
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5c717c]">OperatorLab Visualizer</p>
              <h1 className="text-2xl font-semibold">{method.name} geometriyasi</h1>
            </div>
          </div>

          <OperatorFamilyNav current="ode" onOpenFamily={onOpenFamily} />

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

function PdeLab({ onOpenFamily }: { onOpenFamily: (familyId: string) => void }) {
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
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5c717c]">OperatorLab Visualizer</p>
              <h1 className="text-2xl font-semibold">{method.name} PDE laboratoriyasi</h1>
            </div>
          </div>

          <OperatorFamilyNav current="pde" onOpenFamily={onOpenFamily} />

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

function GenericOperatorLab({
  familyId,
  onOpenFamily,
  onOpenCustom,
}: {
  familyId: GenericFamilyId;
  onOpenFamily: (familyId: string) => void;
  onOpenCustom: () => void;
}) {
  const family = operatorRegistry.familiesById[familyId];
  const [schemeId, setSchemeId] = useState(family.schemes[0]?.id ?? "");
  const [formula, setFormula] = useState(operatorFamilyInputs[familyId] ?? family.schemes[0]?.formula ?? "");
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [showComparison, setShowComparison] = useState(true);
  const [focus, setFocus] = useState(0.62);

  useEffect(() => {
    setSchemeId(family.schemes[0]?.id ?? "");
    setFormula(operatorFamilyInputs[familyId] ?? family.schemes[0]?.formula ?? "");
  }, [familyId, family.schemes]);

  const scheme = family.schemes.find((item) => item.id === schemeId) ?? family.schemes[0]!;
  const analysis = useMemo(() => analyzeOperatorInput(formula, operatorRegistry), [formula]);
  const sceneSpec = useMemo(
    () =>
      createOperatorFamilySceneSpec({
        familyName: family.name,
        visualGrammar: family.visualGrammar,
        schemeName: scheme.name,
        formula,
        summary: family.summary,
        normalizedInput: formula.toLowerCase(),
        confidence: analysis.family.id === family.id ? analysis.confidence : 0.72,
        showAnalysis,
        showComparison,
        focus,
      }),
    [analysis.confidence, analysis.family.id, family.id, family.name, family.summary, family.visualGrammar, focus, formula, scheme.name, showAnalysis, showComparison],
  );

  return (
    <main className="h-screen overflow-hidden bg-[#f4f7f8] text-[#152026]">
      <section className="grid h-screen grid-rows-[minmax(0,52vh)_minmax(0,48vh)] overflow-hidden lg:grid-cols-[430px_1fr] lg:grid-rows-1">
        <aside className="order-2 min-h-0 overflow-y-auto border-t border-[#d8e0e3] bg-[#fbfcfc] p-5 lg:order-1 lg:h-screen lg:border-r lg:border-t-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded bg-[#14222b] text-white">
              {familyButtonMeta[family.id].icon}
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5c717c]">OperatorLab Visualizer</p>
              <h1 className="text-2xl font-semibold">{family.name}</h1>
            </div>
          </div>

          <OperatorFamilyNav current={family.id} onOpenFamily={onOpenFamily} />

          <div className="mt-6 space-y-5">
            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="text-sm font-semibold text-[#31424b]">Metodlar</div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {family.schemes.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSchemeId(item.id);
                      setFormula(item.formula);
                    }}
                    className={`min-h-10 rounded border px-3 text-left text-sm font-medium ${
                      item.id === scheme.id ? "border-[#14222b] bg-[#14222b] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="text-sm font-semibold text-[#31424b]">Formula</div>
              <textarea
                value={formula}
                onChange={(event) => setFormula(event.target.value)}
                spellCheck={false}
                className="mt-3 h-36 w-full resize-none rounded border border-[#cfd9dd] bg-[#071115] p-3 font-mono text-sm leading-6 text-[#d7e3ea] outline-none focus:border-[#0f766e]"
              />
              <button
                type="button"
                onClick={() => onOpenCustom()}
                className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded border border-[#cfd9dd] bg-white px-3 text-sm font-medium hover:bg-[#eef4f5]"
              >
                <Braces size={16} />
                Erkin custom rejim
              </button>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <label htmlFor="operatorFocus" className="flex items-center justify-between text-sm font-semibold text-[#31424b]">
                Focus
                <span className="font-mono text-[#0f766e]">{Math.round(focus * 100)}%</span>
              </label>
              <input
                id="operatorFocus"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={focus}
                onChange={(event) => setFocus(Number(event.target.value))}
                className="mt-4 w-full accent-[#0f766e]"
              />

              <div className="mt-4 grid grid-cols-2 gap-2">
                <ToggleButton active={showAnalysis} icon={<ScanSearch size={16} />} label="Analysis" onClick={() => setShowAnalysis((value) => !value)} />
                <ToggleButton active={showComparison} icon={<GitCompare size={16} />} label="Compare" onClick={() => setShowComparison((value) => !value)} />
              </div>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <Activity size={17} />
                Operator modeli
              </div>
              <div className="mt-3 space-y-2 font-mono text-[13px] leading-6 text-[#20303a]">
                <p>{scheme.formula}</p>
                <p>{scheme.order ?? family.visualGrammar}</p>
                <p>{scheme.stability ?? family.summary}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Metric label="Grammar" value={family.visualGrammar} />
              <Metric label="Schemes" value={`${family.schemes.length}`} />
              <Metric label="Status" value={family.status} />
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <GitCompare size={17} />
                Geometrik talqin
              </div>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{scheme.geometry}</p>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{family.summary}</p>
            </div>
          </div>
        </aside>

        <div className="relative order-1 min-h-0 overflow-hidden bg-[#021017] lg:order-2">
          <VisualScene spec={sceneSpec} cameraMode="follow-spec" className="absolute inset-0" />
          <div className="pointer-events-none absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-2 text-xs font-medium">
            <span className="rounded px-2 py-1 text-[#111827]" style={{ background: scheme.color }}>
              {scheme.name}
            </span>
            <span className="rounded bg-[#e0f2fe] px-2 py-1 text-[#0c4a6e]">{family.visualGrammar}</span>
            <span className="rounded bg-[#dcfce7] px-2 py-1 text-[#166534]">{family.status}</span>
          </div>
          <div className="pointer-events-none absolute bottom-4 left-4 max-w-xl rounded bg-black/35 px-3 py-2 text-sm leading-6 text-[#d7e3ea] backdrop-blur-sm">
            {scheme.geometry}
          </div>
        </div>
      </section>
    </main>
  );
}

function OptimizationLab({ onOpenFamily }: { onOpenFamily: (familyId: string) => void }) {
  const [methodId, setMethodId] = useState<OptimizationMethodId>("gradient-descent");
  const [exampleId, setExampleId] = useState<OptimizationExampleId>("rosenbrock");
  const [stepSize, setStepSize] = useState(optimizationExamples[0].defaultStep);
  const [iterations, setIterations] = useState(optimizationExamples[0].defaultIterations);
  const [showSurface, setShowSurface] = useState(true);
  const [showGradient, setShowGradient] = useState(true);
  const [showComparison, setShowComparison] = useState(true);
  const [focus, setFocus] = useState(0.78);

  const method = optimizationMethods.find((item) => item.id === methodId) ?? optimizationMethods[0]!;
  const example = optimizationExamples.find((item) => item.id === exampleId) ?? optimizationExamples[0]!;

  useEffect(() => {
    setStepSize(example.defaultStep);
    setIterations(example.defaultIterations);
    setFocus(0.78);
  }, [example]);

  const trace = useMemo(
    () => buildOptimizationTrace(method, example, { stepSize, iterations }),
    [example, iterations, method, stepSize],
  );
  const comparisonTraces = useMemo(
    () =>
      optimizationMethods
        .filter((item) => item.id !== method.id)
        .map((item) => buildOptimizationTrace(item, example, { stepSize, iterations })),
    [example, iterations, method.id, stepSize],
  );
  const sceneSpec = useMemo(
    () => createOptimizationTraceSceneSpec(trace, example, { showSurface, showGradient, showComparison, focus, comparisonTraces }),
    [comparisonTraces, example, focus, showComparison, showGradient, showSurface, trace],
  );
  const bestStep = trace.steps.reduce((best, item) => (item.value < best.value ? item : best), trace.steps[0]!);
  const actualSteps = Math.max(0, Math.floor((trace.steps.length - 1) * focus));

  return (
    <main className="h-screen overflow-hidden bg-[#f4f7f8] text-[#152026]">
      <section className="grid h-screen grid-rows-[minmax(0,52vh)_minmax(0,48vh)] overflow-hidden lg:grid-cols-[430px_1fr] lg:grid-rows-1">
        <aside className="order-2 min-h-0 overflow-y-auto border-t border-[#d8e0e3] bg-[#fbfcfc] p-5 lg:order-1 lg:h-screen lg:border-r lg:border-t-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded bg-[#14222b] text-white">
              <TrendingUp size={21} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5c717c]">OperatorLab Optimization</p>
              <h1 className="text-2xl font-semibold">{method.name}</h1>
            </div>
          </div>

          <OperatorFamilyNav current="optimization" onOpenFamily={onOpenFamily} />

          <div className="mt-6 space-y-5">
            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="text-sm font-semibold text-[#31424b]">Metod</div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {optimizationMethods.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMethodId(item.id)}
                    className={`min-h-10 rounded border px-3 text-left text-sm font-medium ${
                      item.id === method.id ? "border-[#14222b] bg-[#14222b] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="text-sm font-semibold text-[#31424b]">Objective landscape</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {optimizationExamples.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setExampleId(item.id)}
                    className={`min-h-10 rounded border px-3 text-left text-sm font-medium ${
                      item.id === example.id ? "border-[#0f766e] bg-[#0f766e] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
                    }`}
                  >
                    {item.shortName}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <Sigma size={17} />
                Model
              </div>
              <div className="mt-3 space-y-2 font-mono text-[13px] leading-6 text-[#20303a]">
                <p>{example.formula}</p>
                <p>{method.formula}</p>
                <p>{method.order}</p>
              </div>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <Slider label="Step size" value={stepSize} min={example.minStep} max={example.maxStep} step={(example.maxStep - example.minStep) / 120} color="#e11d48" onChange={setStepSize} format={(value) => value.toFixed(4)} />
              <Slider label="Iterations" value={iterations} min={example.minIterations} max={example.maxIterations} step={1} color="#0f766e" onChange={setIterations} />
              <Slider label="Focus" value={focus} min={0.08} max={1} step={0.01} color="#ca8a04" onChange={setFocus} format={(value) => `${Math.round(value * 100)}%`} />
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="grid grid-cols-2 gap-2">
                <ToggleButton active={showSurface} icon={<Layers size={16} />} label="Surface" onClick={() => setShowSurface((value) => !value)} />
                <ToggleButton active={showGradient} icon={<Orbit size={16} />} label="Gradient" onClick={() => setShowGradient((value) => !value)} />
                <ToggleButton active={showComparison} icon={<GitCompare size={16} />} label="Compare" onClick={() => setShowComparison((value) => !value)} />
                <ToggleButton active={focus < 1} icon={<Focus size={16} />} label="Trace focus" onClick={() => setFocus((value) => (value < 1 ? 1 : 0.46))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Metric label="Final f" value={trace.finalValue.toExponential(2)} />
              <Metric label="Best f" value={bestStep.value.toExponential(2)} />
              <Metric label="||grad||" value={trace.finalGradientNorm.toExponential(2)} />
              <Metric label="Distance" value={trace.finalDistance.toExponential(2)} />
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
                    <span className="font-mono text-[#0f766e]">f {item.finalValue.toExponential(1)}</span>
                    <span className="font-mono text-[#be185d]">d {item.finalDistance.toExponential(1)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <ScanSearch size={17} />
                Geometrik talqin
              </div>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{method.geometry}</p>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{method.stability}</p>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{example.interpretation}</p>
            </div>
          </div>
        </aside>

        <div className="relative order-1 min-h-0 overflow-hidden bg-[#11100c] lg:order-2">
          <VisualScene spec={sceneSpec} cameraMode="follow-spec" className="absolute inset-0" />
          <div className="pointer-events-none absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-2 text-xs font-medium">
            <span className="rounded px-2 py-1 text-[#111827]" style={{ background: method.color }}>{method.name}</span>
            <span className="rounded bg-[#dcfce7] px-2 py-1 text-[#166534]">k={actualSteps}/{trace.iterations}</span>
            <span className="rounded bg-[#fef3c7] px-2 py-1 text-[#92400e]">eta={trace.stepSize.toFixed(4)}</span>
            <span className="rounded bg-[#fee2e2] px-2 py-1 text-[#991b1b]">f={trace.finalValue.toExponential(1)}</span>
          </div>
          <div className="pointer-events-none absolute bottom-4 left-4 max-w-2xl rounded bg-black/35 px-3 py-2 text-sm leading-6 text-[#f3e8d1] backdrop-blur-sm">
            Surface objective f(x,y) ni, pushti path iteratsiyalarni, oq arrowlar negative gradientni, yashil nuqta optimumni, kichik convergence graph esa f(x_k) kamayishini ko'rsatadi. Element ustiga sichqoncha olib boring.
          </div>
        </div>
      </section>
    </main>
  );
}

function ProbabilityLab({ onOpenFamily }: { onOpenFamily: (familyId: string) => void }) {
  const [methodId, setMethodId] = useState<ProbabilityMethodId>("euler-maruyama");
  const [exampleId, setExampleId] = useState<ProbabilityExampleId>("geometric-brownian");
  const [steps, setSteps] = useState(probabilityExamples[0].defaultSteps);
  const [pathCount, setPathCount] = useState(probabilityExamples[0].defaultPaths);
  const [drift, setDrift] = useState(probabilityExamples[0].drift);
  const [volatility, setVolatility] = useState(probabilityExamples[0].volatility);
  const [seed, setSeed] = useState(42);
  const [showPaths, setShowPaths] = useState(true);
  const [showMoments, setShowMoments] = useState(true);
  const [showHistogram, setShowHistogram] = useState(true);
  const [showConvergence, setShowConvergence] = useState(true);
  const [focus, setFocus] = useState(0.78);

  const method = probabilityMethods.find((item) => item.id === methodId) ?? probabilityMethods[0]!;
  const example = probabilityExamples.find((item) => item.id === exampleId) ?? probabilityExamples[0]!;

  useEffect(() => {
    setSteps(example.defaultSteps);
    setPathCount(example.defaultPaths);
    setDrift(example.drift);
    setVolatility(example.volatility);
  }, [example]);

  const trace = useMemo(
    () => buildProbabilityTrace(method, example, { steps, pathCount, drift, volatility, seed }),
    [drift, example, method, pathCount, seed, steps, volatility],
  );
  const comparisonTraces = useMemo(
    () =>
      probabilityMethods
        .filter((item) => item.id !== method.id)
        .map((item) => buildProbabilityTrace(item, example, { steps, pathCount, drift, volatility, seed })),
    [drift, example, method.id, pathCount, seed, steps, volatility],
  );
  const sceneSpec = useMemo(
    () => createProbabilityTraceSceneSpec(trace, { showPaths, showMoments, showHistogram, showConvergence, focus, comparisonTraces }),
    [comparisonTraces, focus, showConvergence, showHistogram, showMoments, showPaths, trace],
  );
  const meanError = Math.abs(trace.terminalMean - trace.exactTerminalMean);
  const varianceError = Math.abs(trace.terminalVariance - trace.exactTerminalVariance);

  return (
    <main className="h-screen overflow-hidden bg-[#f4f7f8] text-[#152026]">
      <section className="grid h-screen grid-rows-[minmax(0,52vh)_minmax(0,48vh)] overflow-hidden lg:grid-cols-[430px_1fr] lg:grid-rows-1">
        <aside className="order-2 min-h-0 overflow-y-auto border-t border-[#d8e0e3] bg-[#fbfcfc] p-5 lg:order-1 lg:h-screen lg:border-r lg:border-t-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded bg-[#14222b] text-white">
              <Activity size={21} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5c717c]">OperatorLab Statistics</p>
              <h1 className="text-2xl font-semibold">{method.name}</h1>
            </div>
          </div>

          <OperatorFamilyNav current="probability" onOpenFamily={onOpenFamily} />

          <div className="mt-6 space-y-5">
            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="text-sm font-semibold text-[#31424b]">Metod</div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {probabilityMethods.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMethodId(item.id)}
                    className={`min-h-10 rounded border px-3 text-left text-sm font-medium ${
                      item.id === method.id ? "border-[#14222b] bg-[#14222b] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="text-sm font-semibold text-[#31424b]">Stochastic model</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {probabilityExamples.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setExampleId(item.id)}
                    className={`min-h-10 rounded border px-3 text-left text-sm font-medium ${
                      item.id === example.id ? "border-[#0f766e] bg-[#0f766e] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
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
                Model
              </div>
              <div className="mt-3 space-y-2 font-mono text-[13px] leading-6 text-[#20303a]">
                <p>{example.equation}</p>
                <p>{method.formula}</p>
                <p>{method.order}</p>
              </div>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <Slider label="Time steps" value={steps} min={example.minSteps} max={example.maxSteps} step={1} color="#0f766e" onChange={setSteps} />
              <Slider label="Paths" value={pathCount} min={example.minPaths} max={example.maxPaths} step={1} color="#2563eb" onChange={setPathCount} />
              <Slider label="Drift" value={drift} min={-0.4} max={0.6} step={0.01} color="#ca8a04" onChange={setDrift} />
              <Slider label="Volatility" value={volatility} min={0.02} max={0.9} step={0.01} color="#be185d" onChange={setVolatility} />
              <Slider label="Seed" value={seed} min={1} max={999} step={1} color="#475569" onChange={setSeed} />
              <Slider label="Focus" value={focus} min={0.08} max={1} step={0.01} color="#0f766e" onChange={setFocus} format={(value) => `${Math.round(value * 100)}%`} />
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="grid grid-cols-2 gap-2">
                <ToggleButton active={showPaths} icon={<Waves size={16} />} label="Paths" onClick={() => setShowPaths((value) => !value)} />
                <ToggleButton active={showMoments} icon={<TrendingUp size={16} />} label="Moments" onClick={() => setShowMoments((value) => !value)} />
                <ToggleButton active={showHistogram} icon={<Layers size={16} />} label="Histogram" onClick={() => setShowHistogram((value) => !value)} />
                <ToggleButton active={showConvergence} icon={<ScanSearch size={16} />} label="Converge" onClick={() => setShowConvergence((value) => !value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Metric label="Mean err" value={meanError.toExponential(2)} />
              <Metric label="Var err" value={varianceError.toExponential(2)} />
              <Metric label="Payoff" value={format(trace.payoffEstimate)} />
              <Metric label="Std err" value={trace.payoffStdError.toExponential(2)} />
              <Metric label="P(X>K)" value={`${Math.round(trace.probabilityAbovePayoff * 100)}%`} />
              <Metric label="Q05/Q95" value={`${format(trace.quantile05)} / ${format(trace.quantile95)}`} />
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
                    <span className="font-mono text-[#0f766e]">mean {item.meanAbsError.toExponential(1)}</span>
                    <span className="font-mono text-[#be185d]">var {item.varianceAbsError.toExponential(1)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <GitCompare size={17} />
                Statistik talqin
              </div>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{method.geometry}</p>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{example.interpretation}</p>
              <p className="mt-3 font-mono text-xs leading-5 text-[#50626b]">
                95% CI payoff: [{format(trace.confidenceInterval[0])}, {format(trace.confidenceInterval[1])}]
              </p>
              <p className="mt-2 font-mono text-xs leading-5 text-[#50626b]">
                q05={format(trace.quantile05)}, q95={format(trace.quantile95)}, ES05={format(trace.expectedShortfall05)}
              </p>
            </div>
          </div>
        </aside>

        <div className="relative order-1 min-h-0 overflow-hidden bg-[#07131d] lg:order-2">
          <VisualScene spec={sceneSpec} cameraMode="follow-spec" className="absolute inset-0" />
          <div className="pointer-events-none absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-2 text-xs font-medium">
            <span className="rounded px-2 py-1 text-[#111827]" style={{ background: method.color }}>{method.name}</span>
            <span className="rounded bg-[#dbeafe] px-2 py-1 text-[#0c4a6e]">N={trace.pathCount}</span>
            <span className="rounded bg-[#dcfce7] px-2 py-1 text-[#166534]">dt={trace.dt.toFixed(3)}</span>
            <span className="rounded bg-[#fef3c7] px-2 py-1 text-[#92400e]">mean error {meanError.toExponential(1)}</span>
          </div>
          <div className="pointer-events-none absolute bottom-4 left-4 max-w-xl rounded bg-black/35 px-3 py-2 text-sm leading-6 text-[#d7e3ea] backdrop-blur-sm">
            Yellow mean line sample statisticani, white line exact mean'ni, translucent band 95% standard error'ni, orange threshold payoff risk'ni, right-side bars terminal distribution'ni ko'rsatadi.
          </div>
        </div>
      </section>
    </main>
  );
}

function CustomLab({
  onOpenMode,
  onOpenFamily,
  initialFormula,
}: {
  onOpenMode: (mode: LabMode) => void;
  onOpenFamily: (familyId: string) => void;
  initialFormula: string;
}) {
  const [formula, setFormula] = useState(initialFormula);
  const analysis = useMemo(() => analyzeOperatorInput(formula, operatorRegistry), [formula]);
  const draft = useMemo(() => createCustomSchemeDraft(analysis), [analysis]);
  const sceneSpec = useMemo(
    () =>
      ["transform-basis", "convergence-path", "landscape-descent", "stochastic-path", "curve-reconstruction"].includes(
        analysis.family.visualGrammar,
      )
        ? createOperatorFamilySceneSpec({
            familyName: analysis.family.name,
            visualGrammar: analysis.family.visualGrammar,
            schemeName: draft.schemeName,
            formula: draft.formula,
            summary: analysis.family.summary,
            normalizedInput: analysis.normalizedInput,
            confidence: analysis.confidence,
          })
        : null,
    [analysis.confidence, analysis.family.name, analysis.family.summary, analysis.family.visualGrammar, analysis.normalizedInput, draft.formula, draft.schemeName],
  );
  const mode = familyToMode(analysis.family.id);

  useEffect(() => {
    setFormula(initialFormula);
  }, [initialFormula]);

  return (
    <main className="h-screen overflow-hidden bg-[#f4f7f8] text-[#152026]">
      <section className="grid h-screen grid-rows-[minmax(0,52vh)_minmax(0,48vh)] overflow-hidden lg:grid-cols-[430px_1fr] lg:grid-rows-1">
        <aside className="order-2 min-h-0 overflow-y-auto border-t border-[#d8e0e3] bg-[#fbfcfc] p-5 lg:order-1 lg:h-screen lg:border-r lg:border-t-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded bg-[#14222b] text-white">
              <Braces size={21} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5c717c]">OperatorLab Custom</p>
              <h1 className="text-2xl font-semibold">Custom metod/formula</h1>
            </div>
          </div>

          <OperatorFamilyNav current="custom" onOpenFamily={onOpenFamily} />

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
                Avtomatik tahlil
              </div>
              <div className="mt-3 space-y-2 text-sm leading-6 text-[#20303a]">
                <p><span className="font-semibold">Family:</span> {analysis.family.name}</p>
                <p><span className="font-semibold">Visual grammar:</span> {analysis.family.visualGrammar}</p>
                <p><span className="font-semibold">Status:</span> {analysis.family.status}</p>
                <p><span className="font-semibold">Confidence:</span> {(analysis.confidence * 100).toFixed(0)}%</p>
                <p><span className="font-semibold">Sabab:</span> {analysis.reasons[0] ?? "registry fallback"}</p>
                <p><span className="font-semibold">Custom formula:</span> {draft.formula}</p>
              </div>
              <button
                type="button"
                onClick={() => (mode === "custom" ? onOpenFamily(analysis.family.id) : onOpenMode(mode))}
                className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded bg-[#14222b] px-3 text-sm font-medium text-white"
              >
                <Sparkles size={16} />
                {mode === "custom" ? `${analysis.family.name} preview` : `${analysis.family.name} visualizer`} ga o‘tish
              </button>
            </div>
          </div>
        </aside>

        <div className="order-1 min-h-0 overflow-hidden bg-[#021017] p-6 lg:order-2">
          <div className="grid h-full gap-4 lg:grid-cols-2">
            <div className="rounded border border-[#17313a] bg-[#03161d] p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7ea0ad]">Detected family</div>
              <div className="mt-3 text-3xl font-semibold text-white">{analysis.family.name}</div>
              <p className="mt-4 text-sm leading-7 text-[#9fb3bb]">{analysis.family.summary}</p>
              <p className="mt-3 text-xs font-mono uppercase tracking-[0.12em] text-[#7ea0ad]">{analysis.family.visualGrammar}</p>
            </div>
            <div className="rounded border border-[#17313a] bg-[#071922] p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7ea0ad]">Planned visual</div>
              <div className="mt-3 text-xl font-semibold text-white">{draft.schemeName}</div>
              <div className="mt-4 rounded border border-[#17313a] bg-black/30 p-4 font-mono text-sm leading-6 text-[#d7e3ea] whitespace-pre-wrap">
                {draft.formula}
              </div>
              <div className="mt-4">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7ea0ad]">Default schemes</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {analysis.schemeHints.slice(0, 4).map((scheme) => (
                    <span key={scheme.id} className="rounded bg-[#0f1720] px-2 py-1 text-[11px] font-medium text-[#d7e3ea]">
                      {scheme.name}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4 text-xs leading-5 text-[#7ea0ad]">
                Draft registry target: {draft.familyName} | {draft.visualGrammar} | {draft.status}
              </div>
            </div>
            <div className="rounded border border-[#17313a] bg-[#041118] p-5 lg:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7ea0ad]">Operator registry</div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {operatorFamilies.map((family) => (
                  <div key={family.id} className="rounded border border-[#17313a] bg-[#061821] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-white">{family.name}</div>
                        <div className="mt-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[#7ea0ad]">{family.visualGrammar}</div>
                      </div>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                          family.status === "active" ? "bg-[#14532d] text-[#dcfce7]" : "bg-[#3f1d1d] text-[#fecaca]"
                        }`}
                      >
                        {family.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#9fb3bb]">{family.summary}</p>
                    <p className="mt-2 text-xs leading-5 text-[#7ea0ad]">{family.schemes.length} schemes</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {family.schemes.slice(0, 3).map((scheme) => (
                        <span key={scheme.id} className="rounded bg-[#0f1720] px-2 py-1 text-[10px] font-medium text-[#d7e3ea]">
                          {scheme.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {sceneSpec ? (
              <div className="rounded border border-[#17313a] bg-[#041118] p-5 lg:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7ea0ad]">Operator family preview</div>
                <div className="mt-3 overflow-hidden rounded border border-[#17313a] bg-[#071922]">
                  <VisualScene spec={sceneSpec} cameraMode="follow-spec" className="h-[420px] w-full" />
                </div>
                <p className="mt-3 text-sm leading-6 text-[#9fb3bb]">
                  Preview family geometriyasini ko‘rsatadi: matrix’da transform, root finding’da convergence path, optimization’da landscape descent,
                  probability’da stochastic ensemble, interpolation’da curve reconstruction chiqadi.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

function familyToMode(familyId: string): LabMode {
  if (familyId === "ode") return "ode";
  if (familyId === "integral") return "integral";
  if (familyId === "pde") return "pde";
  return "custom";
}

function OperatorFamilyNav({
  current,
  onOpenFamily,
}: {
  current: string;
  onOpenFamily: (familyId: string) => void;
}) {
  const items = [...operatorFamilies.map((family) => family.id), "custom"];

  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      {items.map((familyId) => {
        const meta = familyButtonMeta[familyId];
        const active = familyId === current;

        return (
          <button
            key={familyId}
            type="button"
            onClick={() => onOpenFamily(familyId)}
            className={`flex h-9 items-center justify-center gap-2 rounded px-3 text-sm font-medium ${
              active ? "bg-[#14222b] text-white" : "border border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
            }`}
          >
            {meta.icon}
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  color,
  onChange,
  format: formatValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  color: string;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  const id = `slider-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="mt-4 first:mt-0">
      <label htmlFor={id} className="flex items-center justify-between text-sm font-semibold text-[#31424b]">
        {label}
        <span className="font-mono" style={{ color }}>
          {formatValue ? formatValue(value) : Number.isInteger(step) ? Math.round(value) : value.toFixed(2)}
        </span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 w-full"
        style={{ accentColor: color }}
      />
    </div>
  );
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
