"use client";

import {
  buildEnergyProjectionSegments,
  buildInterpolationTrace,
  buildMatrixTrace,
  buildPdeTrace,
  buildRootFindingTrace,
  buildStabilityScan,
  buildTrace,
  analyzeOperatorInput,
  buildOptimizationTrace,
  compileCustomInterpolationMethod,
  compileCustomMatrixMethod,
  compileCustomOdeMethod,
  compileCustomOptimizationMethod,
  compileCustomPdeMethod,
  compileCustomProbabilityMethod,
  compileCustomRootFindingMethod,
  createCustomSchemeDraft,
  createCustomThetaPdeMethod,
  createEnergyCorrectedEulerMethod,
  buildProbabilityTrace,
  energyCorrectedEulerCode,
  format,
  oscillatorEnergy,
} from "@methodslab/methods-engine/core";
import {
  examples,
  interpolationExamples,
  interpolationMethods,
  matrixExamples,
  matrixMethods,
  methods,
  operatorFamilies,
  operatorRegistry,
  optimizationExamples,
  optimizationMethods,
  pdeExamples,
  pdeMethods,
  probabilityExamples,
  probabilityMethods,
  rootFindingExamples,
  rootFindingMethods,
} from "@methodslab/methods-engine/presets";
import { MethodScene, PdeScene, VisualScene } from "@methodslab/visual-engine/react";
import type { VisualSceneCameraPoseState } from "@methodslab/visual-engine/react";
import {
  createInterpolationTraceSceneSpec,
  createMatrixTraceSceneSpec,
  createOperatorFamilySceneSpec,
  createOptimizationTraceSceneSpec,
  createProbabilityTraceSceneSpec,
  createRootFindingTraceSceneSpec,
} from "@methodslab/visual-engine/core";
import type {
  EnergySample,
  ExampleId,
  ExampleSpec,
  InterpolationExampleId,
  InterpolationMethodId,
  LayerSpec,
  MatrixExampleId,
  MatrixMethodId,
  MethodId,
  OptimizationExampleId,
  OptimizationMethodId,
  OperatorFamilyId,
  ProbabilityExampleId,
  ProbabilityMethodId,
  PdeExampleId,
  PdeMethodId,
  RootFindingExampleId,
  RootFindingMethodId,
  StabilityScanTrace,
} from "@methodslab/methods-engine/core";
import type { VisualSceneSpec } from "@methodslab/visual-engine/core";
import {
  createCompositionFromWorkbenchArtifacts,
  createInterpolationWorkbenchArtifact,
  createMatrixWorkbenchArtifact,
  createRootFindingWorkbenchArtifact,
  evaluateWorkbenchCompatibility,
  summarizeOperatorComposition,
  type OperatorWorkbenchArtifact,
  type OperatorCompositionMode,
} from "@methodslab/methods-engine/core";
import IntegralLab from "./integral-lab";
import {
  Activity,
  Box,
  Code2,
  Crosshair,
  Expand,
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
  X,
  Zap,
} from "lucide-react";
import { renderToString } from "katex";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { BenchmarkLink, CompactBenchmarkSummary } from "./analyzer/benchmark-ui";
import {
  buildInterpolationBenchmarkRows,
  buildMatrixBenchmarkRows,
  buildOdeBenchmarkRows,
  buildOptimizationBenchmarkRows,
  buildPdeBenchmarkRows,
  buildProbabilityBenchmarkRows,
  buildRootBenchmarkRows,
  summarizeBenchmark,
} from "./analyzer/benchmark-utils";

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
    if (selectedFamilyId === "matrix") {
      return <MatrixLab onOpenFamily={openFamily} />;
    }

    if (selectedFamilyId === "root-finding") {
      return <RootFindingLab onOpenFamily={openFamily} />;
    }

    if (selectedFamilyId === "interpolation") {
      return <InterpolationLab onOpenFamily={openFamily} />;
    }

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
  const [customMethodInput, setCustomMethodInput] = useState("heun predictor corrector");
  const [useCustomMethod, setUseCustomMethod] = useState(false);
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

  const customMethod = useMemo(() => compileCustomOdeMethod(customMethodInput), [customMethodInput]);
  const presetMethod = methods.find((item) => item.id === methodId) ?? methods[0]!;
  const method = useCustomMethod ? customMethod.method : presetMethod;
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
  const benchmarkRows = useMemo(() => buildOdeBenchmarkRows(trace, methods.filter((item) => item.id !== presetMethod.id).map((item) => buildTrace(item, example, step)), example), [example, presetMethod.id, step, trace]);
  const benchmarkSummary = useMemo(() => summarizeBenchmark(benchmarkRows, trace.metadata.methodName), [benchmarkRows, trace.metadata.methodName]);

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
        <aside className="relative z-10 order-2 min-h-0 overflow-y-auto border-t border-[#d8e0e3] bg-[#fbfcfc] p-5 lg:order-1 lg:h-screen lg:border-r lg:border-t-0">
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
                    useCustomMethod ? "border-[#ea580c] bg-[#ea580c] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
                  }`}
                >
                  Custom compiled
                </button>
              </div>
            </div>

            <CustomMethodCard
              title="Custom ODE method"
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
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <TrendingUp size={17} />
                Benchmark
              </div>
              <CompactBenchmarkSummary rows={benchmarkRows} methodName={trace.metadata.methodName} wins={benchmarkSummary.wins} losses={benchmarkSummary.losses} />
              <BenchmarkLink href={`/analyzer/benchmarks?family=ode&method=${encodeURIComponent(useCustomMethod ? customMethod.baseMethodId : method.id)}&example=${encodeURIComponent(example.id)}&step=${step.toFixed(3)}${useCustomMethod ? `&formula=${encodeURIComponent(customMethodInput)}` : ""}`} />
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
  const [customMethodInput, setCustomMethodInput] = useState("theta=0.5 crank nicolson diffusion");
  const [useCustomMethod, setUseCustomMethod] = useState(false);
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
  const customThetaMethod = useMemo(() => createCustomThetaPdeMethod(theta), [theta]);
  const customMethod = useMemo(() => compileCustomPdeMethod(customMethodInput), [customMethodInput]);
  const method = useCustomMethod ? customMethod.method : presetMethod ?? customThetaMethod;
  const cells = cellsByExample[exampleId];
  const timeSteps = timeStepsByExample[exampleId];
  const trace = useMemo(() => buildPdeTrace(method, example, cells, timeSteps), [cells, example, method, timeSteps]);
  const pdeComparisonTraces = useMemo(
    () => [
      ...pdeMethods.filter((item) => item.id !== method.id).map((item) => buildPdeTrace(item, example, cells, timeSteps)),
      ...(method.id === "custom-theta" || useCustomMethod ? [] : [buildPdeTrace(createCustomThetaPdeMethod(theta), example, cells, timeSteps)]),
    ],
    [cells, example, method.id, theta, timeSteps, useCustomMethod],
  );
  const pdeBenchmarkRows = useMemo(() => buildPdeBenchmarkRows(trace, pdeComparisonTraces, theta), [pdeComparisonTraces, theta, trace]);
  const pdeBenchmarkSummary = useMemo(() => summarizeBenchmark(pdeBenchmarkRows, trace.metadata.methodName), [pdeBenchmarkRows, trace.metadata.methodName]);
  const lastError = trace.errors.at(-1);

  return (
    <main className="h-screen overflow-hidden bg-[#f4f7f8] text-[#152026]">
      <section className="grid h-screen grid-rows-[minmax(0,52vh)_minmax(0,48vh)] overflow-hidden lg:grid-cols-[430px_1fr] lg:grid-rows-1">
        <aside className="relative z-10 order-2 min-h-0 overflow-y-auto border-t border-[#d8e0e3] bg-[#fbfcfc] p-5 lg:order-1 lg:h-screen lg:border-r lg:border-t-0">
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
                    onClick={() => {
                      setMethodId(item.id);
                      setUseCustomMethod(false);
                    }}
                    className={`min-h-10 rounded border px-3 text-left text-sm font-medium ${
                      !useCustomMethod && item.id === methodId ? "border-[#14222b] bg-[#14222b] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setMethodId("custom-theta");
                    setUseCustomMethod(false);
                  }}
                  className={`min-h-10 rounded border px-3 text-left text-sm font-medium ${
                    !useCustomMethod && methodId === "custom-theta" ? "border-[#ea580c] bg-[#ea580c] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
                  }`}
                >
                  Custom theta method
                </button>
                <button
                  type="button"
                  onClick={() => setUseCustomMethod(true)}
                  className={`min-h-10 rounded border px-3 text-left text-sm font-medium ${
                    useCustomMethod ? "border-[#be123c] bg-[#be123c] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
                  }`}
                >
                  Custom compiled
                </button>
              </div>
            </div>

            <CustomMethodCard
              title="Custom PDE method"
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

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <TrendingUp size={17} />
                Benchmark
              </div>
              <CompactBenchmarkSummary rows={pdeBenchmarkRows} methodName={trace.metadata.methodName} wins={pdeBenchmarkSummary.wins} losses={pdeBenchmarkSummary.losses} />
              <BenchmarkLink href={`/analyzer/benchmarks?family=pde&method=${encodeURIComponent(useCustomMethod ? customMethod.baseMethodId : method.id)}&example=${encodeURIComponent(example.id)}&cells=${cells}&timeSteps=${timeSteps}&theta=${theta.toFixed(2)}${useCustomMethod ? `&formula=${encodeURIComponent(customMethodInput)}` : ""}`} />
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
        <aside className="relative z-10 order-2 min-h-0 overflow-y-auto border-t border-[#d8e0e3] bg-[#fbfcfc] p-5 lg:order-1 lg:h-screen lg:border-r lg:border-t-0">
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
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [methodId, setMethodId] = useState<OptimizationMethodId>("gradient-descent");
  const [customMethodInput, setCustomMethodInput] = useState("nesterov eta=0.7 beta=0.82");
  const [useCustomMethod, setUseCustomMethod] = useState(false);
  const [exampleId, setExampleId] = useState<OptimizationExampleId>("rosenbrock");
  const [stepSize, setStepSize] = useState(optimizationExamples[0].defaultStep);
  const [iterations, setIterations] = useState(optimizationExamples[0].defaultIterations);
  const [showSurface, setShowSurface] = useState(true);
  const [showGradient, setShowGradient] = useState(true);
  const [showComparison, setShowComparison] = useState(true);
  const [focus, setFocus] = useState(0.78);

  const customMethod = useMemo(() => compileCustomOptimizationMethod(customMethodInput), [customMethodInput]);
  const presetMethod = optimizationMethods.find((item) => item.id === methodId) ?? optimizationMethods[0]!;
  const method = useCustomMethod ? customMethod.method : presetMethod;
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
        .filter((item) => item.id !== presetMethod.id)
        .map((item) => buildOptimizationTrace(item, example, { stepSize, iterations })),
    [example, iterations, presetMethod.id, stepSize],
  );
  const sceneSpec = useMemo(
    () => createOptimizationTraceSceneSpec(trace, example, { showSurface, showGradient, showComparison, focus, comparisonTraces }),
    [comparisonTraces, example, focus, showComparison, showGradient, showSurface, trace],
  );
  const benchmarkRows = useMemo(() => buildOptimizationBenchmarkRows(trace, comparisonTraces), [comparisonTraces, trace]);
  const benchmarkSummary = useMemo(() => summarizeBenchmark(benchmarkRows, trace.metadata.methodName), [benchmarkRows, trace.metadata.methodName]);
  const bestStep = trace.steps.reduce((best, item) => (item.value < best.value ? item : best), trace.steps[0]!);
  const actualSteps = Math.max(0, Math.floor((trace.steps.length - 1) * focus));
  const alignmentPercent = ((trace.averageGradientAlignment + 1) * 50).toFixed(0);
  const optimizationResearchScore = Math.max(0, Math.min(100, 100 - Math.min(35, trace.finalGradientNorm * 22) - trace.monotoneIncreaseCount * 3 - Math.min(20, trace.finalDistance * 18) + trace.averageGradientAlignment * 12));

  return (
    <main className="h-screen overflow-hidden bg-[#f4f7f8] text-[#152026]">
      <section className="grid h-screen grid-rows-[minmax(0,52vh)_minmax(0,48vh)] overflow-hidden lg:grid-cols-[430px_1fr] lg:grid-rows-1">
        <aside className="relative z-10 order-2 min-h-0 overflow-y-auto border-t border-[#d8e0e3] bg-[#fbfcfc] p-5 lg:order-1 lg:h-screen lg:border-r lg:border-t-0">
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
                    onClick={() => {
                      setMethodId(item.id);
                      setUseCustomMethod(false);
                    }}
                    className={`min-h-10 rounded border px-3 text-left text-sm font-medium ${
                      !useCustomMethod && item.id === presetMethod.id ? "border-[#14222b] bg-[#14222b] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setUseCustomMethod(true)}
                  className={`min-h-10 rounded border px-3 text-left text-sm font-medium ${
                    useCustomMethod ? "border-[#be123c] bg-[#be123c] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
                  }`}
                >
                  Custom compiled
                </button>
              </div>
            </div>

            <CustomMethodCard
              title="Custom optimization method"
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
              <div className="mb-3 text-sm font-semibold text-[#31424b]">Ko'rinish</div>
              <div className="grid grid-cols-2 gap-2">
                <ToggleButton active={viewMode === "2d"} icon={<ScanSearch size={16} />} label="2D Analyze" onClick={() => setViewMode("2d")} />
                <ToggleButton active={viewMode === "3d"} icon={<Orbit size={16} />} label="3D Explore" onClick={() => setViewMode("3d")} />
              </div>
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
              <Metric label="Cond" value={Number.isFinite(trace.finalConditionNumber) ? trace.finalConditionNumber.toFixed(1) : "inf"} />
              <Metric label="Align" value={`${alignmentPercent}%`} />
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
              <p className="mt-3 font-mono text-xs leading-5 text-[#50626b]">
                oscillation={trace.oscillationCount}, increases={trace.monotoneIncreaseCount}, neg-curvature={trace.negativeCurvatureSteps}, max-step={trace.largestAcceptedStep.toExponential(2)}
              </p>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <TrendingUp size={17} />
                Benchmark
              </div>
              <CompactBenchmarkSummary rows={benchmarkRows} methodName={trace.metadata.methodName} wins={benchmarkSummary.wins} losses={benchmarkSummary.losses} />
              <BenchmarkLink href={`/analyzer/benchmarks?family=optimization&method=${encodeURIComponent(useCustomMethod ? customMethod.baseMethodId : method.id)}&example=${encodeURIComponent(example.id)}&stepSize=${stepSize.toFixed(4)}&iterations=${iterations}${useCustomMethod ? `&formula=${encodeURIComponent(customMethodInput)}` : ""}`} />
            </div>

            <ResearchReadinessCard
              title="Practical readiness"
              score={optimizationResearchScore}
              family={operatorRegistry.familiesById.optimization}
              summary="Bu qatlam optimizer real trening yoki inverse fittingda geometriyani qanchalik yaxshi ushlayotganini baholaydi."
              diagnostics={[`grad=${trace.finalGradientNorm.toExponential(2)}`, `dist=${trace.finalDistance.toExponential(2)}`, `align=${alignmentPercent}%`]}
            />
          </div>
        </aside>

        <div className={`order-1 min-h-0 lg:order-2 ${viewMode === "3d" ? "relative overflow-hidden bg-[#11100c]" : "overflow-auto bg-[#f6f1e8] p-5"}`}>
          {viewMode === "3d" ? (
            <>
              <VisualScene spec={sceneSpec} cameraMode="follow-spec" className="absolute inset-0" />
              <div className="pointer-events-none absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-2 text-xs font-medium">
                <span className="rounded px-2 py-1 text-[#111827]" style={{ background: method.color }}>{method.name}</span>
                <span className="rounded bg-[#dcfce7] px-2 py-1 text-[#166534]">k={actualSteps}/{trace.iterations}</span>
                <span className="rounded bg-[#fef3c7] px-2 py-1 text-[#92400e]">eta={trace.stepSize.toFixed(4)}</span>
                <span className="rounded bg-[#fee2e2] px-2 py-1 text-[#991b1b]">f={trace.finalValue.toExponential(1)}</span>
              </div>
              <div className="pointer-events-none absolute bottom-4 left-4 max-w-2xl rounded bg-black/35 px-3 py-2 text-sm leading-6 text-[#f3e8d1] backdrop-blur-sm">
                3D explore rejimi sirt va orbitani ko'rsatadi. Tushunish uchun esa default 2D analyze ko'rinishi ancha yaxshi.
              </div>
            </>
          ) : (
            <OptimizationAnalyzeView
              comparisonTraces={comparisonTraces}
              example={example}
              showComparison={showComparison}
              showGradient={showGradient}
              showSurface={showSurface}
              trace={trace}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function ProbabilityLab({ onOpenFamily }: { onOpenFamily: (familyId: string) => void }) {
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [methodId, setMethodId] = useState<ProbabilityMethodId>("euler-maruyama");
  const [customMethodInput, setCustomMethodInput] = useState("antithetic exact transition noise correction=0.08");
  const [useCustomMethod, setUseCustomMethod] = useState(false);
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

  const customMethod = useMemo(() => compileCustomProbabilityMethod(customMethodInput), [customMethodInput]);
  const presetMethod = probabilityMethods.find((item) => item.id === methodId) ?? probabilityMethods[0]!;
  const method = useCustomMethod ? customMethod.method : presetMethod;
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
        .filter((item) => item.id !== presetMethod.id)
        .map((item) => buildProbabilityTrace(item, example, { steps, pathCount, drift, volatility, seed })),
    [drift, example, pathCount, presetMethod.id, seed, steps, volatility],
  );
  const sceneSpec = useMemo(
    () => createProbabilityTraceSceneSpec(trace, { showPaths, showMoments, showHistogram, showConvergence, focus, comparisonTraces }),
    [comparisonTraces, focus, showConvergence, showHistogram, showMoments, showPaths, trace],
  );
  const benchmarkRows = useMemo(() => buildProbabilityBenchmarkRows(trace, comparisonTraces), [comparisonTraces, trace]);
  const benchmarkSummary = useMemo(() => summarizeBenchmark(benchmarkRows, trace.metadata.methodName), [benchmarkRows, trace.metadata.methodName]);
  const meanError = Math.abs(trace.terminalMean - trace.exactTerminalMean);
  const varianceError = Math.abs(trace.terminalVariance - trace.exactTerminalVariance);
  const probabilityResearchScore = Math.max(0, Math.min(100, 100 - Math.min(28, trace.payoffStdError * 220) - Math.min(24, trace.strongErrorEstimate * 40) - Math.min(18, trace.weakErrorEstimate * 80) - Math.min(12, trace.tailBalance * 20)));

  return (
    <main className="h-screen overflow-hidden bg-[#f4f7f8] text-[#152026]">
      <section className="grid h-screen grid-rows-[minmax(0,52vh)_minmax(0,48vh)] overflow-hidden lg:grid-cols-[430px_1fr] lg:grid-rows-1">
        <aside className="relative z-10 order-2 min-h-0 overflow-y-auto border-t border-[#d8e0e3] bg-[#fbfcfc] p-5 lg:order-1 lg:h-screen lg:border-r lg:border-t-0">
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
                    onClick={() => {
                      setMethodId(item.id);
                      setUseCustomMethod(false);
                    }}
                    className={`min-h-10 rounded border px-3 text-left text-sm font-medium ${
                      !useCustomMethod && item.id === presetMethod.id ? "border-[#14222b] bg-[#14222b] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setUseCustomMethod(true)}
                  className={`min-h-10 rounded border px-3 text-left text-sm font-medium ${
                    useCustomMethod ? "border-[#be123c] bg-[#be123c] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
                  }`}
                >
                  Custom compiled
                </button>
              </div>
            </div>

            <CustomMethodCard
              title="Custom stochastic method"
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
              <div className="mb-3 text-sm font-semibold text-[#31424b]">Ko'rinish</div>
              <div className="grid grid-cols-2 gap-2">
                <ToggleButton active={viewMode === "2d"} icon={<ScanSearch size={16} />} label="2D Analyze" onClick={() => setViewMode("2d")} />
                <ToggleButton active={viewMode === "3d"} icon={<Orbit size={16} />} label="3D Explore" onClick={() => setViewMode("3d")} />
              </div>
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
              <Metric label="Strong" value={trace.strongErrorEstimate.toExponential(2)} />
              <Metric label="Weak" value={trace.weakErrorEstimate.toExponential(2)} />
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
              <p className="mt-2 font-mono text-xs leading-5 text-[#50626b]">
                skew={trace.terminalSkewness.toFixed(2)}, kurt={trace.terminalExcessKurtosis.toFixed(2)}, tail-balance={trace.tailBalance.toExponential(2)}, pathwise-q95={trace.pathwiseQuantile95Error.toExponential(2)}
              </p>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <TrendingUp size={17} />
                Benchmark
              </div>
              <CompactBenchmarkSummary rows={benchmarkRows} methodName={trace.metadata.methodName} wins={benchmarkSummary.wins} losses={benchmarkSummary.losses} />
              <BenchmarkLink href={`/analyzer/benchmarks?family=probability&method=${encodeURIComponent(useCustomMethod ? customMethod.baseMethodId : method.id)}&example=${encodeURIComponent(example.id)}&steps=${steps}&pathCount=${pathCount}&drift=${drift.toFixed(2)}&volatility=${volatility.toFixed(2)}&seed=${seed}${useCustomMethod ? `&formula=${encodeURIComponent(customMethodInput)}` : ""}`} />
            </div>

            <ResearchReadinessCard
              title="Practical readiness"
              score={probabilityResearchScore}
              family={operatorRegistry.familiesById.probability}
              summary="Bu qatlam uncertainty va sampling reliability'ni amaliy stochastic model yoki risk baholashga yaqin ko'rinishda beradi."
              diagnostics={[`stderr=${trace.payoffStdError.toExponential(2)}`, `strong=${trace.strongErrorEstimate.toExponential(2)}`, `weak=${trace.weakErrorEstimate.toExponential(2)}`]}
            />
          </div>
        </aside>

        <div className={`order-1 min-h-0 lg:order-2 ${viewMode === "3d" ? "relative overflow-hidden bg-[#07131d]" : "overflow-auto bg-[#f1f6f8] p-5"}`}>
          {viewMode === "3d" ? (
            <>
              <VisualScene spec={sceneSpec} cameraMode="follow-spec" className="absolute inset-0" />
              <div className="pointer-events-none absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-2 text-xs font-medium">
                <span className="rounded px-2 py-1 text-[#111827]" style={{ background: method.color }}>{method.name}</span>
                <span className="rounded bg-[#dbeafe] px-2 py-1 text-[#0c4a6e]">N={trace.pathCount}</span>
                <span className="rounded bg-[#dcfce7] px-2 py-1 text-[#166534]">dt={trace.dt.toFixed(3)}</span>
                <span className="rounded bg-[#fef3c7] px-2 py-1 text-[#92400e]">mean error {meanError.toExponential(1)}</span>
              </div>
              <div className="pointer-events-none absolute bottom-4 left-4 max-w-xl rounded bg-black/35 px-3 py-2 text-sm leading-6 text-[#d7e3ea] backdrop-blur-sm">
                3D explore sample bulut va risk qatlamlarini ko'rsatadi. Tushunish uchun esa default 2D analyze ko'rinishi aniqroq.
              </div>
            </>
          ) : (
            <ProbabilityAnalyzeView
              comparisonTraces={comparisonTraces}
              focus={focus}
              showComparison={true}
              showConvergence={showConvergence}
              showHistogram={showHistogram}
              showMoments={showMoments}
              showPaths={showPaths}
              trace={trace}
            />
          )}
        </div>
      </section>
    </main>
  );
}

type CompareMethodOption<TTrace> = {
  id: string;
  name: string;
  color: string;
  trace: TTrace;
  artifact: OperatorWorkbenchArtifact;
  primaryMetric: string;
  secondaryMetric: string;
};

type CompareSceneItem = {
  id: string;
  name: string;
  color: string;
  spec: VisualSceneSpec;
  subtitle: string;
};

type CompareFamilyKind = "matrix" | "root-finding" | "interpolation";
type CompareWorkspaceWindowKind = "primary" | "analyze" | "split" | "overlay" | "compose";
type DockSide = "left" | "right";

type MethodTabWorkspaceOption = {
  id: string;
  name: string;
  color: string;
};

type CompareDockProps<TTrace> = {
  family: CompareFamilyKind;
  title: string;
  open: boolean;
  options: CompareMethodOption<TTrace>[];
  activeMethodId: string;
  rightSplitMethodId: string | null;
  overlayMethodIds: string[];
  onPromoteMethod: (methodId: string) => void;
  onAssignRightSplitMethod: (methodId: string) => void;
  onToggleOverlayMethod: (methodId: string) => void;
  onRemoveRightSplitMethod: () => void;
  onClearOverlayMethods: () => void;
  compareViewMode: "split" | "overlay";
  onChangeCompareViewMode: (mode: "split" | "overlay") => void;
  cameraLinkEnabled: boolean;
  onToggleCameraLink: () => void;
  composeSelection: string[];
  onDropComposeMethod: (methodId: string) => void;
  onRemoveComposeMethod: (methodId: string) => void;
  onMoveComposeMethod: (methodId: string, direction: "left" | "right") => void;
  onClearComposeSelection: () => void;
  compositionMode: OperatorCompositionMode;
  onChangeCompositionMode: (mode: OperatorCompositionMode) => void;
  compatibilityReason: string;
  compositionSummary: ReturnType<typeof summarizeOperatorComposition>;
  overlayWarning: string | null;
};

const EMPTY_COMPOSITION_SUMMARY: ReturnType<typeof summarizeOperatorComposition> = {
  id: "compare-compose-empty",
  name: "Compare compose",
  mode: "pipeline",
  visualGrammar: "trajectory-flow",
  operatorCount: 0,
  connectionCount: 0,
  familyCount: 0,
  isCrossFamily: false,
  warnings: [],
};

const compareFamilyCopy: Record<
  CompareFamilyKind,
  { split: string; overlay: string; compose: string; anchor: string; right: string; overlayLabel: string }
> = {
  matrix: {
    split: "Basis, orbit va contractionni yonma-yon ko'ring.",
    overlay: "Residual yo'llar bir frame ichida ustma-ust tushadi.",
    compose: "Precondition -> iterate -> polish zanjiri quriladi.",
    anchor: "Asosiy analizator",
    right: "Yon panel",
    overlayLabel: "Shared frame",
  },
  "root-finding": {
    split: "Bracket va tangent geometriyasini ikki panelda ajrating.",
    overlay: "Bir xil funksiya ustida qaysi yo'l qanday burilayotganini ko'ring.",
    compose: "Bracket -> secant -> newton kabi transition quriladi.",
    anchor: "Asosiy analizator",
    right: "Yon panel",
    overlayLabel: "Shared curve frame",
  },
  interpolation: {
    split: "Exact, estimate va edge behaviourni yonma-yon tuting.",
    overlay: "Bir xil scale ichida shape va overshootni ko'ring.",
    compose: "Sample -> interpolate -> smooth pipeline quriladi.",
    anchor: "Asosiy analizator",
    right: "Yon panel",
    overlayLabel: "Shared curve frame",
  },
};

function moveListItem<T extends string>(items: readonly T[], item: T, direction: "left" | "right"): T[] {
  const index = items.indexOf(item);
  if (index === -1) return [...items];
  const nextIndex = direction === "left" ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= items.length) return [...items];

  const next = [...items];
  [next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!];
  return next;
}

type MethodTabWorkspaceProps = {
  tabs: MethodTabWorkspaceOption[];
  activeTabId: string;
  dockedTabId: string | null;
  dockSide: DockSide;
  onActivateTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onDockTab: (tabId: string, side: DockSide) => void;
  onUndockTab: () => void;
  renderPanel: (tabId: string) => ReactNode;
};

function MethodTabWorkspace({
  tabs,
  activeTabId,
  dockedTabId,
  dockSide,
  onActivateTab,
  onCloseTab,
  onDockTab,
  onUndockTab,
  renderPanel,
}: MethodTabWorkspaceProps) {
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null;
  const dockedTab = dockedTabId ? tabs.find((tab) => tab.id === dockedTabId) ?? null : null;
  const splitEnabled = Boolean(activeTab && dockedTab && dockedTab.id !== activeTab.id);

  if (!activeTab) {
    return <div className="flex h-full items-center justify-center text-sm text-[#8fb0be]">Metod tanlang.</div>;
  }

  const mainPanel = renderPanel(activeTab.id);
  const sidePanel = splitEnabled && dockedTab ? renderPanel(dockedTab.id) : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 overflow-x-auto border-b border-white/10 bg-[#07111a] px-3 py-3">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab.id;
          const isDocked = dockedTab?.id === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              draggable
              onDragStart={(event) => {
                setDraggingTabId(tab.id);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("application/x-method-tab", tab.id);
              }}
              onDragEnd={() => setDraggingTabId(null)}
              onClick={() => onActivateTab(tab.id)}
              className={`group flex items-center gap-2 rounded-t-2xl border px-3 py-2 text-sm transition ${
                isActive
                  ? "border-[#7dd3fc] bg-[#0f3041] text-white"
                  : "border-white/10 bg-white/5 text-[#cfe2ea] hover:bg-white/10"
              }`}
            >
              <span className="size-2 rounded-full" style={{ background: tab.color }} />
              <span className="whitespace-nowrap">{tab.name}</span>
              {isDocked ? <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-100">Docked</span> : null}
              {tabs.length > 1 ? (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onCloseTab(tab.id);
                    }
                  }}
                  className="rounded-full px-1.5 py-0.5 text-xs text-[#8fb0be] group-hover:bg-white/10"
                >
                  x
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#07131d]">
        {draggingTabId ? (
          <>
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const tabId = event.dataTransfer.getData("application/x-method-tab") || draggingTabId;
                if (tabId) onDockTab(tabId, "left");
                setDraggingTabId(null);
              }}
              className="absolute left-3 top-1/2 z-20 flex h-32 w-10 -translate-y-1/2 items-center justify-center rounded-2xl border border-dashed border-[#7dd3fc]/40 bg-[#07111a]/84 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8fb0be]"
            >
              L
            </div>
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const tabId = event.dataTransfer.getData("application/x-method-tab") || draggingTabId;
                if (tabId) onDockTab(tabId, "right");
                setDraggingTabId(null);
              }}
              className="absolute right-3 top-1/2 z-20 flex h-32 w-10 -translate-y-1/2 items-center justify-center rounded-2xl border border-dashed border-[#7dd3fc]/40 bg-[#07111a]/84 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8fb0be]"
            >
              R
            </div>
          </>
        ) : null}

        {splitEnabled && sidePanel ? (
          <div className="grid h-full grid-cols-2 gap-px bg-white/10">
            {dockSide === "left" ? (
              <>
                <div className="min-h-0 overflow-hidden bg-[#07131d]">{sidePanel}</div>
                <div className="min-h-0 overflow-hidden bg-[#07131d]">{mainPanel}</div>
              </>
            ) : (
              <>
                <div className="min-h-0 overflow-hidden bg-[#07131d]">{mainPanel}</div>
                <div className="min-h-0 overflow-hidden bg-[#07131d]">{sidePanel}</div>
              </>
            )}
          </div>
        ) : (
          <div className="h-full min-h-0 overflow-hidden">{mainPanel}</div>
        )}

        {splitEnabled ? (
          <button
            type="button"
            onClick={onUndockTab}
            className="absolute right-4 top-4 z-20 rounded-full bg-black/35 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm"
          >
            Undock
          </button>
        ) : null}
      </div>
    </div>
  );
}

function CompareDock<TTrace>({
  family,
  title,
  open,
  options,
  activeMethodId,
  rightSplitMethodId,
  overlayMethodIds,
  onPromoteMethod,
  onAssignRightSplitMethod,
  onToggleOverlayMethod,
  onRemoveRightSplitMethod,
  onClearOverlayMethods,
  compareViewMode,
  onChangeCompareViewMode,
  cameraLinkEnabled,
  onToggleCameraLink,
  composeSelection,
  onDropComposeMethod,
  onRemoveComposeMethod,
  onMoveComposeMethod,
  onClearComposeSelection,
  compositionMode,
  onChangeCompositionMode,
  compatibilityReason,
  compositionSummary,
  overlayWarning,
}: CompareDockProps<TTrace>) {
  if (!open) return null;

  const familyCopy = compareFamilyCopy[family];
  const activeOption = options.find((item) => item.id === activeMethodId) ?? null;
  const rightSplitOption = rightSplitMethodId ? options.find((item) => item.id === rightSplitMethodId) ?? null : null;
  const overlayOptions = overlayMethodIds
    .map((methodId) => options.find((item) => item.id === methodId) ?? null)
    .filter((option): option is CompareMethodOption<TTrace> => option !== null);
  const compareHint = compareViewMode === "split" ? familyCopy.split : familyCopy.overlay;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="pointer-events-auto absolute inset-x-4 top-4 rounded-2xl border border-white/10 bg-[#07111a]/88 p-4 text-white shadow-2xl backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8fb0be]">{title}</div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#d6e7ef]">{compareHint}</p>
            <p className="mt-1 text-xs leading-5 text-[#8fb0be]">{familyCopy.compose}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["split", "overlay"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onChangeCompareViewMode(mode)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${
                  compareViewMode === mode ? "bg-[#7dd3fc] text-[#08121a]" : "bg-white/8 text-[#cde2eb]"
                }`}
              >
                {mode}
              </button>
            ))}
            <button
              type="button"
              onClick={onToggleCameraLink}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${
                cameraLinkEnabled ? "bg-emerald-400/15 text-emerald-100" : "bg-white/8 text-[#cde2eb]"
              }`}
            >
              {cameraLinkEnabled ? "Camera linked" : "Camera free"}
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {options.map((option) => {
            const isPrimary = option.id === activeMethodId;
            const pinned = option.id === rightSplitMethodId || overlayMethodIds.includes(option.id) || composeSelection.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "copy";
                  event.dataTransfer.setData("application/x-compare-method", option.id);
                }}
                onClick={() => {
                  if (isPrimary) return;
                  onToggleOverlayMethod(option.id);
                  onChangeCompareViewMode("overlay");
                }}
                className={`min-w-[150px] rounded-xl border px-3 py-2 text-left text-sm transition ${
                  isPrimary
                    ? "border-[#7dd3fc] bg-[#0f3041]"
                    : pinned
                      ? "border-emerald-300/35 bg-emerald-400/10"
                      : "border-white/10 bg-black/15 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-semibold">{option.name}</span>
                  <span className="size-2 rounded-full" style={{ background: option.color }} />
                </div>
                <div className="mt-2 text-[11px] text-[#a9c2cd]">{option.primaryMetric}</div>
                <div className="text-[11px] text-[#7fa0ae]">{option.secondaryMetric}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const methodId = event.dataTransfer.getData("application/x-compare-method");
          if (methodId) onPromoteMethod(methodId);
        }}
        className="pointer-events-auto absolute left-4 top-1/2 w-64 -translate-y-1/2 rounded-2xl border border-dashed border-[#7dd3fc]/35 bg-[#07111a]/84 p-4 text-white shadow-xl backdrop-blur"
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8fb0be]">{familyCopy.anchor}</div>
        <div className="mt-3 rounded-xl border border-[#7dd3fc]/30 bg-[#0f3041] p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-sm font-semibold">{activeOption?.name ?? activeMethodId}</span>
            <span className="size-2 rounded-full" style={{ background: activeOption?.color ?? "#7dd3fc" }} />
          </div>
          <p className="mt-2 text-xs leading-5 text-[#cde2eb]">Bu slotga tashlangan metod analyzerning asosiy markaziga aylanadi.</p>
        </div>
      </div>

      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const methodId = event.dataTransfer.getData("application/x-compare-method");
          if (methodId) {
            onAssignRightSplitMethod(methodId);
            onChangeCompareViewMode("split");
          }
        }}
        className="pointer-events-auto absolute right-4 top-1/2 w-64 -translate-y-1/2 rounded-2xl border border-dashed border-emerald-300/35 bg-[#07111a]/84 p-4 text-white shadow-xl backdrop-blur"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8fb0be]">{familyCopy.right}</div>
          {rightSplitOption ? (
            <button type="button" onClick={onRemoveRightSplitMethod} className="text-[11px] font-semibold text-[#8fb0be]">
              Clear
            </button>
          ) : null}
        </div>
        {rightSplitOption ? (
          <div className="mt-3 rounded-xl border border-emerald-300/25 bg-emerald-400/10 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-sm font-semibold">{rightSplitOption.name}</span>
              <span className="size-2 rounded-full" style={{ background: rightSplitOption.color }} />
            </div>
            <p className="mt-2 text-xs leading-5 text-[#cde2eb]">Split rejimda asosiy metod bilan sinxron kamera orqali ko'rsatiladi.</p>
          </div>
        ) : (
          <p className="mt-3 text-xs leading-5 text-[#cde2eb]">Methodni shu slotga tashlang va yonma-yon compare ochiladi.</p>
        )}
      </div>

      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const methodId = event.dataTransfer.getData("application/x-compare-method");
          if (methodId) {
            onToggleOverlayMethod(methodId);
            onChangeCompareViewMode("overlay");
          }
        }}
        className="pointer-events-auto absolute left-1/2 top-[8.75rem] w-[min(32rem,calc(100%-10rem))] -translate-x-1/2 rounded-2xl border border-dashed border-amber-300/35 bg-[#07111a]/84 p-4 text-white shadow-xl backdrop-blur"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8fb0be]">{familyCopy.overlayLabel}</div>
          {overlayOptions.length > 0 ? (
            <button type="button" onClick={onClearOverlayMethods} className="text-[11px] font-semibold text-[#8fb0be]">
              Clear overlay
            </button>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {overlayOptions.length > 0 ? (
            overlayOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onToggleOverlayMethod(option.id)}
                className="rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-white"
              >
                {option.name}
              </button>
            ))
          ) : (
            <span className="text-xs text-[#cde2eb]">Methodlarni shu slotga tashlang, ular bir xil koordinata frame ichida overlay bo'ladi.</span>
          )}
        </div>
        {overlayWarning ? <p className="mt-3 text-xs leading-5 text-amber-100">{overlayWarning}</p> : null}
      </div>

      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const methodId = event.dataTransfer.getData("application/x-compare-method");
          if (methodId) onDropComposeMethod(methodId);
        }}
        className="pointer-events-auto absolute inset-x-4 bottom-4 rounded-2xl border border-dashed border-[#7dd3fc]/35 bg-[#07111a]/88 p-4 text-white shadow-2xl backdrop-blur"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8fb0be]">Compose rail</div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#d6e7ef]">Methodni shu railga tashlang. Har blok composition tartibini bildiradi va yangi operator yoki metod pipeline uchun tayyor scaffold bo'ladi.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["pipeline", "fused"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onChangeCompositionMode(mode)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${
                  compositionMode === mode ? "bg-[#7dd3fc] text-[#08121a]" : "bg-white/8 text-[#cde2eb]"
                }`}
              >
                {mode}
              </button>
            ))}
            {composeSelection.length > 0 ? (
              <button type="button" onClick={onClearComposeSelection} className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#cde2eb]">
                Clear rail
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {composeSelection.length > 0 ? (
            composeSelection.map((methodId, index) => {
              const option = options.find((item) => item.id === methodId);
              if (!option) return null;
              return (
                <div key={`${methodId}-${index}`} className="rounded-2xl border border-white/10 bg-white/6 px-3 py-3">
                  <div className="flex items-start gap-3">
                    <span className="rounded-full bg-[#7dd3fc] px-2 py-1 text-[11px] font-semibold text-[#08121a]">{index + 1}</span>
                    <div className="min-w-[150px]">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">{option.name}</span>
                        <span className="size-2 rounded-full" style={{ background: option.color }} />
                      </div>
                      <div className="mt-1 text-[11px] text-[#8fb0be]">{option.primaryMetric}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2 text-[11px] font-semibold">
                    <button type="button" onClick={() => onMoveComposeMethod(methodId, "left")} className="rounded-full bg-white/8 px-2 py-1 text-[#cde2eb]">
                      Left
                    </button>
                    <button type="button" onClick={() => onMoveComposeMethod(methodId, "right")} className="rounded-full bg-white/8 px-2 py-1 text-[#cde2eb]">
                      Right
                    </button>
                    <button type="button" onClick={() => onRemoveComposeMethod(methodId)} className="rounded-full bg-rose-400/15 px-2 py-1 text-rose-100">
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <span className="text-xs text-[#8fb0be]">Methodlarni sahnadan shu railga tashlang va yangi composition tartibini yig'ing.</span>
          )}
        </div>
        <div className="mt-4 rounded-xl bg-black/20 p-3 text-xs leading-5 text-[#cde2eb]">
          <div>{compatibilityReason}</div>
          <div className="mt-2 text-[#8fb0be]">
            operators={compositionSummary.operatorCount} connections={compositionSummary.connectionCount} cross-family={compositionSummary.isCrossFamily ? "yes" : "no"}
          </div>
        </div>
      </div>
    </div>
  );
}

const workspaceWindowMeta: Record<CompareWorkspaceWindowKind, { label: string; description: string }> = {
  primary: { label: "3D Scene", description: "Asosiy katta geometriya oynasi." },
  analyze: { label: "2D Analyze", description: "Aniq diagnostika va trace paneli." },
  split: { label: "Split Compare", description: "Yonma-yon taqqoslash." },
  overlay: { label: "Overlay Compare", description: "Bir frame ichida ustma-ust taqqoslash." },
  compose: { label: "Compose Rail", description: "Yangi operator/metod pipeline yig'ish." },
};

function windowGridClass(windowCount: number) {
  if (windowCount <= 1) return "grid-cols-1";
  if (windowCount === 2) return "grid-cols-1 xl:grid-cols-2";
  return "grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3";
}

type CompareWorkspaceProps<TTrace> = {
  family: CompareFamilyKind;
  title: string;
  open: boolean;
  windowKinds: CompareWorkspaceWindowKind[];
  onOpenWindow: (kind: CompareWorkspaceWindowKind) => void;
  onCloseWindow: (kind: CompareWorkspaceWindowKind) => void;
  onMoveWindow: (kind: CompareWorkspaceWindowKind, direction: "left" | "right") => void;
  options: CompareMethodOption<TTrace>[];
  activeMethodId: string;
  onPromoteMethod: (methodId: string) => void;
  primarySpec: VisualSceneSpec;
  overlaySpec: VisualSceneSpec;
  splitItems: CompareSceneItem[];
  linkedCamera: boolean;
  analyzeNode: ReactNode;
  rightSplitMethodId: string | null;
  onAssignRightSplitMethod: (methodId: string) => void;
  overlayMethodIds: string[];
  onToggleOverlayMethod: (methodId: string) => void;
  composeSelection: string[];
  onAddComposeMethod: (methodId: string) => void;
  onRemoveComposeMethod: (methodId: string) => void;
  onMoveComposeMethod: (methodId: string, direction: "left" | "right") => void;
  compositionMode: OperatorCompositionMode;
  onChangeCompositionMode: (mode: OperatorCompositionMode) => void;
  compositionSummary: ReturnType<typeof summarizeOperatorComposition>;
  compatibilityReason: string;
  overlayWarning: string | null;
};

function CompareWorkspace<TTrace>({
  family,
  title,
  open,
  windowKinds,
  onOpenWindow,
  onCloseWindow,
  onMoveWindow,
  options,
  activeMethodId,
  onPromoteMethod,
  primarySpec,
  overlaySpec,
  splitItems,
  linkedCamera,
  analyzeNode,
  rightSplitMethodId,
  onAssignRightSplitMethod,
  overlayMethodIds,
  onToggleOverlayMethod,
  composeSelection,
  onAddComposeMethod,
  onRemoveComposeMethod,
  onMoveComposeMethod,
  compositionMode,
  onChangeCompositionMode,
  compositionSummary,
  compatibilityReason,
  overlayWarning,
}: CompareWorkspaceProps<TTrace>) {
  if (!open) return null;

  const copy = compareFamilyCopy[family];

  return (
    <div className="absolute inset-0 overflow-auto bg-[#061018] text-white">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-[#07111a]/92 px-4 py-4 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8fb0be]">{title}</div>
            <h2 className="mt-2 text-2xl font-semibold">Workspace</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#cfe2ea]">
              Revit uslubidagi ish maydoni: bitta katta oyna asosiy bo'ladi, qolgan compare va compose oynalarni user o'zi ochadi.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(workspaceWindowMeta) as CompareWorkspaceWindowKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => onOpenWindow(kind)}
                disabled={windowKinds.includes(kind)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${
                  windowKinds.includes(kind) ? "bg-white/10 text-[#6e8794]" : "bg-[#7dd3fc] text-[#08121a]"
                }`}
              >
                {workspaceWindowMeta[kind].label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {options.map((option) => {
            const isPrimary = option.id === activeMethodId;
            const inSplit = option.id === rightSplitMethodId;
            const inOverlay = overlayMethodIds.includes(option.id);
            const inCompose = composeSelection.includes(option.id);
            return (
              <div
                key={option.id}
                className={`min-w-[220px] rounded-2xl border px-3 py-3 ${
                  isPrimary ? "border-[#7dd3fc] bg-[#0f3041]" : "border-white/10 bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold">{option.name}</span>
                  <span className="size-2 rounded-full" style={{ background: option.color }} />
                </div>
                <div className="mt-2 text-[11px] text-[#a9c2cd]">{option.primaryMetric}</div>
                <div className="text-[11px] text-[#7fa0ae]">{option.secondaryMetric}</div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => onPromoteMethod(option.id)}
                    className={`rounded-full px-2 py-1 ${isPrimary ? "bg-[#7dd3fc] text-[#08121a]" : "bg-white/8 text-[#dbe9ef]"}`}
                  >
                    Primary
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAssignRightSplitMethod(option.id);
                      onOpenWindow("split");
                    }}
                    className={`rounded-full px-2 py-1 ${inSplit ? "bg-emerald-400/20 text-emerald-100" : "bg-white/8 text-[#dbe9ef]"}`}
                  >
                    Split
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onToggleOverlayMethod(option.id);
                      onOpenWindow("overlay");
                    }}
                    className={`rounded-full px-2 py-1 ${inOverlay ? "bg-amber-400/20 text-amber-100" : "bg-white/8 text-[#dbe9ef]"}`}
                  >
                    Overlay
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAddComposeMethod(option.id);
                      onOpenWindow("compose");
                    }}
                    className={`rounded-full px-2 py-1 ${inCompose ? "bg-fuchsia-400/20 text-fuchsia-100" : "bg-white/8 text-[#dbe9ef]"}`}
                  >
                    Compose
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`grid ${windowGridClass(windowKinds.length)} gap-4 p-4`}>
        {windowKinds.map((kind, index) => (
          <div
            key={kind}
            className={`min-h-[360px] overflow-hidden rounded-3xl border border-white/10 bg-[#0a1620] shadow-2xl ${
              index === 0 ? "xl:col-span-2" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-white">{workspaceWindowMeta[kind].label}</div>
                <div className="mt-1 text-xs text-[#8fb0be]">{workspaceWindowMeta[kind].description}</div>
              </div>
              <div className="flex gap-2 text-[11px] font-semibold">
                <button type="button" onClick={() => onMoveWindow(kind, "left")} className="rounded-full bg-white/8 px-2 py-1 text-[#dbe9ef]">
                  Left
                </button>
                <button type="button" onClick={() => onMoveWindow(kind, "right")} className="rounded-full bg-white/8 px-2 py-1 text-[#dbe9ef]">
                  Right
                </button>
                {kind !== "primary" ? (
                  <button type="button" onClick={() => onCloseWindow(kind)} className="rounded-full bg-rose-400/15 px-2 py-1 text-rose-100">
                    Close
                  </button>
                ) : null}
              </div>
            </div>

            {kind === "primary" ? (
              <div className="relative h-[calc(100%-4.25rem)] min-h-[320px]">
                <VisualScene spec={primarySpec} cameraMode="follow-spec" className="absolute inset-0" />
              </div>
            ) : null}

            {kind === "analyze" ? <div className="h-[calc(100%-4.25rem)] overflow-auto p-4">{analyzeNode}</div> : null}

            {kind === "split" ? (
              rightSplitMethodId ? (
                <div className="h-[calc(100%-4.25rem)]">
                  <SplitCompareScenes items={splitItems} linkedCamera={linkedCamera} />
                </div>
              ) : (
                <div className="p-4">
                  <p className="text-sm leading-6 text-[#cfe2ea]">{copy.split}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {options.filter((option) => option.id !== activeMethodId).map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => onAssignRightSplitMethod(option.id)}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        {option.name}
                      </button>
                    ))}
                  </div>
                </div>
              )
            ) : null}

            {kind === "overlay" ? (
              <div className="relative h-[calc(100%-4.25rem)] min-h-[320px]">
                <VisualScene spec={overlaySpec} cameraMode="follow-spec" className="absolute inset-0" />
                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  {overlayMethodIds.length > 0 ? (
                    overlayMethodIds.map((methodId) => {
                      const option = options.find((item) => item.id === methodId);
                      if (!option) return null;
                      return (
                        <button
                          key={methodId}
                          type="button"
                          onClick={() => onToggleOverlayMethod(methodId)}
                          className="rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-white"
                        >
                          {option.name}
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl bg-black/35 px-3 py-2 text-xs text-[#dbe9ef]">Overlay uchun metod tanlang.</div>
                  )}
                </div>
                {overlayWarning ? (
                  <div className="absolute bottom-4 left-4 max-w-md rounded-2xl bg-amber-300/15 px-3 py-2 text-xs leading-5 text-amber-100">
                    {overlayWarning}
                  </div>
                ) : null}
              </div>
            ) : null}

            {kind === "compose" ? (
              <div className="h-[calc(100%-4.25rem)] overflow-auto p-4">
                <div className="flex flex-wrap gap-2">
                  {(["pipeline", "fused"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onChangeCompositionMode(mode)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${
                        compositionMode === mode ? "bg-[#7dd3fc] text-[#08121a]" : "bg-white/8 text-[#cde2eb]"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {composeSelection.length > 0 ? (
                    composeSelection.map((methodId, itemIndex) => {
                      const option = options.find((item) => item.id === methodId);
                      if (!option) return null;
                      return (
                        <div key={`${methodId}-${itemIndex}`} className="rounded-2xl border border-white/10 bg-white/6 px-3 py-3">
                          <div className="flex items-start gap-3">
                            <span className="rounded-full bg-[#7dd3fc] px-2 py-1 text-[11px] font-semibold text-[#08121a]">{itemIndex + 1}</span>
                            <div className="min-w-[150px]">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-semibold">{option.name}</span>
                                <span className="size-2 rounded-full" style={{ background: option.color }} />
                              </div>
                              <div className="mt-1 text-[11px] text-[#8fb0be]">{option.primaryMetric}</div>
                            </div>
                          </div>
                          <div className="mt-3 flex gap-2 text-[11px] font-semibold">
                            <button type="button" onClick={() => onMoveComposeMethod(methodId, "left")} className="rounded-full bg-white/8 px-2 py-1 text-[#cde2eb]">
                              Left
                            </button>
                            <button type="button" onClick={() => onMoveComposeMethod(methodId, "right")} className="rounded-full bg-white/8 px-2 py-1 text-[#cde2eb]">
                              Right
                            </button>
                            <button type="button" onClick={() => onRemoveComposeMethod(methodId)} className="rounded-full bg-rose-400/15 px-2 py-1 text-rose-100">
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-[#8fb0be]">
                      Methodlarni yuqoridagi chiplar orqali Compose ga qo'shing.
                    </div>
                  )}
                </div>
                <div className="mt-4 rounded-2xl bg-black/20 p-3 text-xs leading-5 text-[#cde2eb]">
                  <div>{compatibilityReason}</div>
                  <div className="mt-2 text-[#8fb0be]">
                    operators={compositionSummary.operatorCount} connections={compositionSummary.connectionCount} cross-family={compositionSummary.isCrossFamily ? "yes" : "no"}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function SplitCompareScenes({
  items,
  linkedCamera,
}: {
  items: CompareSceneItem[];
  linkedCamera: boolean;
}) {
  const [cameraPose, setCameraPose] = useState<VisualSceneCameraPoseState | null>(null);

  return (
    <div className="grid h-full auto-rows-fr gap-3 p-4 lg:grid-cols-2">
      {items.map((item) => (
        <div key={item.id} className="relative min-h-[260px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b1620]">
          <VisualScene
            spec={item.spec}
            cameraMode="preserve"
            className="absolute inset-0"
            syncedCameraPose={linkedCamera ? cameraPose : null}
            onCameraPoseChange={linkedCamera ? setCameraPose : undefined}
          />
          <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
            <span className="rounded-full px-3 py-1 text-[11px] font-semibold text-[#08121a]" style={{ background: item.color }}>
              {item.name}
            </span>
            <span className="rounded-full bg-black/35 px-3 py-1 text-[11px] font-semibold text-[#e7f3f8]">{item.subtitle}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function MatrixLab({ onOpenFamily }: { onOpenFamily: (familyId: string) => void }) {
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [expandedPanel, setExpandedPanel] = useState<"main" | "secondary" | "residual" | "diagnostics" | null>(null);
  const [methodId, setMethodId] = useState<MatrixMethodId>("jacobi");
  const [customMethodInput, setCustomMethodInput] = useState("sor omega=1.14");
  const [useCustomMethod, setUseCustomMethod] = useState(false);
  const [exampleId, setExampleId] = useState<MatrixExampleId>("spd-balance");
  const [iterations, setIterations] = useState(matrixExamples[0].defaultIterations);
  const [showTransform, setShowTransform] = useState(true);
  const [showResidual, setShowResidual] = useState(true);
  const [showComparison, setShowComparison] = useState(true);
  const [openMethodTabs, setOpenMethodTabs] = useState<string[]>(["jacobi"]);
  const [dockedMethodTabId, setDockedMethodTabId] = useState<string | null>(null);
  const [dockSide, setDockSide] = useState<DockSide>("right");
  const [composeSelection, setComposeSelection] = useState<string[]>([]);
  const [compositionMode, setCompositionMode] = useState<OperatorCompositionMode>("pipeline");
  const [cameraLinkEnabled, setCameraLinkEnabled] = useState(true);

  const customMethod = useMemo(() => compileCustomMatrixMethod(customMethodInput), [customMethodInput]);
  const presetMethod = matrixMethods.find((item) => item.id === methodId) ?? matrixMethods[0]!;
  const method = useCustomMethod ? customMethod.method : presetMethod;
  const example = matrixExamples.find((item) => item.id === exampleId) ?? matrixExamples[0]!;

  useEffect(() => {
    setIterations(example.defaultIterations);
    setExpandedPanel(null);
  }, [example]);

  const trace = useMemo(() => buildMatrixTrace(method, example, { iterations }), [example, iterations, method]);
  const comparisonTraces = useMemo(
    () => matrixMethods.filter((item) => item.id !== presetMethod.id && item.mode === method.mode).map((item) => buildMatrixTrace(item, example, { iterations })),
    [example, iterations, method.mode, presetMethod.id],
  );
  const comparisonMethodIds = useMemo(() => comparisonTraces.map((item) => item.metadata.methodId), [comparisonTraces]);
  const filteredComparisonTraces = useMemo(() => comparisonTraces, [comparisonTraces]);
  const sceneSpec = useMemo(
    () =>
      createMatrixTraceSceneSpec(trace, {
        showBasis: showTransform,
        showOrbit: true,
        showComparison: false,
        comparisonTraces: [],
      }),
    [showTransform, trace],
  );
  const compareOptions = useMemo<CompareMethodOption<ReturnType<typeof buildMatrixTrace>>[]>(
    () => [
      {
        id: method.id,
        name: method.name,
        color: method.color,
        trace,
        artifact: createMatrixWorkbenchArtifact(trace),
        primaryMetric: `res ${trace.steps.at(-1)!.residual.toExponential(1)}`,
        secondaryMetric: trace.convergenceKind,
      },
      ...comparisonTraces.map((item) => ({
        id: item.metadata.methodId,
        name: item.metadata.methodName,
        color: matrixMethodColor(item.metadata.methodId),
        trace: item,
        artifact: createMatrixWorkbenchArtifact(item),
        primaryMetric: `res ${item.steps.at(-1)!.residual.toExponential(1)}`,
        secondaryMetric: item.convergenceKind,
      })),
    ],
    [comparisonTraces, method.color, method.id, method.name, trace],
  );
  const composeArtifacts = useMemo(
    () =>
      composeSelection
        .map((methodId) => compareOptions.find((item) => item.id === methodId)?.artifact ?? null)
        .filter((item): item is OperatorWorkbenchArtifact => item !== null),
    [compareOptions, composeSelection],
  );
  const composition = useMemo(
    () =>
      composeArtifacts.length > 0
        ? createCompositionFromWorkbenchArtifacts(composeArtifacts, operatorRegistry, {
            mode: compositionMode,
            nodeIds: composeArtifacts.map((item, index) => `${item.methodId}-${index}`),
          })
        : null,
    [composeArtifacts, compositionMode],
  );
  const compositionCompatibility = useMemo(
    () =>
      composeArtifacts.length > 0
        ? evaluateWorkbenchCompatibility(composeArtifacts, compositionMode)
        : null,
    [composeArtifacts, compositionMode],
  );
  const compositionSummary = useMemo(
    () => (composition ? summarizeOperatorComposition(composition) : EMPTY_COMPOSITION_SUMMARY),
    [composition],
  );
  const availableTabIds = useMemo(() => new Set([method.id, ...comparisonMethodIds]), [comparisonMethodIds, method.id]);
  const visibleMethodTabs = useMemo(
    () => openMethodTabs.filter((tabId) => availableTabIds.has(tabId)),
    [availableTabIds, openMethodTabs],
  );
  const workspaceTabs = useMemo<MethodTabWorkspaceOption[]>(
    () =>
      visibleMethodTabs
        .map((tabId) => compareOptions.find((item) => item.id === tabId) ?? null)
        .filter((item): item is CompareMethodOption<ReturnType<typeof buildMatrixTrace>> => item !== null)
        .map((item) => ({ id: item.id, name: item.name, color: item.color })),
    [compareOptions, visibleMethodTabs],
  );

  function openMatrixMethodTab(nextMethodId: MatrixMethodId) {
    setUseCustomMethod(false);
    setMethodId(nextMethodId);
    setOpenMethodTabs((current) => (current.includes(nextMethodId) ? current : [...current, nextMethodId]));
  }

  function closeMatrixMethodTab(tabId: string) {
    setOpenMethodTabs((current) => {
      const next = current.filter((item) => item !== tabId);
      if (dockedMethodTabId === tabId) setDockedMethodTabId(null);
      if (tabId === method.id) {
        const fallback = next.at(-1);
        if (fallback) {
          setUseCustomMethod(false);
          setMethodId(fallback as MatrixMethodId);
        }
      }
      return next.length > 0 ? next : [method.id];
    });
  }

  function renderMatrixTabPanel(tabId: string) {
    const tabTrace = tabId === method.id ? trace : comparisonTraces.find((item) => item.metadata.methodId === tabId) ?? trace;
    if (viewMode === "3d") {
      const tabSceneSpec = createMatrixTraceSceneSpec(tabTrace, {
        showBasis: showTransform,
        showOrbit: true,
        showComparison: false,
      });
      return <VisualScene spec={tabSceneSpec} cameraMode="follow-spec" className="h-full w-full" />;
    }
    return (
      <div className="h-full overflow-auto bg-[#eff5f6] p-5">
        <MatrixAnalyzeView
          comparisonTraces={[]}
          example={example}
          expandedPanel={expandedPanel}
          onExpandPanel={setExpandedPanel}
          showComparison={false}
          showResidual={showResidual}
          showTransform={showTransform}
          trace={tabTrace}
        />
      </div>
    );
  }
  const finalStep = trace.steps.at(-1)!;
  const matrixResearchScore = Math.max(0, Math.min(100, 100 - Math.min(40, Math.log10(finalStep.residual + 1e-12) * 12 + 40) - trace.turnCount * 2 - Math.min(20, trace.finalRayleighError * 15)));
  const statusMeta =
    trace.convergenceKind === "converging"
      ? { label: "Converging", className: "bg-[#dcfce7] text-[#166534]" }
      : trace.convergenceKind === "stalling"
        ? { label: "Stalling", className: "bg-[#fef3c7] text-[#92400e]" }
        : trace.convergenceKind === "oscillating"
          ? { label: "Oscillating", className: "bg-[#ede9fe] text-[#6d28d9]" }
          : { label: "Diverging", className: "bg-[#fee2e2] text-[#991b1b]" };

  return (
    <main className="h-screen overflow-hidden bg-[#f4f7f8] text-[#152026]">
      <section className="grid h-screen grid-rows-[minmax(0,52vh)_minmax(0,48vh)] overflow-hidden lg:grid-cols-[430px_1fr] lg:grid-rows-1">
        <aside className="relative z-10 order-2 min-h-0 overflow-y-auto border-t border-[#d8e0e3] bg-[#fbfcfc] p-5 lg:order-1 lg:h-screen lg:border-r lg:border-t-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded bg-[#14222b] text-white">
              <GitCompare size={21} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5c717c]">OperatorLab Matrix</p>
              <h1 className="text-2xl font-semibold">{method.name}</h1>
            </div>
          </div>

          <OperatorFamilyNav current="matrix" onOpenFamily={onOpenFamily} />

          <div className="mt-6 space-y-5">
            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="text-sm font-semibold text-[#31424b]">Metod</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {matrixMethods.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openMatrixMethodTab(item.id)}
                    className={`min-h-10 rounded border px-3 text-left text-sm font-medium ${
                      !useCustomMethod && item.id === presetMethod.id ? "border-[#14222b] bg-[#14222b] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
                    }`}
                  >
                    <div>{item.name}</div>
                    <div className={`mt-1 text-[10px] uppercase tracking-[0.12em] ${item.id === method.id ? "text-white/75" : "text-[#647780]"}`}>{item.family ?? item.mode}</div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setUseCustomMethod(true)}
                  className={`min-h-10 rounded border px-3 text-left text-sm font-medium ${
                    useCustomMethod ? "border-[#be123c] bg-[#be123c] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
                  }`}
                >
                  <div>Custom compiled</div>
                  <div className={`mt-1 text-[10px] uppercase tracking-[0.12em] ${useCustomMethod ? "text-white/75" : "text-[#647780]"}`}>registry compiler</div>
                </button>
              </div>
            </div>

            <CustomMethodCard
              title="Custom matrix method"
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
              <div className="text-sm font-semibold text-[#31424b]">System / transform</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {matrixExamples.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setExampleId(item.id)}
                    className={`min-h-10 rounded border px-3 text-left text-sm font-medium ${
                      item.id === example.id ? "border-[#0f766e] bg-[#0f766e] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
                    }`}
                  >
                    <div>{item.shortName}</div>
                    <div className={`mt-1 text-[10px] uppercase tracking-[0.12em] ${item.id === example.id ? "text-white/75" : "text-[#647780]"}`}>{item.tags?.[0] ?? "matrix"}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <Sigma size={17} />
                Model
              </div>
              <div className="mt-3 space-y-4 text-[13px] leading-6 text-[#20303a]">
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#647780]">Misol</div>
                  <LatexBlock latex={matrixExampleLatex(example, trace.problemKind)} />
                </div>
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#647780]">Metod formulasi</div>
                  <LatexBlock latex={matrixMethodLatex(method.id)} />
                </div>
                <div className="rounded border border-[#e2e8f0] bg-[#f8fbfc] px-3 py-2 font-mono text-xs text-[#20303a]">
                  {`lambda_max=${trace.dominantEigenvalue.toFixed(3)}, lambda_min=${trace.smallestEigenvalue.toFixed(3)}`}
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{matrixMethodNarrative(method.id)}</p>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <Slider label="Iterations" value={iterations} min={example.minIterations} max={example.maxIterations} step={1} color="#0f766e" onChange={setIterations} />
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="mb-3 text-sm font-semibold text-[#31424b]">Ko'rinish</div>
              <div className="grid grid-cols-2 gap-2">
                <ToggleButton active={viewMode === "2d"} icon={<ScanSearch size={16} />} label="2D Analyze" onClick={() => setViewMode("2d")} />
                <ToggleButton active={viewMode === "3d"} icon={<Orbit size={16} />} label="3D Explore" onClick={() => setViewMode("3d")} />
              </div>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="grid grid-cols-2 gap-2">
                <ToggleButton active={showTransform} icon={<Layers size={16} />} label="Transform" onClick={() => setShowTransform((value) => !value)} />
                <ToggleButton active={showResidual} icon={<Activity size={16} />} label="Residual" onClick={() => setShowResidual((value) => !value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Metric label="Residual" value={finalStep.residual.toExponential(2)} />
              <Metric label="Error" value={finalStep.error.toExponential(2)} />
              <Metric label="Cond" value={Number.isFinite(trace.conditionNumber) ? trace.conditionNumber.toFixed(2) : "inf"} />
              <Metric label="Rate" value={trace.iterationRadius.toFixed(3)} />
              <Metric label="Status" value={statusMeta.label} />
              <Metric label={trace.mode === "eigen" ? "Angle" : "Gain"} value={trace.mode === "eigen" ? `${(finalStep.angleToTarget * 180 / Math.PI).toFixed(1)}°` : `${trace.improvementFactor.toFixed(1)}x`} />
              <Metric label="Turn" value={`${trace.turnCount}`} />
              <Metric label="Avg ctr" value={trace.averageContraction.toFixed(3)} />
              {trace.problemKind === "least-squares" ? <Metric label="Fit err" value={trace.fitResidual.toExponential(2)} /> : null}
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-[#31424b]">Matrix fingerprint</div>
                <span className={`rounded px-2 py-1 text-xs font-semibold ${statusMeta.className}`}>{statusMeta.label}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded border border-[#e2e8f0] px-2 py-2">
                  <div className="text-[#647780]">Diagonal dominance</div>
                  <div className="mt-1 font-mono text-[#20303a]">{trace.diagonalDominance.toFixed(3)}</div>
                </div>
                <div className="rounded border border-[#e2e8f0] px-2 py-2">
                  <div className="text-[#647780]">SPD</div>
                  <div className="mt-1 font-mono text-[#20303a]">{trace.isSpd ? "yes" : "no"}</div>
                </div>
                <div className="rounded border border-[#e2e8f0] px-2 py-2">
                  <div className="text-[#647780]">Eigen gap</div>
                  <div className="mt-1 font-mono text-[#20303a]">{trace.eigenGap.toFixed(3)}</div>
                </div>
                <div className="rounded border border-[#e2e8f0] px-2 py-2">
                  <div className="text-[#647780]">Target</div>
                  <div className="mt-1 font-mono text-[#20303a]">{trace.targetLabel}</div>
                </div>
                <div className="rounded border border-[#e2e8f0] px-2 py-2">
                  <div className="text-[#647780]">Problem</div>
                  <div className="mt-1 font-mono text-[#20303a]">{trace.problemKind}</div>
                </div>
                <div className="rounded border border-[#e2e8f0] px-2 py-2">
                  <div className="text-[#647780]">Rayleigh drift</div>
                  <div className="mt-1 font-mono text-[#20303a]">{trace.rayleighDrift.toExponential(2)}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(example.tags ?? []).map((tag) => (
                  <span key={tag} className="rounded bg-[#eef4f5] px-2 py-1 text-[11px] font-medium text-[#40525c]">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <GitCompare size={17} />
                Method comparison
              </div>
              <div className="mt-3 space-y-2 text-xs">
                {[trace, ...filteredComparisonTraces].map((item) => (
                  <div
                    key={item.metadata.methodId}
                    className={`grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded border px-2 py-2 ${
                      item.metadata.methodId === trace.metadata.methodId ? "border-[#7dd3fc] bg-[#eef9ff]" : "border-[#e2e8f0]"
                    }`}
                  >
                    <button type="button" onClick={() => openMatrixMethodTab(item.metadata.methodId as MatrixMethodId)} className="truncate text-left font-medium text-[#31424b]">
                      {item.metadata.methodName}
                    </button>
                    <span className="font-mono text-[#0f766e]">r {item.steps.at(-1)!.residual.toExponential(1)}</span>
                    <span className="font-mono text-[#be185d]">{item.convergenceKind}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <TrendingUp size={17} />
                Benchmark
              </div>
              <MatrixBenchmarkSummary selectedTrace={trace} comparisonTraces={comparisonTraces} />
              <BenchmarkLink href={`/analyzer/benchmarks?family=matrix&method=${encodeURIComponent(useCustomMethod ? customMethod.baseMethodId : method.id)}&example=${encodeURIComponent(example.id)}&iterations=${iterations}${useCustomMethod ? `&formula=${encodeURIComponent(customMethodInput)}` : ""}`} />
            </div>

            <ResearchReadinessCard
              title="Practical readiness"
              score={matrixResearchScore}
              family={operatorRegistry.familiesById.matrix}
              summary="Bu qatlam linear algebra'ni amaliy solve, PCA/SVD va conditioning nuqtai nazaridan baholaydi."
              diagnostics={[`res=${finalStep.residual.toExponential(2)}`, `turns=${trace.turnCount}`, `rayleigh=${trace.finalRayleighError.toExponential(2)}`]}
            />

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <ScanSearch size={17} />
                Geometrik talqin
              </div>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{method.geometry}</p>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{method.stability}</p>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{example.interpretation}</p>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{trace.convergenceReason}</p>
              <p className="mt-3 rounded border border-[#e2e8f0] bg-[#f8fbfc] px-3 py-2 font-mono text-xs leading-5 text-[#50626b]">
                {`avg-ctr=${trace.averageContraction.toFixed(3)}  turns=${trace.turnCount}  skew=${trace.residualAxisSkew.toExponential(2)}  rayleigh=${trace.finalRayleighError.toExponential(2)}`}
              </p>
            </div>
          </div>
        </aside>

        <div className={`order-1 min-h-0 lg:order-2 ${viewMode === "3d" ? "overflow-hidden bg-[#07131d]" : "overflow-hidden bg-[#eff5f6]"}`}>
          <MethodTabWorkspace
            tabs={workspaceTabs}
            activeTabId={method.id}
            dockedTabId={dockedMethodTabId}
            dockSide={dockSide}
            onActivateTab={(tabId) => openMatrixMethodTab(tabId as MatrixMethodId)}
            onCloseTab={closeMatrixMethodTab}
            onDockTab={(tabId, side) => {
              if (tabId === method.id) return;
              setDockedMethodTabId(tabId);
              setDockSide(side);
            }}
            onUndockTab={() => setDockedMethodTabId(null)}
            renderPanel={renderMatrixTabPanel}
          />
        </div>
      </section>
    </main>
  );
}

function RootFindingLab({ onOpenFamily }: { onOpenFamily: (familyId: string) => void }) {
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [methodId, setMethodId] = useState<RootFindingMethodId>("bisection");
  const [customMethodInput, setCustomMethodInput] = useState("illinois bracketed false position");
  const [useCustomMethod, setUseCustomMethod] = useState(false);
  const [exampleId, setExampleId] = useState<RootFindingExampleId>("cubic-balance");
  const [iterations, setIterations] = useState(rootFindingExamples[0].defaultIterations);
  const [showGuides, setShowGuides] = useState(true);
  const [showResidual, setShowResidual] = useState(true);
  const [showComparison, setShowComparison] = useState(true);
  const [openMethodTabs, setOpenMethodTabs] = useState<string[]>(["bisection"]);
  const [dockedMethodTabId, setDockedMethodTabId] = useState<string | null>(null);
  const [dockSide, setDockSide] = useState<DockSide>("right");
  const [composeSelection, setComposeSelection] = useState<string[]>([]);
  const [compositionMode, setCompositionMode] = useState<OperatorCompositionMode>("pipeline");
  const [cameraLinkEnabled, setCameraLinkEnabled] = useState(true);

  const customMethod = useMemo(() => compileCustomRootFindingMethod(customMethodInput), [customMethodInput]);
  const presetMethod = rootFindingMethods.find((item) => item.id === methodId) ?? rootFindingMethods[0]!;
  const method = useCustomMethod ? customMethod.method : presetMethod;
  const example = rootFindingExamples.find((item) => item.id === exampleId) ?? rootFindingExamples[0]!;

  useEffect(() => {
    setIterations(example.defaultIterations);
  }, [example]);

  const trace = useMemo(() => buildRootFindingTrace(method, example, { iterations }), [example, iterations, method]);
  const comparisonTraces = useMemo(
    () => rootFindingMethods.filter((item) => item.id !== presetMethod.id).map((item) => buildRootFindingTrace(item, example, { iterations })),
    [example, iterations, presetMethod.id],
  );
  const filteredComparisonTraces = useMemo(() => comparisonTraces, [comparisonTraces]);
  const sceneSpec = useMemo(
    () =>
      createRootFindingTraceSceneSpec(trace, {
        showCurve: true,
        showBracket: showGuides,
        showComparison: false,
        comparisonTraces: [],
        equation: example.equation,
        xRange: example.xRange,
        evaluate: example.evaluate,
        exactRoot: example.exactRoot,
      }),
    [example.equation, example.evaluate, example.exactRoot, example.xRange, showGuides, trace],
  );
  const compareOptions = useMemo<CompareMethodOption<ReturnType<typeof buildRootFindingTrace>>[]>(
    () => [
      {
        id: method.id,
        name: method.name,
        color: method.color,
        trace,
        artifact: createRootFindingWorkbenchArtifact(trace, [], {
          equation: example.equation,
          xRange: example.xRange,
          evaluate: example.evaluate,
          exactRoot: example.exactRoot,
        }),
        primaryMetric: `|f| ${trace.finalResidual.toExponential(1)}`,
        secondaryMetric: `err ${trace.finalError.toExponential(1)}`,
      },
      ...comparisonTraces.map((item) => ({
        id: item.metadata.methodId,
        name: item.metadata.methodName,
        color: rootMethodColor(item.metadata.methodId),
        trace: item,
        artifact: createRootFindingWorkbenchArtifact(item, [], {
          equation: example.equation,
          xRange: example.xRange,
          evaluate: example.evaluate,
          exactRoot: example.exactRoot,
        }),
        primaryMetric: `|f| ${item.finalResidual.toExponential(1)}`,
        secondaryMetric: `err ${item.finalError.toExponential(1)}`,
      })),
    ],
    [comparisonTraces, example.equation, example.evaluate, example.exactRoot, example.xRange, method.color, method.id, method.name, trace],
  );
  const composeArtifacts = useMemo(
    () =>
      composeSelection
        .map((methodId) => compareOptions.find((item) => item.id === methodId)?.artifact ?? null)
        .filter((item): item is OperatorWorkbenchArtifact => item !== null),
    [compareOptions, composeSelection],
  );
  const composition = useMemo(
    () =>
      composeArtifacts.length > 0
        ? createCompositionFromWorkbenchArtifacts(composeArtifacts, operatorRegistry, {
            mode: compositionMode,
            nodeIds: composeArtifacts.map((item, index) => `${item.methodId}-${index}`),
          })
        : null,
    [composeArtifacts, compositionMode],
  );
  const compositionCompatibility = useMemo(
    () =>
      composeArtifacts.length > 0
        ? evaluateWorkbenchCompatibility(composeArtifacts, compositionMode)
        : null,
    [composeArtifacts, compositionMode],
  );
  const compositionSummary = useMemo(
    () => (composition ? summarizeOperatorComposition(composition) : EMPTY_COMPOSITION_SUMMARY),
    [composition],
  );
  const availableTabIds = useMemo(() => new Set([method.id, ...comparisonTraces.map((item) => item.metadata.methodId)]), [comparisonTraces, method.id]);
  const visibleMethodTabs = useMemo(() => openMethodTabs.filter((tabId) => availableTabIds.has(tabId)), [availableTabIds, openMethodTabs]);
  const workspaceTabs = useMemo<MethodTabWorkspaceOption[]>(
    () =>
      visibleMethodTabs
        .map((tabId) => compareOptions.find((item) => item.id === tabId) ?? null)
        .filter((item): item is CompareMethodOption<ReturnType<typeof buildRootFindingTrace>> => item !== null)
        .map((item) => ({ id: item.id, name: item.name, color: item.color })),
    [compareOptions, visibleMethodTabs],
  );

  function openRootMethodTab(nextMethodId: RootFindingMethodId) {
    setUseCustomMethod(false);
    setMethodId(nextMethodId);
    setOpenMethodTabs((current) => (current.includes(nextMethodId) ? current : [...current, nextMethodId]));
  }

  function closeRootMethodTab(tabId: string) {
    setOpenMethodTabs((current) => {
      const next = current.filter((item) => item !== tabId);
      if (dockedMethodTabId === tabId) setDockedMethodTabId(null);
      if (tabId === method.id) {
        const fallback = next.at(-1);
        if (fallback) {
          setUseCustomMethod(false);
          setMethodId(fallback as RootFindingMethodId);
        }
      }
      return next.length > 0 ? next : [method.id];
    });
  }

  function renderRootTabPanel(tabId: string) {
    const tabTrace = tabId === method.id ? trace : comparisonTraces.find((item) => item.metadata.methodId === tabId) ?? trace;
    if (viewMode === "3d") {
      const tabSceneSpec = createRootFindingTraceSceneSpec(tabTrace, {
        showCurve: true,
        showBracket: showGuides,
        showComparison: false,
        equation: example.equation,
        xRange: example.xRange,
        evaluate: example.evaluate,
        exactRoot: example.exactRoot,
      });
      return <VisualScene spec={tabSceneSpec} cameraMode="follow-spec" className="h-full w-full" />;
    }
    return (
      <div className="h-full overflow-auto bg-[#f7f5ef] p-5">
        <RootFindingAnalyzeView comparisonTraces={[]} example={example} showComparison={false} showGuides={showGuides} showResidual={showResidual} trace={tabTrace} />
      </div>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-[#f4f7f8] text-[#152026]">
      <section className="grid h-screen grid-rows-[minmax(0,52vh)_minmax(0,48vh)] overflow-hidden lg:grid-cols-[430px_1fr] lg:grid-rows-1">
        <aside className="relative z-10 order-2 min-h-0 overflow-y-auto border-t border-[#d8e0e3] bg-[#fbfcfc] p-5 lg:order-1 lg:h-screen lg:border-r lg:border-t-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded bg-[#14222b] text-white">
              <Crosshair size={21} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5c717c]">OperatorLab Root</p>
              <h1 className="text-2xl font-semibold">{method.name}</h1>
            </div>
          </div>

          <OperatorFamilyNav current="root-finding" onOpenFamily={onOpenFamily} />

          <div className="mt-6 space-y-5">
            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="text-sm font-semibold text-[#31424b]">Metod</div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {rootFindingMethods.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openRootMethodTab(item.id)}
                    className={`min-h-10 rounded border px-3 text-left text-sm font-medium ${
                      !useCustomMethod && item.id === presetMethod.id ? "border-[#14222b] bg-[#14222b] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setUseCustomMethod(true)}
                  className={`min-h-10 rounded border px-3 text-left text-sm font-medium ${
                    useCustomMethod ? "border-[#be123c] bg-[#be123c] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
                  }`}
                >
                  Custom compiled
                </button>
              </div>
            </div>

            <CustomMethodCard
              title="Custom root method"
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
              <div className="text-sm font-semibold text-[#31424b]">Equation</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {rootFindingExamples.map((item) => (
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
                <Crosshair size={17} />
                Model
              </div>
              <div className="mt-3 space-y-4 text-[13px] leading-6 text-[#20303a]">
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#647780]">Misol</div>
                  <LatexBlock latex={rootExampleLatex(example)} />
                </div>
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#647780]">Metod formulasi</div>
                  <LatexBlock latex={rootMethodLatex(method.id)} />
                </div>
                <div className="rounded border border-[#e2e8f0] bg-[#f8fbfc] px-3 py-2 font-mono text-xs text-[#20303a]">{`root≈${example.exactRoot.toFixed(6)}`}</div>
              </div>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <Slider label="Iterations" value={iterations} min={example.minIterations} max={example.maxIterations} step={1} color="#0f766e" onChange={setIterations} />
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="mb-3 text-sm font-semibold text-[#31424b]">Ko'rinish</div>
              <div className="grid grid-cols-2 gap-2">
                <ToggleButton active={viewMode === "2d"} icon={<ScanSearch size={16} />} label="2D Analyze" onClick={() => setViewMode("2d")} />
                <ToggleButton active={viewMode === "3d"} icon={<Orbit size={16} />} label="3D Explore" onClick={() => setViewMode("3d")} />
              </div>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="grid grid-cols-2 gap-2">
                <ToggleButton active={showGuides} icon={<Layers size={16} />} label="Guides" onClick={() => setShowGuides((value) => !value)} />
                <ToggleButton active={showResidual} icon={<Activity size={16} />} label="Residual" onClick={() => setShowResidual((value) => !value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Metric label="Final |f|" value={trace.finalResidual.toExponential(2)} />
              <Metric label="Root err" value={trace.finalError.toExponential(2)} />
              <Metric label="Bracket" value={trace.finalIntervalWidth.toExponential(2)} />
              <Metric label="x*" value={trace.steps.at(-1)!.x.toFixed(5)} />
              <Metric label="Reduce" value={`${trace.residualReduction.toFixed(1)}x`} />
              <Metric label="Stagn" value={`${trace.stagnationCount}`} />
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <GitCompare size={17} />
                Method comparison
              </div>
              <div className="mt-3 space-y-2 text-xs">
                {[trace, ...filteredComparisonTraces].map((item) => (
                  <div
                    key={item.metadata.methodId}
                    className={`grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded border px-2 py-2 ${
                      item.metadata.methodId === trace.metadata.methodId ? "border-[#7dd3fc] bg-[#eef9ff]" : "border-[#e2e8f0]"
                    }`}
                  >
                    <button type="button" onClick={() => openRootMethodTab(item.metadata.methodId as RootFindingMethodId)} className="truncate text-left font-medium text-[#31424b]">
                      {item.metadata.methodName}
                    </button>
                    <span className="font-mono text-[#0f766e]">f {item.finalResidual.toExponential(1)}</span>
                    <span className="font-mono text-[#be185d]">e {item.finalError.toExponential(1)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <TrendingUp size={17} />
                Benchmark
              </div>
              <RootBenchmarkSummary selectedTrace={trace} comparisonTraces={comparisonTraces} />
              <BenchmarkLink href={`/analyzer/benchmarks?family=root-finding&method=${encodeURIComponent(useCustomMethod ? customMethod.baseMethodId : method.id)}&example=${encodeURIComponent(example.id)}&iterations=${iterations}${useCustomMethod ? `&formula=${encodeURIComponent(customMethodInput)}` : ""}`} />
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <ScanSearch size={17} />
                Geometrik talqin
              </div>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{method.geometry}</p>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{method.stability}</p>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{example.interpretation}</p>
              <div className="mt-3 rounded border border-[#e2e8f0] bg-[#f8fbfc] px-3 py-2 font-mono text-xs text-[#20303a]">
                {`contract=${trace.averageContraction.toFixed(3)}  bracket=${(trace.bracketRetentionRate * 100).toFixed(0)}%  stress=${trace.derivativeStress.toFixed(2)}  oscillation=${trace.oscillationCount}`}
              </div>
            </div>
          </div>
        </aside>

        <div className={`order-1 min-h-0 lg:order-2 ${viewMode === "3d" ? "overflow-hidden bg-[#0d1018]" : "overflow-hidden bg-[#f7f5ef]"}`}>
          <MethodTabWorkspace
            tabs={workspaceTabs}
            activeTabId={method.id}
            dockedTabId={dockedMethodTabId}
            dockSide={dockSide}
            onActivateTab={(tabId) => openRootMethodTab(tabId as RootFindingMethodId)}
            onCloseTab={closeRootMethodTab}
            onDockTab={(tabId, side) => {
              if (tabId === method.id) return;
              setDockedMethodTabId(tabId);
              setDockSide(side);
            }}
            onUndockTab={() => setDockedMethodTabId(null)}
            renderPanel={renderRootTabPanel}
          />
        </div>
      </section>
    </main>
  );
}

function InterpolationLab({ onOpenFamily }: { onOpenFamily: (familyId: string) => void }) {
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [methodId, setMethodId] = useState<InterpolationMethodId>("lagrange");
  const [customMethodInput, setCustomMethodInput] = useState("chebyshev barycentric");
  const [useCustomMethod, setUseCustomMethod] = useState(false);
  const [exampleId, setExampleId] = useState<InterpolationExampleId>("smooth-sine");
  const [nodeCount, setNodeCount] = useState(interpolationExamples[0].defaultNodes);
  const [showExact, setShowExact] = useState(true);
  const [showError, setShowError] = useState(true);
  const [showComparison, setShowComparison] = useState(true);
  const [openMethodTabs, setOpenMethodTabs] = useState<string[]>(["lagrange"]);
  const [dockedMethodTabId, setDockedMethodTabId] = useState<string | null>(null);
  const [dockSide, setDockSide] = useState<DockSide>("right");
  const [composeSelection, setComposeSelection] = useState<string[]>([]);
  const [compositionMode, setCompositionMode] = useState<OperatorCompositionMode>("pipeline");
  const [cameraLinkEnabled, setCameraLinkEnabled] = useState(true);

  const customMethod = useMemo(() => compileCustomInterpolationMethod(customMethodInput), [customMethodInput]);
  const presetMethod = interpolationMethods.find((item) => item.id === methodId) ?? interpolationMethods[0]!;
  const method = useCustomMethod ? customMethod.method : presetMethod;
  const example = interpolationExamples.find((item) => item.id === exampleId) ?? interpolationExamples[0]!;

  useEffect(() => {
    setNodeCount(example.defaultNodes);
  }, [example]);

  const trace = useMemo(() => buildInterpolationTrace(method, example, { nodeCount }), [example, method, nodeCount]);
  const comparisonTraces = useMemo(
    () => interpolationMethods.filter((item) => item.id !== presetMethod.id).map((item) => buildInterpolationTrace(item, example, { nodeCount })),
    [example, nodeCount, presetMethod.id],
  );
  const filteredComparisonTraces = useMemo(() => comparisonTraces, [comparisonTraces]);
  const sceneSpec = useMemo(
    () =>
      createInterpolationTraceSceneSpec(trace, {
        showNodes: true,
        showCurve: showExact,
        showComparison: false,
        comparisonTraces: [],
        formula: example.formula,
        xRange: example.xRange,
        yRange: example.yRange,
      }),
    [example.formula, example.xRange, example.yRange, showExact, trace],
  );
  const compareOptions = useMemo<CompareMethodOption<ReturnType<typeof buildInterpolationTrace>>[]>(
    () => [
      {
        id: method.id,
        name: method.name,
        color: method.color,
        trace,
        artifact: createInterpolationWorkbenchArtifact(trace, [], {
          formula: example.formula,
          xRange: example.xRange,
          yRange: example.yRange,
        }),
        primaryMetric: `max ${trace.maxAbsError.toExponential(1)}`,
        secondaryMetric: `rms ${trace.rmsError.toExponential(1)}`,
      },
      ...comparisonTraces.map((item) => ({
        id: item.metadata.methodId,
        name: item.metadata.methodName,
        color: interpolationMethodColor(item.metadata.methodId),
        trace: item,
        artifact: createInterpolationWorkbenchArtifact(item, [], {
          formula: example.formula,
          xRange: example.xRange,
          yRange: example.yRange,
        }),
        primaryMetric: `max ${item.maxAbsError.toExponential(1)}`,
        secondaryMetric: `rms ${item.rmsError.toExponential(1)}`,
      })),
    ],
    [comparisonTraces, example.formula, example.xRange, example.yRange, method.color, method.id, method.name, trace],
  );
  const composeArtifacts = useMemo(
    () =>
      composeSelection
        .map((methodId) => compareOptions.find((item) => item.id === methodId)?.artifact ?? null)
        .filter((item): item is OperatorWorkbenchArtifact => item !== null),
    [compareOptions, composeSelection],
  );
  const composition = useMemo(
    () =>
      composeArtifacts.length > 0
        ? createCompositionFromWorkbenchArtifacts(composeArtifacts, operatorRegistry, {
            mode: compositionMode,
            nodeIds: composeArtifacts.map((item, index) => `${item.methodId}-${index}`),
          })
        : null,
    [composeArtifacts, compositionMode],
  );
  const compositionCompatibility = useMemo(
    () =>
      composeArtifacts.length > 0
        ? evaluateWorkbenchCompatibility(composeArtifacts, compositionMode)
        : null,
    [composeArtifacts, compositionMode],
  );
  const compositionSummary = useMemo(
    () => (composition ? summarizeOperatorComposition(composition) : EMPTY_COMPOSITION_SUMMARY),
    [composition],
  );
  const availableTabIds = useMemo(() => new Set([method.id, ...comparisonTraces.map((item) => item.metadata.methodId)]), [comparisonTraces, method.id]);
  const visibleMethodTabs = useMemo(() => openMethodTabs.filter((tabId) => availableTabIds.has(tabId)), [availableTabIds, openMethodTabs]);
  const workspaceTabs = useMemo<MethodTabWorkspaceOption[]>(
    () =>
      visibleMethodTabs
        .map((tabId) => compareOptions.find((item) => item.id === tabId) ?? null)
        .filter((item): item is CompareMethodOption<ReturnType<typeof buildInterpolationTrace>> => item !== null)
        .map((item) => ({ id: item.id, name: item.name, color: item.color })),
    [compareOptions, visibleMethodTabs],
  );

  function openInterpolationMethodTab(nextMethodId: InterpolationMethodId) {
    setUseCustomMethod(false);
    setMethodId(nextMethodId);
    setOpenMethodTabs((current) => (current.includes(nextMethodId) ? current : [...current, nextMethodId]));
  }

  function closeInterpolationMethodTab(tabId: string) {
    setOpenMethodTabs((current) => {
      const next = current.filter((item) => item !== tabId);
      if (dockedMethodTabId === tabId) setDockedMethodTabId(null);
      if (tabId === method.id) {
        const fallback = next.at(-1);
        if (fallback) {
          setUseCustomMethod(false);
          setMethodId(fallback as InterpolationMethodId);
        }
      }
      return next.length > 0 ? next : [method.id];
    });
  }

  function renderInterpolationTabPanel(tabId: string) {
    const tabTrace = tabId === method.id ? trace : comparisonTraces.find((item) => item.metadata.methodId === tabId) ?? trace;
    if (viewMode === "3d") {
      const tabSceneSpec = createInterpolationTraceSceneSpec(tabTrace, {
        showNodes: true,
        showCurve: showExact,
        showComparison: false,
        formula: example.formula,
        xRange: example.xRange,
        yRange: example.yRange,
      });
      return <VisualScene spec={tabSceneSpec} cameraMode="follow-spec" className="h-full w-full" />;
    }
    return (
      <div className="h-full overflow-auto bg-[#f3f8f8] p-5">
        <InterpolationAnalyzeView comparisonTraces={[]} example={example} showComparison={false} showError={showError} showExact={showExact} trace={tabTrace} />
      </div>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-[#f4f7f8] text-[#152026]">
      <section className="grid h-screen grid-rows-[minmax(0,52vh)_minmax(0,48vh)] overflow-hidden lg:grid-cols-[430px_1fr] lg:grid-rows-1">
        <aside className="relative z-10 order-2 min-h-0 overflow-y-auto border-t border-[#d8e0e3] bg-[#fbfcfc] p-5 lg:order-1 lg:h-screen lg:border-r lg:border-t-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded bg-[#14222b] text-white">
              <Waves size={21} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5c717c]">OperatorLab Interpolation</p>
              <h1 className="text-2xl font-semibold">{method.name}</h1>
            </div>
          </div>

          <OperatorFamilyNav current="interpolation" onOpenFamily={onOpenFamily} />

          <div className="mt-6 space-y-5">
            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="text-sm font-semibold text-[#31424b]">Metod</div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {interpolationMethods.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openInterpolationMethodTab(item.id)}
                    className={`min-h-10 rounded border px-3 text-left text-sm font-medium ${
                      !useCustomMethod && item.id === presetMethod.id ? "border-[#14222b] bg-[#14222b] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setUseCustomMethod(true)}
                  className={`min-h-10 rounded border px-3 text-left text-sm font-medium ${
                    useCustomMethod ? "border-[#be123c] bg-[#be123c] text-white" : "border-[#cfd9dd] bg-white hover:bg-[#eef4f5]"
                  }`}
                >
                  Custom compiled
                </button>
              </div>
            </div>

            <CustomMethodCard
              title="Custom interpolation method"
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
              <div className="text-sm font-semibold text-[#31424b]">Signal / curve</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {interpolationExamples.map((item) => (
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
                <Waves size={17} />
                Model
              </div>
              <div className="mt-3 space-y-4 text-[13px] leading-6 text-[#20303a]">
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#647780]">Misol</div>
                  <LatexBlock latex={interpolationExampleLatex(example)} />
                </div>
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#647780]">Metod formulasi</div>
                  <LatexBlock latex={interpolationMethodLatex(method.id)} />
                </div>
                <div className="rounded border border-[#e2e8f0] bg-[#f8fbfc] px-3 py-2 font-mono text-xs text-[#20303a]">{method.order}</div>
              </div>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <Slider label="Nodes" value={nodeCount} min={example.minNodes} max={example.maxNodes} step={1} color="#0f766e" onChange={setNodeCount} />
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="mb-3 text-sm font-semibold text-[#31424b]">Ko'rinish</div>
              <div className="grid grid-cols-2 gap-2">
                <ToggleButton active={viewMode === "2d"} icon={<ScanSearch size={16} />} label="2D Analyze" onClick={() => setViewMode("2d")} />
                <ToggleButton active={viewMode === "3d"} icon={<Orbit size={16} />} label="3D Explore" onClick={() => setViewMode("3d")} />
              </div>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="grid grid-cols-2 gap-2">
                <ToggleButton active={showExact} icon={<Waves size={16} />} label="Exact" onClick={() => setShowExact((value) => !value)} />
                <ToggleButton active={showError} icon={<Activity size={16} />} label="Error" onClick={() => setShowError((value) => !value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Metric label="Max err" value={trace.maxAbsError.toExponential(2)} />
              <Metric label="RMS" value={trace.rmsError.toExponential(2)} />
              <Metric label="Nodes" value={`${trace.nodeCount}`} />
              <Metric label="Rough" value={trace.roughness.toFixed(2)} />
              <Metric label="Edge" value={trace.edgeMaxError.toExponential(2)} />
              <Metric label="Over" value={trace.overshootArea.toExponential(2)} />
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <GitCompare size={17} />
                Method comparison
              </div>
              <div className="mt-3 space-y-2 text-xs">
                {[trace, ...filteredComparisonTraces].map((item) => (
                  <div
                    key={item.metadata.methodId}
                    className={`grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded border px-2 py-2 ${
                      item.metadata.methodId === trace.metadata.methodId ? "border-[#7dd3fc] bg-[#eef9ff]" : "border-[#e2e8f0]"
                    }`}
                  >
                    <button type="button" onClick={() => openInterpolationMethodTab(item.metadata.methodId as InterpolationMethodId)} className="truncate text-left font-medium text-[#31424b]">
                      {item.metadata.methodName}
                    </button>
                    <span className="font-mono text-[#0f766e]">max {item.maxAbsError.toExponential(1)}</span>
                    <span className="font-mono text-[#be185d]">rms {item.rmsError.toExponential(1)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <TrendingUp size={17} />
                Benchmark
              </div>
              <InterpolationBenchmarkSummary selectedTrace={trace} comparisonTraces={comparisonTraces} />
              <BenchmarkLink href={`/analyzer/benchmarks?family=interpolation&method=${encodeURIComponent(useCustomMethod ? customMethod.baseMethodId : method.id)}&example=${encodeURIComponent(example.id)}&nodes=${nodeCount}${useCustomMethod ? `&formula=${encodeURIComponent(customMethodInput)}` : ""}`} />
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <ScanSearch size={17} />
                Geometrik talqin
              </div>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{method.geometry}</p>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{method.stability}</p>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{example.interpretation}</p>
              <div className="mt-3 rounded border border-[#e2e8f0] bg-[#f8fbfc] px-3 py-2 font-mono text-xs text-[#20303a]">
                {`layout=${trace.nodeLayout}  edge=${trace.edgeMaxError.toExponential(2)}  center=${trace.centerMaxError.toExponential(2)}  TV=${trace.totalVariationRatio.toFixed(2)}  sign-changes=${trace.signChangeCount}`}
              </div>
            </div>
          </div>
        </aside>

        <div className={`order-1 min-h-0 lg:order-2 ${viewMode === "3d" ? "overflow-hidden bg-[#0a1418]" : "overflow-hidden bg-[#f3f8f8]"}`}>
          <MethodTabWorkspace
            tabs={workspaceTabs}
            activeTabId={method.id}
            dockedTabId={dockedMethodTabId}
            dockSide={dockSide}
            onActivateTab={(tabId) => openInterpolationMethodTab(tabId as InterpolationMethodId)}
            onCloseTab={closeInterpolationMethodTab}
            onDockTab={(tabId, side) => {
              if (tabId === method.id) return;
              setDockedMethodTabId(tabId);
              setDockSide(side);
            }}
            onUndockTab={() => setDockedMethodTabId(null)}
            renderPanel={renderInterpolationTabPanel}
          />
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
        <aside className="relative z-10 order-2 min-h-0 overflow-y-auto border-t border-[#d8e0e3] bg-[#fbfcfc] p-5 lg:order-1 lg:h-screen lg:border-r lg:border-t-0">
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

function CustomMethodCard({
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

function ResearchReadinessCard({
  title,
  score,
  family,
  summary,
  diagnostics,
}: {
  title: string;
  score: number;
  family: (typeof operatorFamilies)[number];
  summary: string;
  diagnostics: string[];
}) {
  const tone =
    score >= 80 ? "bg-[#dcfce7] text-[#166534]" : score >= 60 ? "bg-[#fef3c7] text-[#92400e]" : "bg-[#fee2e2] text-[#991b1b]";
  return (
    <div className="rounded border border-[#dce4e7] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-[#31424b]">{title}</div>
        <span className={`rounded px-2 py-1 text-xs font-semibold ${tone}`}>{score.toFixed(0)}/100</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#50626b]">{summary}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(family.applications ?? []).map((item) => (
          <span key={item.id} className="rounded bg-[#eef4f5] px-2 py-1 text-[11px] font-medium text-[#40525c]">
            {item.label}
          </span>
        ))}
      </div>
      <div className="mt-3 rounded border border-[#e2e8f0] bg-[#f8fbfc] px-3 py-2 font-mono text-xs leading-5 text-[#50626b]">
        {diagnostics.join("  ")}
      </div>
    </div>
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

function OptimizationAnalyzeView({
  trace,
  example,
  comparisonTraces,
  showSurface,
  showGradient,
  showComparison,
}: {
  trace: ReturnType<typeof buildOptimizationTrace>;
  example: (typeof optimizationExamples)[number];
  comparisonTraces: ReturnType<typeof buildOptimizationTrace>[];
  showSurface: boolean;
  showGradient: boolean;
  showComparison: boolean;
}) {
  const width = 860;
  const height = 520;
  const pad = 42;
  const x = (value: number) => pad + ((value - example.xRange[0]) / Math.max(example.xRange[1] - example.xRange[0], 1e-9)) * (width - pad * 2);
  const y = (value: number) => height - pad - ((value - example.yRange[0]) / Math.max(example.yRange[1] - example.yRange[0], 1e-9)) * (height - pad * 2);
  const pointPath = (steps: typeof trace.steps) => steps.map((step, index) => `${index === 0 ? "M" : "L"} ${x(step.point[0]).toFixed(2)} ${y(step.point[1]).toFixed(2)}`).join(" ");
  const size = 30;
  const cells = Array.from({ length: size * size }, (_, index) => {
    const ix = index % size;
    const iy = Math.floor(index / size);
    const px = example.xRange[0] + ((example.xRange[1] - example.xRange[0]) * ix) / (size - 1);
    const py = example.yRange[0] + ((example.yRange[1] - example.yRange[0]) * iy) / (size - 1);
    const raw = Math.log1p(example.value(px, py));
    return { px, py, raw };
  });
  const minRaw = Math.min(...cells.map((cell) => cell.raw));
  const maxRaw = Math.max(...cells.map((cell) => cell.raw));
  const convergenceWidth = 860;
  const convergenceHeight = 180;
  const convergenceX = (index: number) => 24 + (index / Math.max(trace.steps.length - 1, 1)) * (convergenceWidth - 48);
  const convergenceY = (value: number) => {
    const minValue = Math.log1p(trace.finalValue);
    const maxValue = Math.log1p(trace.steps[0]?.value ?? 1);
    return convergenceHeight - 24 - ((Math.log1p(value) - minValue) / Math.max(maxValue - minValue, 1e-9)) * (convergenceHeight - 48);
  };

  return (
    <div className="grid h-full gap-4 lg:grid-rows-[minmax(0,1fr)_220px]">
      <div className="rounded border border-[#d7dfde] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">2D Analyze</div>
            <div className="text-lg font-semibold text-[#1f2937]">Contour + descent path</div>
          </div>
          <div className="text-xs text-[#55636d]">Yassi view minimumga qanday tushayotganini tezroq ko'rsatadi</div>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[calc(100%-1rem)] min-h-[420px] w-full rounded bg-[#fffaf1]">
          {showSurface
            ? cells.map((cell, index) => {
                const tx = (cell.raw - minRaw) / Math.max(maxRaw - minRaw, 1e-9);
                const color = `rgb(${Math.round(250 - tx * 56)}, ${Math.round(242 - tx * 96)}, ${Math.round(214 - tx * 162)})`;
                const cellWidth = (width - pad * 2) / size + 1;
                const cellHeight = (height - pad * 2) / size + 1;
                return <rect key={index} x={x(cell.px) - cellWidth / 2} y={y(cell.py) - cellHeight / 2} width={cellWidth} height={cellHeight} fill={color} opacity={0.92} />;
              })
            : null}
          {[0, 1, 2, 3, 4].map((line) => (
            <line key={line} x1={pad} x2={width - pad} y1={pad + ((height - pad * 2) / 4) * line} y2={pad + ((height - pad * 2) / 4) * line} stroke="#ece4d6" />
          ))}
          {[0, 1, 2, 3, 4].map((line) => (
            <line key={`v-${line}`} y1={pad} y2={height - pad} x1={pad + ((width - pad * 2) / 4) * line} x2={pad + ((width - pad * 2) / 4) * line} stroke="#ece4d6" />
          ))}
          {showComparison
            ? comparisonTraces.map((item) => (
                <path
                  key={item.metadata.methodId}
                  d={pointPath(item.steps)}
                  fill="none"
                  stroke={
                    item.metadata.methodId === "momentum"
                      ? "#0f766e"
                      : item.metadata.methodId === "newton-optimization"
                        ? "#f59e0b"
                        : item.metadata.methodId === "nesterov"
                          ? "#8b5cf6"
                          : "#60a5fa"
                  }
                  strokeWidth="2"
                  strokeOpacity="0.55"
                  strokeDasharray="8 6"
                />
              ))
            : null}
          <path d={pointPath(trace.steps)} fill="none" stroke="#e11d48" strokeWidth="3.5" strokeLinecap="round" />
          {showGradient
            ? trace.steps.filter((_, index) => index % Math.max(1, Math.floor(trace.steps.length / 10)) === 0).map((step) => {
                const gx = x(step.point[0]);
                const gy = y(step.point[1]);
                const scale = 16 / Math.max(step.gradientNorm, 1e-9);
                const tx = gx - step.gradient[0] * scale;
                const ty = gy + step.gradient[1] * scale;
                return <line key={`g-${step.index}`} x1={gx} y1={gy} x2={tx} y2={ty} stroke="#111827" strokeOpacity="0.45" strokeWidth="1.5" />;
              })
            : null}
          <circle cx={x(trace.steps[0]!.point[0])} cy={y(trace.steps[0]!.point[1])} r="6.5" fill="#f8fafc" stroke="#1f2937" strokeWidth="1.5" />
          <circle cx={x(trace.steps.at(-1)!.point[0])} cy={y(trace.steps.at(-1)!.point[1])} r="8" fill="#fde047" stroke="#92400e" strokeWidth="1.5" />
          <circle cx={x(example.optimum[0])} cy={y(example.optimum[1])} r="7" fill="#10b981" stroke="#064e3b" strokeWidth="1.5" />
          <text x={pad} y={26} fill="#6b7280" fontSize="14">Yoqimli view: kontur/heatmap + path + optimum</text>
        </svg>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded border border-[#d7dfde] bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm font-semibold text-[#31424b]">Convergence</div>
          <svg viewBox={`0 0 ${convergenceWidth} ${convergenceHeight}`} className="h-full w-full rounded bg-[#f7faf9]">
            {[0, 1, 2, 3].map((line) => (
              <line key={line} x1={24} x2={convergenceWidth - 24} y1={24 + line * 44} y2={24 + line * 44} stroke="#dbe6e2" />
            ))}
            {showComparison
              ? comparisonTraces.map((item) => (
                  <path
                    key={item.metadata.methodId}
                    d={item.steps.map((step, index) => `${index === 0 ? "M" : "L"} ${convergenceX(index).toFixed(2)} ${convergenceY(step.value).toFixed(2)}`).join(" ")}
                    fill="none"
                    stroke={
                      item.metadata.methodId === "momentum"
                        ? "#0f766e"
                        : item.metadata.methodId === "newton-optimization"
                          ? "#f59e0b"
                          : item.metadata.methodId === "nesterov"
                            ? "#8b5cf6"
                            : "#60a5fa"
                    }
                    strokeWidth="2"
                    strokeOpacity="0.52"
                    strokeDasharray="8 6"
                  />
                ))
              : null}
            <path d={trace.steps.map((step, index) => `${index === 0 ? "M" : "L"} ${convergenceX(index).toFixed(2)} ${convergenceY(step.value).toFixed(2)}`).join(" ")} fill="none" stroke="#059669" strokeWidth="3" />
          </svg>
        </div>
        <div className="rounded border border-[#d7dfde] bg-[#fffaf1] p-4 text-sm leading-6 text-[#49545b] shadow-sm">
          <div className="text-sm font-semibold text-[#31424b]">Nima ko'ryapmiz</div>
          <p className="mt-3">Heatmap objective qiymatini, qizil chiziq iteratsiya yo'lini, yashil nuqta optimumni ko'rsatadi.</p>
          <p className="mt-3">Agar path konturlarni kesib zigzag qilsa, step size katta yoki method valley ichida qiynalayapti degani.</p>
          <p className="mt-3">Condition number katta, alignment past va monotone increase ko'p bo'lsa, bu optimizer landshaft geometriyasini yaxshi ushlay olmayotganini bildiradi.</p>
        </div>
      </div>
    </div>
  );
}

function ProbabilityAnalyzeView({
  trace,
  comparisonTraces,
  showPaths,
  showMoments,
  showHistogram,
  showConvergence,
  showComparison,
  focus,
}: {
  trace: ReturnType<typeof buildProbabilityTrace>;
  comparisonTraces: ReturnType<typeof buildProbabilityTrace>[];
  showPaths: boolean;
  showMoments: boolean;
  showHistogram: boolean;
  showConvergence: boolean;
  showComparison: boolean;
  focus: number;
}) {
  const mainWidth = 820;
  const mainHeight = 400;
  const pad = 36;
  const endTime = trace.moments.at(-1)?.t ?? 1;
  const x = (t: number) => pad + (t / Math.max(endTime, 1e-9)) * (mainWidth - pad * 2);
  const y = (value: number) => mainHeight - pad - ((value - trace.valueRange[0]) / Math.max(trace.valueRange[1] - trace.valueRange[0], 1e-9)) * (mainHeight - pad * 2);
  const pathToD = (points: Array<{ x: number; y: number }>) => points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const visiblePathCount = Math.max(3, Math.floor(trace.paths.length * Math.max(0.12, focus)));
  const stride = Math.max(1, Math.floor(visiblePathCount / 18));
  const visiblePaths = trace.paths.slice(0, visiblePathCount).filter((_, index) => index % stride === 0);
  const meanPath = trace.moments.map((sample) => ({ x: x(sample.t), y: y(sample.mean) }));
  const exactPath = trace.moments.map((sample) => ({ x: x(sample.t), y: y(sample.exactMean) }));
  const upperBand = trace.moments.map((sample) => ({ x: x(sample.t), y: y(sample.mean + 1.96 * sample.standardError) }));
  const lowerBand = [...trace.moments].reverse().map((sample) => ({ x: x(sample.t), y: y(sample.mean - 1.96 * sample.standardError) }));
  const bandPath = [
    ...upperBand.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`),
    ...lowerBand.map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`),
    "Z",
  ].join(" ");
  const histogramWidth = 300;
  const histogramHeight = 400;
  const maxProb = Math.max(...trace.histogram.map((bin) => bin.probability), 1e-9);
  const convergenceWidth = 1140;
  const convergenceHeight = 180;
  const maxPaths = Math.max(...trace.convergence.map((item) => item.paths), 1);
  const maxError = Math.max(...trace.convergence.map((item) => item.stderr), 1e-9);

  return (
    <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:grid-rows-[minmax(0,1fr)_220px]">
      <div className="rounded border border-[#d7e2e6] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">2D Analyze</div>
            <div className="text-lg font-semibold text-[#1f2937]">Paths, mean, confidence</div>
          </div>
          <div className="text-xs text-[#55636d]">Asosiy statistik tushuncha shu ko'rinishda aniqroq chiqadi</div>
        </div>
        <svg viewBox={`0 0 ${mainWidth} ${mainHeight}`} className="h-[calc(100%-1rem)] min-h-[360px] w-full rounded bg-[#f7fbfc]">
          {[0, 1, 2, 3, 4].map((line) => (
            <line key={line} x1={pad} x2={mainWidth - pad} y1={pad + ((mainHeight - pad * 2) / 4) * line} y2={pad + ((mainHeight - pad * 2) / 4) * line} stroke="#dbe8ee" />
          ))}
          {showPaths
            ? visiblePaths.map((path) => (
                <path
                  key={path.id}
                  d={pathToD(path.samples.map((sample) => ({ x: x(sample.t), y: y(sample.value) })))}
                  fill="none"
                  stroke={path.color}
                  strokeOpacity="0.28"
                  strokeWidth="1.5"
                />
              ))
            : null}
          {showMoments ? <path d={bandPath} fill="#7dd3fc" fillOpacity="0.22" /> : null}
          {showComparison
            ? comparisonTraces.map((item) => (
                <path
                  key={item.metadata.methodId}
                  d={pathToD(item.moments.map((sample) => ({ x: x(sample.t), y: y(sample.mean) })))}
                  fill="none"
                  stroke={item.metadata.methodId === "milstein" ? "#a855f7" : item.metadata.methodId === "monte-carlo" ? "#10b981" : "#60a5fa"}
                  strokeOpacity="0.58"
                  strokeDasharray="8 5"
                  strokeWidth="2"
                />
              ))
            : null}
          {showMoments ? <path d={pathToD(exactPath)} fill="none" stroke="#0f172a" strokeWidth="2.5" /> : null}
          {showMoments ? <path d={pathToD(meanPath)} fill="none" stroke="#ca8a04" strokeWidth="3.2" /> : null}
          <line x1={pad} x2={mainWidth - pad} y1={y(trace.payoffLevel)} y2={y(trace.payoffLevel)} stroke="#f97316" strokeWidth="2" strokeDasharray="8 6" />
        </svg>
      </div>

      <div className="rounded border border-[#d7e2e6] bg-white p-4 shadow-sm">
        <div className="mb-2 text-sm font-semibold text-[#31424b]">Terminal distribution</div>
        <svg viewBox={`0 0 ${histogramWidth} ${histogramHeight}`} className="h-full w-full rounded bg-[#f7fbfc]">
          {showHistogram
            ? trace.histogram.map((bin, index) => {
                const barWidth = (histogramWidth - 56) / trace.histogram.length - 6;
                const barHeight = (bin.probability / maxProb) * (histogramHeight - 72);
                return (
                  <g key={index}>
                    <rect x={28 + index * ((histogramWidth - 56) / trace.histogram.length)} y={histogramHeight - 28 - barHeight} width={barWidth} height={barHeight} rx="4" fill={index % 2 === 0 ? "#38bdf8" : "#f472b6"} opacity="0.8" />
                  </g>
                );
              })
            : null}
          <line x1={22} x2={histogramWidth - 22} y1={histogramHeight - 28} y2={histogramHeight - 28} stroke="#c7d7de" />
        </svg>
      </div>

        <div className="rounded border border-[#d7e2e6] bg-white p-4 shadow-sm lg:col-span-2">
          <div className="mb-2 text-sm font-semibold text-[#31424b]">Convergence va risk</div>
        <svg viewBox={`0 0 ${convergenceWidth} ${convergenceHeight}`} className="h-full w-full rounded bg-[#f7fbfc]">
          {[0, 1, 2, 3].map((line) => (
            <line key={line} x1={24} x2={convergenceWidth - 24} y1={24 + line * 44} y2={24 + line * 44} stroke="#dbe8ee" />
          ))}
          {showConvergence ? (
            <path
              d={trace.convergence.map((sample, index) => `${index === 0 ? "M" : "L"} ${(24 + (sample.paths / maxPaths) * (convergenceWidth - 48)).toFixed(2)} ${(convergenceHeight - 24 - (sample.stderr / maxError) * (convergenceHeight - 48)).toFixed(2)}`).join(" ")}
              fill="none"
              stroke="#059669"
              strokeWidth="3"
            />
          ) : null}
        </svg>
        <div className="mt-3 text-sm leading-6 text-[#55636d]">
          Sariq chiziq sample mean, qora chiziq exact mean, havorang zona 95% confidence band, to'q sariq chiziq payoff threshold. Histogram terminal riskni, pastdagi chiziq esa sample ko'payganda xato torayishini ko'rsatadi.
        </div>
        <div className="mt-3 text-sm leading-6 text-[#55636d]">
          Kuchli analyzer uchun endi strong/weak error ham hisoblanadi: bir xil noise ostida path exact transition'dan qanchalik og'ishini va expectation darajasidagi biasni alohida ko'rasiz.
        </div>
      </div>
    </div>
  );
}

function MatrixAnalyzeView({
  trace,
  example,
  comparisonTraces,
  expandedPanel,
  onExpandPanel,
  showTransform,
  showResidual,
  showComparison,
}: {
  trace: ReturnType<typeof buildMatrixTrace>;
  example: (typeof matrixExamples)[number];
  comparisonTraces: ReturnType<typeof buildMatrixTrace>[];
  expandedPanel: "main" | "secondary" | "residual" | "diagnostics" | null;
  onExpandPanel: (panel: "main" | "secondary" | "residual" | "diagnostics" | null) => void;
  showTransform: boolean;
  showResidual: boolean;
  showComparison: boolean;
}) {
  const [tooltip, setTooltip] = useState<ChartTooltip | null>(null);
  const mainWidth = 820;
  const mainHeight = 400;
  const pad = 36;
  const transformWidth = 320;
  const transformHeight = 400;
  const convergenceWidth = 1140;
  const convergenceHeight = 180;
  const orbitVectors = [...trace.steps.map((step) => step.vector), trace.targetVector, trace.exactSolution];
  const orbitExtent = Math.max(0.45, ...orbitVectors.flatMap((vector) => [Math.abs(vector[0]), Math.abs(vector[1])])) * 1.14;
  const transformExtent = Math.max(1.2, ...trace.transformedBasis.flatMap((vector) => [Math.abs(vector[0]), Math.abs(vector[1])])) * 1.2;
  const x = (value: number) => pad + ((value + orbitExtent) / (orbitExtent * 2)) * (mainWidth - pad * 2);
  const y = (value: number) => mainHeight - pad - ((value + orbitExtent) / (orbitExtent * 2)) * (mainHeight - pad * 2);
  const tx = (value: number) => 28 + ((value + transformExtent) / (transformExtent * 2)) * (transformWidth - 56);
  const ty = (value: number) => transformHeight - 28 - ((value + transformExtent) / (transformExtent * 2)) * (transformHeight - 56);
  const pointPath = (steps: typeof trace.steps) => steps.map((step, index) => `${index === 0 ? "M" : "L"} ${x(step.vector[0]).toFixed(2)} ${y(step.vector[1]).toFixed(2)}`).join(" ");
  const residualSeries = trace.steps.map((step) => Math.log10(step.residual + 1e-9));
  const minResidual = Math.min(...residualSeries);
  const maxResidual = Math.max(...residualSeries);
  const convergenceX = (index: number) => 24 + (index / Math.max(trace.steps.length - 1, 1)) * (convergenceWidth - 48);
  const convergenceY = (value: number) => convergenceHeight - 24 - ((Math.log10(value + 1e-9) - minResidual) / Math.max(maxResidual - minResidual, 1e-9)) * (convergenceHeight - 48);
  const diagnosticsWidth = 1140;
  const diagnosticsHeight = 220;
  const diagX = (index: number) => 28 + (index / Math.max(trace.steps.length - 1, 1)) * (diagnosticsWidth - 56);
  const componentExtent = Math.max(
    1e-6,
    ...trace.steps.flatMap((step) => [
      Math.abs(step.vector[0]),
      Math.abs(step.vector[1]),
      Math.abs(step.residualVector[0]),
      Math.abs(step.residualVector[1]),
    ]),
  );
  const compY = (value: number) => diagnosticsHeight - 24 - ((value + componentExtent) / (componentExtent * 2)) * (diagnosticsHeight - 52);
  const transformedSquare = [
    [0, 0],
    trace.transformedBasis[0],
    [trace.transformedBasis[0][0] + trace.transformedBasis[1][0], trace.transformedBasis[0][1] + trace.transformedBasis[1][1]],
    trace.transformedBasis[1],
    [0, 0],
  ] as Array<[number, number]>;
  const leastSquaresRange = example.sourceMatrix ? buildLeastSquaresRange(example.sourceMatrix, example.observations ?? [], [trace, ...comparisonTraces]) : null;
  const covarianceCloud = trace.problemKind === "covariance" ? buildCovarianceCloud(trace.matrix) : [];

  const mainPanel =
    trace.problemKind === "least-squares" && leastSquaresRange ? (
      <InteractiveFigure tooltip={tooltip} onClearTooltip={() => setTooltip(null)}>
      <svg viewBox={`0 0 ${mainWidth} ${mainHeight}`} className="h-[calc(100%-1rem)] min-h-[360px] w-full rounded bg-[#fdfaf7]">
        {[0, 1, 2, 3, 4].map((line) => (
          <line key={line} x1={pad} x2={mainWidth - pad} y1={pad + ((mainHeight - pad * 2) / 4) * line} y2={pad + ((mainHeight - pad * 2) / 4) * line} stroke="#efe7db" />
        ))}
        {showComparison
          ? comparisonTraces.map((item) => (
              <line
                key={item.metadata.methodId}
                x1={leastSquaresRange.xMap(leastSquaresRange.minX)}
                y1={leastSquaresRange.yMap(item.steps.at(-1)!.vector[0] * leastSquaresRange.minX + item.steps.at(-1)!.vector[1])}
                x2={leastSquaresRange.xMap(leastSquaresRange.maxX)}
                y2={leastSquaresRange.yMap(item.steps.at(-1)!.vector[0] * leastSquaresRange.maxX + item.steps.at(-1)!.vector[1])}
                stroke={matrixMethodColor(item.metadata.methodId)}
                strokeWidth="2"
                strokeOpacity="0.55"
                strokeDasharray="8 6"
              />
            ))
          : null}
        <line
          x1={leastSquaresRange.xMap(leastSquaresRange.minX)}
          y1={leastSquaresRange.yMap(trace.exactSolution[0] * leastSquaresRange.minX + trace.exactSolution[1])}
          x2={leastSquaresRange.xMap(leastSquaresRange.maxX)}
          y2={leastSquaresRange.yMap(trace.exactSolution[0] * leastSquaresRange.maxX + trace.exactSolution[1])}
          stroke="#10b981"
          strokeWidth="2.5"
        >
          <title>Exact least-squares fit</title>
        </line>
        <line
          x1={leastSquaresRange.xMap(leastSquaresRange.minX)}
          y1={leastSquaresRange.yMap(trace.steps.at(-1)!.vector[0] * leastSquaresRange.minX + trace.steps.at(-1)!.vector[1])}
          x2={leastSquaresRange.xMap(leastSquaresRange.maxX)}
          y2={leastSquaresRange.yMap(trace.steps.at(-1)!.vector[0] * leastSquaresRange.maxX + trace.steps.at(-1)!.vector[1])}
          stroke="#e11d48"
          strokeWidth="3"
          onMouseMove={(event) => setTooltip(makeTooltip(event, "Selected fit", [`m=${trace.steps.at(-1)!.vector[0].toFixed(3)}`, `c=${trace.steps.at(-1)!.vector[1].toFixed(3)}`]))}
        >
          <title>Selected method fit line</title>
        </line>
        {example.sourceMatrix!.map((row, index) => (
          <circle
            key={index}
            cx={leastSquaresRange.xMap(row[0])}
            cy={leastSquaresRange.yMap((example.observations ?? [])[index]!)}
            r="5"
            fill="#111827"
            opacity="0.85"
            onMouseMove={(event) => setTooltip(makeTooltip(event, `Data point ${index + 1}`, [`x=${row[0].toFixed(2)}`, `y=${(example.observations ?? [])[index]!.toFixed(2)}`]))}
          >
            <title>{`Data point ${index + 1}`}</title>
          </circle>
        ))}
        <text x={pad} y={26} fill="#6b7280" fontSize="14">Data nuqtalari, optimal fit va tanlangan metod topgan fit</text>
      </svg>
      </InteractiveFigure>
    ) : trace.problemKind === "covariance" ? (
      <InteractiveFigure tooltip={tooltip} onClearTooltip={() => setTooltip(null)}>
      <svg viewBox={`0 0 ${mainWidth} ${mainHeight}`} className="h-[calc(100%-1rem)] min-h-[360px] w-full rounded bg-[#f8fbfd]">
        {[0, 1, 2, 3, 4].map((line) => (
          <line key={line} x1={pad} x2={mainWidth - pad} y1={pad + ((mainHeight - pad * 2) / 4) * line} y2={pad + ((mainHeight - pad * 2) / 4) * line} stroke="#dde8ee" />
        ))}
        {covarianceCloud.map((point, index) => (
          <circle
            key={index}
            cx={x(point[0])}
            cy={y(point[1])}
            r="4"
            fill={index % 2 === 0 ? "#38bdf8" : "#f472b6"}
            opacity="0.55"
            onMouseMove={(event) => setTooltip(makeTooltip(event, "Sample cloud", [`x=${point[0].toFixed(2)}`, `y=${point[1].toFixed(2)}`]))}
          >
            <title>Covariance sample</title>
          </circle>
        ))}
        <line x1={x(-trace.targetVector[0] * 1.6)} y1={y(-trace.targetVector[1] * 1.6)} x2={x(trace.targetVector[0] * 1.6)} y2={y(trace.targetVector[1] * 1.6)} stroke="#10b981" strokeWidth="3"><title>Exact principal axis</title></line>
        <line
          x1={x(-trace.steps.at(-1)!.vector[0] * 1.7)}
          y1={y(-trace.steps.at(-1)!.vector[1] * 1.7)}
          x2={x(trace.steps.at(-1)!.vector[0] * 1.7)}
          y2={y(trace.steps.at(-1)!.vector[1] * 1.7)}
          stroke="#e11d48"
          strokeWidth="3"
          onMouseMove={(event) => setTooltip(makeTooltip(event, "Selected principal axis", [`angle error ${(trace.steps.at(-1)!.angleToTarget * 180 / Math.PI).toFixed(2)}°`]))}
        >
          <title>Selected principal axis</title>
        </line>
        <text x={pad} y={26} fill="#6b7280" fontSize="14">Variance buluti va principal direction</text>
      </svg>
      </InteractiveFigure>
    ) : (
      <InteractiveFigure tooltip={tooltip} onClearTooltip={() => setTooltip(null)}>
      <svg viewBox={`0 0 ${mainWidth} ${mainHeight}`} className="h-[calc(100%-1rem)] min-h-[360px] w-full rounded bg-[#f6fbfd]">
        {[0, 1, 2, 3, 4].map((line) => (
          <line key={line} x1={pad} x2={mainWidth - pad} y1={pad + ((mainHeight - pad * 2) / 4) * line} y2={pad + ((mainHeight - pad * 2) / 4) * line} stroke="#dde8ee" />
        ))}
        {[0, 1, 2, 3, 4].map((line) => (
          <line key={`v-${line}`} y1={pad} y2={mainHeight - pad} x1={pad + ((mainWidth - pad * 2) / 4) * line} x2={pad + ((mainWidth - pad * 2) / 4) * line} stroke="#dde8ee" />
        ))}
        <line x1={x(-orbitExtent)} x2={x(orbitExtent)} y1={y(0)} y2={y(0)} stroke="#94a3b8" strokeWidth="1.2" />
        <line x1={x(0)} x2={x(0)} y1={y(-orbitExtent)} y2={y(orbitExtent)} stroke="#94a3b8" strokeWidth="1.2" />
        {showComparison
          ? comparisonTraces.map((item) => (
              <path key={item.metadata.methodId} d={pointPath(item.steps)} fill="none" stroke={matrixMethodColor(item.metadata.methodId)} strokeWidth="1.8" strokeOpacity="0.5" strokeDasharray="8 6" />
            ))
          : null}
        <path d={pointPath(trace.steps)} fill="none" stroke="#e11d48" strokeWidth="3" strokeLinecap="round"><title>Selected method orbit</title></path>
        {trace.steps.slice(0, -1).map((step, index) => (
          <circle
            key={index}
            cx={x(step.vector[0])}
            cy={y(step.vector[1])}
            r="2.8"
            fill="#0f172a"
            opacity="0.65"
            onMouseMove={(event) => setTooltip(makeTooltip(event, `Iter ${step.index}`, [`res=${step.residual.toExponential(2)}`, `err=${step.error.toExponential(2)}`]))}
          >
            <title>{`Iter ${step.index}`}</title>
          </circle>
        ))}
        <circle cx={x(trace.steps[0]!.vector[0])} cy={y(trace.steps[0]!.vector[1])} r="5" fill="#94a3b8"><title>Initial guess</title></circle>
        <circle
          cx={x(trace.steps.at(-1)!.vector[0])}
          cy={y(trace.steps.at(-1)!.vector[1])}
          r="5.6"
          fill="#fde047"
          stroke="#92400e"
          strokeWidth="1.2"
          onMouseMove={(event) => setTooltip(makeTooltip(event, "Final iterate", [`res=${trace.steps.at(-1)!.residual.toExponential(2)}`, `err=${trace.steps.at(-1)!.error.toExponential(2)}`]))}
        >
          <title>Final iterate</title>
        </circle>
        <circle cx={x(trace.targetVector[0])} cy={y(trace.targetVector[1])} r="4.5" fill="#10b981" stroke="#064e3b" strokeWidth="1.2"><title>Target vector</title></circle>
        <text x={pad} y={26} fill="#6b7280" fontSize="14">
          {trace.mode === "eigen" ? "Orbit eigendirection tomon qanday burilayotganini ko'rsatadi" : "Orbit yechimga yaqinlashmoqda; boshlang'ich va yakuniy nuqtalar alohida belgilangan"}
        </text>
      </svg>
      </InteractiveFigure>
    );

  const secondaryPanel = (
    <InteractiveFigure tooltip={tooltip} onClearTooltip={() => setTooltip(null)} minScale={1} maxScale={4}>
    <svg viewBox={`0 0 ${transformWidth} ${transformHeight}`} className="h-full w-full rounded bg-[#f8fbfc]">
      <line x1={tx(-transformExtent)} x2={tx(transformExtent)} y1={ty(0)} y2={ty(0)} stroke="#cbd5e1" />
      <line x1={tx(0)} x2={tx(0)} y1={ty(-transformExtent)} y2={ty(transformExtent)} stroke="#cbd5e1" />
      {showTransform ? (
        <>
          <polyline points={["0,0", "1,0", "1,1", "0,1", "0,0"].map((pair) => pair.split(",").map(Number) as [number, number]).map((point) => `${tx(point[0])},${ty(point[1])}`).join(" ")} fill="none" stroke="#94a3b8" strokeWidth="2"><title>Unit square</title></polyline>
          <polyline
            points={transformedSquare.map((point) => `${tx(point[0])},${ty(point[1])}`).join(" ")}
            fill="rgba(56,189,248,0.08)"
            stroke="#38bdf8"
            strokeWidth="3"
            onMouseMove={(event) => setTooltip(makeTooltip(event, "Transformed square", ["Matrix bazisni qanday deformatsiya qilayotganini ko'rsatadi."]))}
          >
            <title>Transformed square</title>
          </polyline>
          <line x1={tx(0)} y1={ty(0)} x2={tx(trace.transformedBasis[0][0])} y2={ty(trace.transformedBasis[0][1])} stroke="#f59e0b" strokeWidth="3"><title>First transformed basis vector</title></line>
          <line x1={tx(0)} y1={ty(0)} x2={tx(trace.transformedBasis[1][0])} y2={ty(trace.transformedBasis[1][1])} stroke="#10b981" strokeWidth="3"><title>Second transformed basis vector</title></line>
        </>
      ) : null}
    </svg>
    </InteractiveFigure>
  );

  const residualPanel = (
    <InteractiveFigure tooltip={tooltip} onClearTooltip={() => setTooltip(null)} minScale={1} maxScale={3.5}>
    <svg viewBox={`0 0 ${convergenceWidth} ${convergenceHeight}`} className="h-full w-full rounded bg-[#f7fbfc]">
      {[0, 1, 2, 3].map((line) => (
        <line key={line} x1={24} x2={convergenceWidth - 24} y1={24 + line * 44} y2={24 + line * 44} stroke="#dbe8ee" />
      ))}
      {showComparison
        ? comparisonTraces.map((item) => (
            <path key={item.metadata.methodId} d={item.steps.map((step, index) => `${index === 0 ? "M" : "L"} ${convergenceX(index).toFixed(2)} ${convergenceY(step.residual).toFixed(2)}`).join(" ")} fill="none" stroke={matrixMethodColor(item.metadata.methodId)} strokeOpacity="0.55" strokeWidth="2" strokeDasharray="8 6" />
          ))
        : null}
      {showResidual ? (
        <path
          d={trace.steps.map((step, index) => `${index === 0 ? "M" : "L"} ${convergenceX(index).toFixed(2)} ${convergenceY(step.residual).toFixed(2)}`).join(" ")}
          fill="none"
          stroke="#059669"
          strokeWidth="3"
          onMouseMove={(event) => setTooltip(makeTooltip(event, "Residual curve", ["Har pastga tushish yechimga yaqinlashishni bildiradi."]))}
        >
          <title>Residual convergence</title>
        </path>
      ) : null}
    </svg>
    </InteractiveFigure>
  );

  const diagnosticsPanel = (
    <InteractiveFigure tooltip={tooltip} onClearTooltip={() => setTooltip(null)} minScale={1} maxScale={3.5}>
      <svg viewBox={`0 0 ${diagnosticsWidth} ${diagnosticsHeight}`} className="h-full w-full rounded bg-[#f8fbfc]">
        {[0, 1, 2, 3].map((line) => (
          <line key={line} x1={28} x2={diagnosticsWidth - 28} y1={28 + line * 44} y2={28 + line * 44} stroke="#dbe8ee" />
        ))}
        <line x1={28} x2={diagnosticsWidth - 28} y1={compY(0)} y2={compY(0)} stroke="#94a3b8" strokeWidth="1.1" />
        <path d={trace.steps.map((step, index) => `${index === 0 ? "M" : "L"} ${diagX(index).toFixed(2)} ${compY(step.vector[0]).toFixed(2)}`).join(" ")} fill="none" stroke="#0f766e" strokeWidth="2.5" />
        <path d={trace.steps.map((step, index) => `${index === 0 ? "M" : "L"} ${diagX(index).toFixed(2)} ${compY(step.vector[1]).toFixed(2)}`).join(" ")} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeDasharray="8 5" />
        {showResidual ? (
          <>
            <path d={trace.steps.map((step, index) => `${index === 0 ? "M" : "L"} ${diagX(index).toFixed(2)} ${compY(step.residualVector[0]).toFixed(2)}`).join(" ")} fill="none" stroke="#f97316" strokeWidth="2" strokeOpacity="0.9" />
            <path d={trace.steps.map((step, index) => `${index === 0 ? "M" : "L"} ${diagX(index).toFixed(2)} ${compY(step.residualVector[1]).toFixed(2)}`).join(" ")} fill="none" stroke="#e11d48" strokeWidth="2" strokeOpacity="0.9" strokeDasharray="6 5" />
          </>
        ) : null}
        {trace.steps.filter((_, index) => index % Math.max(1, Math.floor(trace.steps.length / 8)) === 0).map((step, index) => (
          <circle
            key={index}
            cx={diagX(step.index)}
            cy={compY(step.vector[0])}
            r="3.5"
            fill="#0f766e"
            onMouseMove={(event) =>
              setTooltip(
                makeTooltip(event, `Iter ${step.index}`, [
                  `x1=${step.vector[0].toFixed(3)}`,
                  `x2=${step.vector[1].toFixed(3)}`,
                  `r1=${step.residualVector[0].toExponential(2)}`,
                  `r2=${step.residualVector[1].toExponential(2)}`,
                ]),
              )
            }
          />
        ))}
        <text x={28} y={20} fill="#6b7280" fontSize="14">x1/x2 va residual komponentlarining vaqt bo'yicha yurishi</text>
      </svg>
    </InteractiveFigure>
  );

  return (
    <>
      <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-[minmax(0,1fr)_220px_240px]">
        <MatrixPanelCard panelId="main" expandedPanel={expandedPanel} onExpandPanel={onExpandPanel} title={trace.problemKind === "least-squares" ? "Data fit view" : trace.problemKind === "covariance" ? "Variance cloud" : trace.mode === "eigen" ? "Eigen orbit" : "Iterative orbit"} subtitle={trace.problemKind === "least-squares" ? "Nuqta va fit chiziq" : trace.problemKind === "covariance" ? "Bulut va asosiy yo'nalish" : "Metod yo'li va target"}>
          {mainPanel}
        </MatrixPanelCard>
        <MatrixPanelCard panelId="secondary" expandedPanel={expandedPanel} onExpandPanel={onExpandPanel} title={trace.problemKind === "least-squares" ? "Normal-equation geometry" : trace.problemKind === "covariance" ? "Variance geometry" : "Basis deformation"} subtitle="Transform va bazis talqini">
          {secondaryPanel}
        </MatrixPanelCard>
        <MatrixPanelCard panelId="residual" expandedPanel={expandedPanel} onExpandPanel={onExpandPanel} title="Residual convergence" subtitle="Iteratsiya haqiqatan yaqinlashyaptimi?" className="lg:col-span-2">
          {residualPanel}
        </MatrixPanelCard>
        <MatrixPanelCard panelId="diagnostics" expandedPanel={expandedPanel} onExpandPanel={onExpandPanel} title="Component diagnostics" subtitle="Komponentlar, residual o'qlari, burilishlar" className="lg:col-span-2">
          {diagnosticsPanel}
        </MatrixPanelCard>
      </div>
      {expandedPanel ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#021017]/70 p-5 backdrop-blur-sm">
          <div className="relative h-[88vh] w-[min(1200px,96vw)] overflow-hidden rounded-2xl border border-[#d7e2e6] bg-white p-4 shadow-2xl">
            <button type="button" onClick={() => onExpandPanel(null)} className="absolute right-4 top-4 z-10 flex h-9 items-center gap-2 rounded border border-[#cfd9dd] bg-white px-3 text-sm font-medium hover:bg-[#eef4f5]">
              <X size={16} />
              Yopish
            </button>
            <div className="h-full overflow-auto pt-10">
              {expandedPanel === "main" ? mainPanel : null}
              {expandedPanel === "secondary" ? secondaryPanel : null}
              {expandedPanel === "residual" ? residualPanel : null}
              {expandedPanel === "diagnostics" ? diagnosticsPanel : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function RootFindingAnalyzeView({
  trace,
  example,
  comparisonTraces,
  showGuides,
  showResidual,
  showComparison,
}: {
  trace: ReturnType<typeof buildRootFindingTrace>;
  example: (typeof rootFindingExamples)[number];
  comparisonTraces: ReturnType<typeof buildRootFindingTrace>[];
  showGuides: boolean;
  showResidual: boolean;
  showComparison: boolean;
}) {
  const [tooltip, setTooltip] = useState<ChartTooltip | null>(null);
  const mainWidth = 860;
  const mainHeight = 420;
  const pad = 40;
  const curveSamples = Array.from({ length: 260 }, (_, index) => {
    const alpha = index / 259;
    const x = example.xRange[0] + alpha * (example.xRange[1] - example.xRange[0]);
    return { x, y: example.evaluate(x) };
  });
  const yValues = [...curveSamples.map((sample) => sample.y), ...trace.steps.map((step) => step.fx), 0];
  const yExtent = Math.max(1, ...yValues.map((value) => Math.abs(value))) * 1.12;
  const xMap = (value: number) => pad + ((value - example.xRange[0]) / Math.max(example.xRange[1] - example.xRange[0], 1e-9)) * (mainWidth - pad * 2);
  const yMap = (value: number) => mainHeight - pad - ((value + yExtent) / (yExtent * 2)) * (mainHeight - pad * 2);
  const convergenceWidth = 1140;
  const convergenceHeight = 180;
  const logResiduals = trace.steps.map((step) => Math.log10(Math.abs(step.fx) + 1e-12));
  const minResidual = Math.min(...logResiduals);
  const maxResidual = Math.max(...logResiduals);
  const convergenceX = (index: number) => 24 + (index / Math.max(trace.steps.length - 1, 1)) * (convergenceWidth - 48);
  const convergenceY = (value: number) => convergenceHeight - 24 - ((Math.log10(Math.abs(value) + 1e-12) - minResidual) / Math.max(maxResidual - minResidual, 1e-9)) * (convergenceHeight - 48);

  return (
    <div className="grid h-full gap-4 lg:grid-rows-[minmax(0,1fr)_220px]">
      <div className="rounded border border-[#d7dfde] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">2D Analyze</div>
            <div className="text-lg font-semibold text-[#1f2937]">Function, bracket, tangent</div>
          </div>
          <div className="text-xs text-[#55636d]">Root qayerdaligini va metod unga qanday kelayotganini aniq ko'rsatadi</div>
        </div>
        <InteractiveFigure tooltip={tooltip} onClearTooltip={() => setTooltip(null)}>
        <svg viewBox={`0 0 ${mainWidth} ${mainHeight}`} className="h-[calc(100%-1rem)] min-h-[360px] w-full rounded bg-[#fffaf2]">
          {[0, 1, 2, 3, 4].map((line) => (
            <line key={line} x1={pad} x2={mainWidth - pad} y1={pad + ((mainHeight - pad * 2) / 4) * line} y2={pad + ((mainHeight - pad * 2) / 4) * line} stroke="#eee2d4" />
          ))}
          <line x1={xMap(example.xRange[0])} x2={xMap(example.xRange[1])} y1={yMap(0)} y2={yMap(0)} stroke="#64748b" strokeWidth="1.6" />
          <path
            d={curveSamples.map((sample, index) => `${index === 0 ? "M" : "L"} ${xMap(sample.x).toFixed(2)} ${yMap(sample.y).toFixed(2)}`).join(" ")}
            fill="none"
            stroke="#0f172a"
            strokeWidth="3"
            onMouseMove={(event) => setTooltip(makeTooltip(event, "f(x) curve", ["Asosiy funksiyaning grafigi."]))}
          >
            <title>Function curve</title>
          </path>
          {showComparison
            ? comparisonTraces.map((item) => (
                <path
                  key={item.metadata.methodId}
                  d={item.steps.map((step, index) => `${index === 0 ? "M" : "L"} ${xMap(step.x).toFixed(2)} ${yMap(step.fx).toFixed(2)}`).join(" ")}
                  fill="none"
                  stroke={rootMethodColor(item.metadata.methodId)}
                  strokeOpacity="0.42"
                  strokeWidth="2"
                  strokeDasharray="8 6"
                />
              ))
            : null}
          {showGuides
            ? trace.steps.map((step, index) => {
                if (!step.line) return null;
                const color = step.line.kind === "tangent" ? "#22d3ee" : step.line.kind === "secant" ? "#ec4899" : "#cbd5e1";
                return (
                  <line
                    key={`guide-${index}`}
                    x1={xMap(step.line.from[0])}
                    y1={yMap(step.line.from[1])}
                    x2={xMap(step.line.to[0])}
                    y2={yMap(step.line.to[1])}
                    stroke={color}
                    strokeWidth="1.6"
                    strokeOpacity="0.45"
                    onMouseMove={(event) => setTooltip(makeTooltip(event, step.line?.kind === "tangent" ? "Tangent step" : step.line?.kind === "secant" ? "Secant step" : "Bracket guide", [`iter ${index}`]))}
                  >
                    <title>{step.line.kind}</title>
                  </line>
                );
              })
            : null}
          {trace.steps.map((step, index) => (
            <g key={index}>
              <circle
                cx={xMap(step.x)}
                cy={yMap(step.fx)}
                r={index === trace.steps.length - 1 ? 6.5 : 4.2}
                fill={index === trace.steps.length - 1 ? "#fde047" : "#e11d48"}
                onMouseMove={(event) => setTooltip(makeTooltip(event, `Iter ${index}`, [`x=${step.x.toFixed(6)}`, `f=${step.fx.toExponential(2)}`]))}
              >
                <title>{`Iter ${index}`}</title>
              </circle>
              <line x1={xMap(step.x)} x2={xMap(step.x)} y1={yMap(0)} y2={yMap(step.fx)} stroke="#f59e0b" strokeOpacity="0.28" strokeDasharray="5 5" />
            </g>
          ))}
          <line x1={xMap(example.exactRoot)} x2={xMap(example.exactRoot)} y1={yMap(-yExtent)} y2={yMap(yExtent)} stroke="#10b981" strokeWidth="2" strokeDasharray="6 6"><title>Exact root</title></line>
          <text x={pad} y={26} fill="#6b7280" fontSize="14">Qora chiziq f(x), yashil vertikal exact root, qizil nuqtalar iteratsiyalar</text>
        </svg>
        </InteractiveFigure>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded border border-[#d7dfde] bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm font-semibold text-[#31424b]">Residual convergence</div>
          <InteractiveFigure tooltip={tooltip} onClearTooltip={() => setTooltip(null)} minScale={1} maxScale={3.5}>
          <svg viewBox={`0 0 ${convergenceWidth} ${convergenceHeight}`} className="h-full w-full rounded bg-[#f7faf9]">
            {[0, 1, 2, 3].map((line) => (
              <line key={line} x1={24} x2={convergenceWidth - 24} y1={24 + line * 44} y2={24 + line * 44} stroke="#dbe6e2" />
            ))}
            {showComparison
              ? comparisonTraces.map((item) => (
                  <path
                    key={item.metadata.methodId}
                    d={item.steps.map((step, index) => `${index === 0 ? "M" : "L"} ${convergenceX(index).toFixed(2)} ${convergenceY(step.fx).toFixed(2)}`).join(" ")}
                    fill="none"
                    stroke={rootMethodColor(item.metadata.methodId)}
                    strokeOpacity="0.5"
                    strokeWidth="2"
                    strokeDasharray="8 6"
                  />
                ))
              : null}
            {showResidual ? (
              <path
                d={trace.steps.map((step, index) => `${index === 0 ? "M" : "L"} ${convergenceX(index).toFixed(2)} ${convergenceY(step.fx).toFixed(2)}`).join(" ")}
                fill="none"
                stroke="#059669"
                strokeWidth="3"
                onMouseMove={(event) => setTooltip(makeTooltip(event, "Residual path", ["Bu chiziq log masshtabdagi haqiqiy yaqinlashishni ko'rsatadi."]))}
              >
                <title>Residual convergence</title>
              </path>
            ) : null}
          </svg>
          </InteractiveFigure>
        </div>
        <div className="rounded border border-[#d7dfde] bg-[#fffaf1] p-4 text-sm leading-6 text-[#49545b] shadow-sm">
          <div className="text-sm font-semibold text-[#31424b]">Nima ko'ryapmiz</div>
          <p className="mt-3">Bracket usullari intervalni toraytiradi, Newton esa tangent bilan sakraydi, secant esa ikki nuqtadan yo'nalish oladi.</p>
          <p className="mt-3">Pastdagi residual grafigi haqiqiy yaqinlashish tezligini ko'rsatadi, faqat vizual yo'lni emas.</p>
          <p className="mt-3">`contract`, `stagnation` va `bracket retention` metrikalari metod tezmi, xavfsizmi yoki bir joyda qotib qolayaptimi degan savolga javob beradi.</p>
        </div>
      </div>
    </div>
  );
}

function InterpolationAnalyzeView({
  trace,
  example,
  comparisonTraces,
  showExact,
  showError,
  showComparison,
}: {
  trace: ReturnType<typeof buildInterpolationTrace>;
  example: (typeof interpolationExamples)[number];
  comparisonTraces: ReturnType<typeof buildInterpolationTrace>[];
  showExact: boolean;
  showError: boolean;
  showComparison: boolean;
}) {
  const [tooltip, setTooltip] = useState<ChartTooltip | null>(null);
  const mainWidth = 860;
  const mainHeight = 420;
  const pad = 40;
  const xMap = (value: number) => pad + ((value - example.xRange[0]) / Math.max(example.xRange[1] - example.xRange[0], 1e-9)) * (mainWidth - pad * 2);
  const yMap = (value: number) => mainHeight - pad - ((value - example.yRange[0]) / Math.max(example.yRange[1] - example.yRange[0], 1e-9)) * (mainHeight - pad * 2);
  const errorWidth = 1140;
  const errorHeight = 180;
  const maxError = Math.max(...trace.samples.map((sample) => Math.abs(sample.error)), 1e-9);
  const errorX = (value: number) => 24 + ((value - example.xRange[0]) / Math.max(example.xRange[1] - example.xRange[0], 1e-9)) * (errorWidth - 48);
  const errorY = (value: number) => errorHeight - 24 - ((value + maxError) / Math.max(maxError * 2, 1e-9)) * (errorHeight - 48);
  const exactPath = trace.samples.map((sample, index) => `${index === 0 ? "M" : "L"} ${xMap(sample.x).toFixed(2)} ${yMap(sample.exact).toFixed(2)}`).join(" ");
  const estimatePath = trace.samples.map((sample, index) => `${index === 0 ? "M" : "L"} ${xMap(sample.x).toFixed(2)} ${yMap(sample.estimate).toFixed(2)}`).join(" ");
  const errorArea = [
    ...trace.samples.map((sample, index) => `${index === 0 ? "M" : "L"} ${xMap(sample.x).toFixed(2)} ${yMap(sample.exact).toFixed(2)}`),
    ...[...trace.samples].reverse().map((sample) => `L ${xMap(sample.x).toFixed(2)} ${yMap(sample.estimate).toFixed(2)}`),
    "Z",
  ].join(" ");

  return (
    <div className="grid h-full gap-4 lg:grid-rows-[minmax(0,1fr)_220px]">
      <div className="rounded border border-[#d7dfde] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">2D Analyze</div>
            <div className="text-lg font-semibold text-[#1f2937]">Exact vs interpolant</div>
          </div>
          <div className="text-xs text-[#55636d]">Node, approximation va xatolik bir sahnada ko'rinadi</div>
        </div>
        <InteractiveFigure tooltip={tooltip} onClearTooltip={() => setTooltip(null)}>
        <svg viewBox={`0 0 ${mainWidth} ${mainHeight}`} className="h-[calc(100%-1rem)] min-h-[360px] w-full rounded bg-[#f6fbfb]">
          {[0, 1, 2, 3, 4].map((line) => (
            <line key={line} x1={pad} x2={mainWidth - pad} y1={pad + ((mainHeight - pad * 2) / 4) * line} y2={pad + ((mainHeight - pad * 2) / 4) * line} stroke="#dbe8e8" />
          ))}
          {showError ? <path d={errorArea} fill="#fb7185" fillOpacity="0.14" /> : null}
          {showComparison
            ? comparisonTraces.map((item) => (
                <path
                  key={item.metadata.methodId}
                  d={item.samples.map((sample, index) => `${index === 0 ? "M" : "L"} ${xMap(sample.x).toFixed(2)} ${yMap(sample.estimate).toFixed(2)}`).join(" ")}
                  fill="none"
                  stroke={interpolationMethodColor(item.metadata.methodId)}
                  strokeOpacity="0.45"
                  strokeWidth="2"
                  strokeDasharray="8 6"
                />
              ))
            : null}
          {showExact ? <path d={exactPath} fill="none" stroke="#0f172a" strokeWidth="2.6" strokeDasharray="9 7"><title>Exact signal</title></path> : null}
          <path
            d={estimatePath}
            fill="none"
            stroke={interpolationMethodColor(trace.metadata.methodId)}
            strokeWidth="3.2"
            onMouseMove={(event) => setTooltip(makeTooltip(event, "Interpolant", [`max err ${trace.maxAbsError.toExponential(2)}`, `rms ${trace.rmsError.toExponential(2)}`]))}
          >
            <title>Interpolated curve</title>
          </path>
          {trace.nodes.map((node) => (
            <circle
              key={node.index}
              cx={xMap(node.x)}
              cy={yMap(node.y)}
              r="5"
              fill="#f8fafc"
              stroke="#0f766e"
              strokeWidth="2"
              onMouseMove={(event) => setTooltip(makeTooltip(event, `Node ${node.index + 1}`, [`x=${node.x.toFixed(3)}`, `y=${node.y.toFixed(3)}`]))}
            >
              <title>{`Node ${node.index + 1}`}</title>
            </circle>
          ))}
          <text x={pad} y={26} fill="#6b7280" fontSize="14">Qora chiziq exact signal, qizil chiziq interpolant, pushti zona ular orasidagi farq</text>
        </svg>
        </InteractiveFigure>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded border border-[#d7dfde] bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm font-semibold text-[#31424b]">Error map</div>
          <InteractiveFigure tooltip={tooltip} onClearTooltip={() => setTooltip(null)} minScale={1} maxScale={3.5}>
          <svg viewBox={`0 0 ${errorWidth} ${errorHeight}`} className="h-full w-full rounded bg-[#f7faf9]">
            {[0, 1, 2, 3].map((line) => (
              <line key={line} x1={24} x2={errorWidth - 24} y1={24 + line * 44} y2={24 + line * 44} stroke="#dbe6e2" />
            ))}
            <line x1={24} x2={errorWidth - 24} y1={errorY(0)} y2={errorY(0)} stroke="#94a3b8" strokeWidth="1.4" />
            {showComparison
              ? comparisonTraces.map((item) => (
                  <path
                    key={item.metadata.methodId}
                    d={item.samples.map((sample, index) => `${index === 0 ? "M" : "L"} ${errorX(sample.x).toFixed(2)} ${errorY(sample.error).toFixed(2)}`).join(" ")}
                    fill="none"
                    stroke={interpolationMethodColor(item.metadata.methodId)}
                    strokeOpacity="0.45"
                    strokeWidth="2"
                    strokeDasharray="8 6"
                  />
                ))
              : null}
            {showError ? (
              <path
                d={trace.samples.map((sample, index) => `${index === 0 ? "M" : "L"} ${errorX(sample.x).toFixed(2)} ${errorY(sample.error).toFixed(2)}`).join(" ")}
                fill="none"
                stroke="#059669"
                strokeWidth="3"
                onMouseMove={(event) => setTooltip(makeTooltip(event, "Error curve", ["Qayerda interpolatsiya yomonlashayotganini ko'rsatadi."]))}
              >
                <title>Error map</title>
              </path>
            ) : null}
          </svg>
          </InteractiveFigure>
        </div>
        <div className="rounded border border-[#d7dfde] bg-[#fffaf1] p-4 text-sm leading-6 text-[#49545b] shadow-sm">
          <div className="text-sm font-semibold text-[#31424b]">Nima ko'ryapmiz</div>
          <p className="mt-3">Agar qizil chiziq node'larni yaxshi ushlasa-yu, error map chetda ko'tarilsa, bu global oscillation yoki node yetishmasligi belgisi.</p>
          <p className="mt-3">Spline odatda silliqroq, piecewise linear esa eng sodda baseline vazifasini bajaradi. Chebyshev barycentric esa ayniqsa chekkadagi Runge tebranishini pasaytirishda kuchli.</p>
        </div>
      </div>
    </div>
  );
}

type ChartTooltip = {
  x: number;
  y: number;
  title: string;
  lines: string[];
};

function LatexBlock({ latex, inline = false }: { latex: string; inline?: boolean }) {
  const html = renderToString(latex, {
    throwOnError: false,
    displayMode: !inline,
    output: "html",
    strict: "ignore",
  });

  return <div className={inline ? "text-sm text-[#20303a]" : "overflow-x-auto rounded bg-[#f7fafb] px-3 py-2"} dangerouslySetInnerHTML={{ __html: html }} />;
}

function matrixExampleLatex(example: (typeof matrixExamples)[number], problemKind: ReturnType<typeof buildMatrixTrace>["problemKind"]) {
  if (problemKind === "least-squares" && example.sourceMatrix && example.observations) {
    return String.raw`\min_{\theta \in \mathbb{R}^2}\|A\theta-b\|_2^2,\quad
    A=${latexMatrix(example.sourceMatrix)},\quad
    b=${latexColumn(example.observations)},\quad
    \theta=\begin{bmatrix}m\\c\end{bmatrix}`;
  }

  if (problemKind === "covariance") {
    return String.raw`\Sigma=${latexMatrix(example.matrix)},\quad
    \max_{\|v\|=1} v^\top \Sigma v`;
  }

  return String.raw`A=${latexMatrix(example.matrix)},\quad b=${latexColumn(example.rhs)},\quad Ax=b`;
}

function matrixMethodLatex(methodId: string) {
  switch (methodId) {
    case "jacobi":
      return String.raw`x^{(k+1)}=D^{-1}\left(b-(L+U)x^{(k)}\right)`;
    case "gauss-seidel":
      return String.raw`(D+L)x^{(k+1)}=b-Ux^{(k)}`;
    case "sor":
      return String.raw`x^{(k+1)}=(1-\omega)x^{(k)}+\omega(D+L)^{-1}(b-Ux^{(k)})`;
    case "richardson":
      return String.raw`x^{(k+1)}=x^{(k)}+\omega\left(b-Ax^{(k)}\right)`;
    case "conjugate-gradient":
      return String.raw`x_{k+1}=x_k+\alpha_k p_k,\quad p_k^\top A p_j=0\ (j<k)`;
    case "landweber-least-squares":
      return String.raw`\theta^{(k+1)}=\theta^{(k)}+\omega A^\top\left(b-A\theta^{(k)}\right)`;
    case "power-iteration":
      return String.raw`v^{(k+1)}=\frac{Av^{(k)}}{\|Av^{(k)}\|}`;
    case "inverse-iteration":
      return String.raw`v^{(k+1)}=\frac{A^{-1}v^{(k)}}{\|A^{-1}v^{(k)}\|}`;
    case "qr-iteration":
      return String.raw`A_k=Q_kR_k,\quad A_{k+1}=R_kQ_k`;
    case "pca-svd":
      return String.raw`v_1=\arg\max_{\|v\|=1} v^\top \Sigma v`;
    default:
      return String.raw`Ax=b`;
  }
}

function matrixMethodNarrative(methodId: string) {
  switch (methodId) {
    case "jacobi":
      return "Jacobi har koordinatani eski qiymatlar bilan alohida yangilaydi. Shuning uchun orbit sekinroq, lekin xatolik strukturasini juda toza ko'rsatadi.";
    case "gauss-seidel":
      return "Gauss-Seidel yangi topilgan komponentlarni darhol ishlatadi. Bu ko'p sistemalarda tezroq qisqarish va silliqroq orbit beradi.";
    case "sor":
      return "SOR relaxation bilan tezlashtiradi. Agar parametr mos tushsa residual juda tez tushadi, noto'g'ri bo'lsa esa overshoot ko'rinadi.";
    case "richardson":
      return "Richardson residualning o'zini qadamga aylantiradi. Shu sabab spektr yomon bo'lsa tez buziladi, yaxshi bo'lsa tushunarli baseline bo'ladi.";
    case "conjugate-gradient":
      return "Conjugate Gradient SPD sistemalarda eng foydali bazaviy kuchli metodlardan biri. U yo'lni keraksiz burilishsiz yechimga olib boradi.";
    case "landweber-least-squares":
      return "Landweber least-squares loss ustida gradient descent qiladi. Slope va intercept qanday topilayotganini, fit residuali bilan birga ko'rsatadi.";
    case "power-iteration":
      return "Power iteration dominant eigen yo'nalishni topadi. Agar eigen gap kichik bo'lsa, chiziq sekin buriladi va bu vizual ravishda yaqqol ko'rinadi.";
    case "inverse-iteration":
      return "Inverse iteration eng kichik modani kuchaytiradi. Shuning uchun sust yo'nalishlar va near-singular holatlar tez seziladi.";
    case "qr-iteration":
      return "QR iteration butun matritsaning ichki spektrini ochadi. Bu yerda asosiy foyda faqat yakuniy qiymat emas, diagonalga oqish dinamikasidir.";
    case "pca-svd":
      return "PCA/SVD variance qayerda to'planganini ko'rsatadi. Data cloud va principal axis birga ko'rinsa, metod nimani topayotganini tushunish osonlashadi.";
    default:
      return "Metod formulasi, orbit va residual birga ko'rilganda uning haqiqiy xulqi aniqroq ko'rinadi.";
  }
}

function rootExampleLatex(example: (typeof rootFindingExamples)[number]) {
  return String.raw`${example.equation},\quad x^\star \approx ${example.exactRoot.toFixed(6)}`;
}

function rootMethodLatex(methodId: string) {
  switch (methodId) {
    case "bisection":
      return String.raw`x_{k+1}=\frac{a_k+b_k}{2}`;
    case "illinois":
      return String.raw`x_{k+1}=a_k-\frac{f(a_k)(b_k-a_k)}{f(b_k)-f(a_k)},\quad f_{\mathrm{stagnant}}\leftarrow \frac{1}{2}f_{\mathrm{stagnant}}`;
    case "newton":
      return String.raw`x_{k+1}=x_k-\frac{f(x_k)}{f'(x_k)}`;
    case "secant":
      return String.raw`x_{k+1}=x_k-f(x_k)\frac{x_k-x_{k-1}}{f(x_k)-f(x_{k-1})}`;
    case "false-position":
      return String.raw`x_{k+1}=b_k-\frac{f(b_k)(b_k-a_k)}{f(b_k)-f(a_k)}`;
    default:
      return String.raw`f(x)=0`;
  }
}

function interpolationExampleLatex(example: (typeof interpolationExamples)[number]) {
  return String.raw`f(x)=${example.formula}`;
}

function interpolationMethodLatex(methodId: string) {
  switch (methodId) {
    case "lagrange":
      return String.raw`p_n(x)=\sum_{j=0}^{n} y_j \ell_j(x)`;
    case "chebyshev-barycentric":
      return String.raw`p_n(x)=\frac{\sum_{j=0}^{n}\frac{w_j y_j}{x-x_j}}{\sum_{j=0}^{n}\frac{w_j}{x-x_j}},\quad x_j\sim \cos\frac{(2j+1)\pi}{2n+2}`;
    case "newton-divided-difference":
      return String.raw`p_n(x)=a_0+a_1(x-x_0)+\cdots+a_n\prod_{j=0}^{n-1}(x-x_j)`;
    case "piecewise-linear":
      return String.raw`p(x)=y_i+\frac{y_{i+1}-y_i}{x_{i+1}-x_i}(x-x_i)`;
    case "cubic-spline":
      return String.raw`s_i(x)=a_i+b_i(x-x_i)+c_i(x-x_i)^2+d_i(x-x_i)^3`;
    default:
      return String.raw`p(x)\approx f(x)`;
  }
}

function buildLeastSquaresRange(
  sourceMatrix: Array<[number, number]>,
  observations: number[],
  traces: Array<ReturnType<typeof buildMatrixTrace>>,
) {
  const xs = sourceMatrix.map((row) => row[0]);
  const predicted = traces.flatMap((item) => {
    const params = item.steps.at(-1)?.vector ?? item.exactSolution;
    return xs.map((value) => params[0] * value + params[1]);
  });
  const ys = [...observations, ...predicted];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = 820;
  const height = 400;
  const pad = 36;
  const xMap = (value: number) => pad + ((value - minX) / Math.max(maxX - minX, 1e-9)) * (width - pad * 2);
  const yMap = (value: number) => height - pad - ((value - minY) / Math.max(maxY - minY, 1e-9)) * (height - pad * 2);
  return { minX, maxX, minY, maxY, xMap, yMap };
}

function buildCovarianceCloud(matrix: [[number, number], [number, number]]) {
  const points: Array<[number, number]> = [];
  for (let index = 0; index < 72; index += 1) {
    const theta = (Math.PI * 2 * index) / 72;
    const radius = 0.45 + ((index % 9) / 9) * 1.1;
    const seed: [number, number] = [Math.cos(theta) * radius, Math.sin(theta) * radius * 0.72];
    points.push([
      matrix[0][0] * seed[0] * 0.35 + matrix[0][1] * seed[1] * 0.35,
      matrix[1][0] * seed[0] * 0.35 + matrix[1][1] * seed[1] * 0.35,
    ]);
  }
  return points;
}

function MatrixBenchmarkSummary({
  selectedTrace,
  comparisonTraces,
}: {
  selectedTrace: ReturnType<typeof buildMatrixTrace>;
  comparisonTraces: ReturnType<typeof buildMatrixTrace>[];
}) {
  const rows = buildMatrixBenchmarkRows(selectedTrace, comparisonTraces);
  const { wins, losses } = summarizeBenchmark(rows, selectedTrace.metadata.methodName);
  return <CompactBenchmarkSummary rows={rows} methodName={selectedTrace.metadata.methodName} wins={wins} losses={losses} />;
}

function RootBenchmarkSummary({
  selectedTrace,
  comparisonTraces,
}: {
  selectedTrace: ReturnType<typeof buildRootFindingTrace>;
  comparisonTraces: ReturnType<typeof buildRootFindingTrace>[];
}) {
  const rows = buildRootBenchmarkRows(selectedTrace, comparisonTraces);
  const { wins, losses } = summarizeBenchmark(rows, selectedTrace.metadata.methodName);
  return <CompactBenchmarkSummary rows={rows} wins={wins} losses={losses} methodName={selectedTrace.metadata.methodName} />;
}

function InterpolationBenchmarkSummary({
  selectedTrace,
  comparisonTraces,
}: {
  selectedTrace: ReturnType<typeof buildInterpolationTrace>;
  comparisonTraces: ReturnType<typeof buildInterpolationTrace>[];
}) {
  const rows = buildInterpolationBenchmarkRows(selectedTrace, comparisonTraces);
  const { wins, losses } = summarizeBenchmark(rows, selectedTrace.metadata.methodName);
  return <CompactBenchmarkSummary rows={rows} wins={wins} losses={losses} methodName={selectedTrace.metadata.methodName} />;
}

function MatrixPanelCard({
  panelId,
  expandedPanel,
  onExpandPanel,
  title,
  subtitle,
  className,
  children,
}: {
  panelId: "main" | "secondary" | "residual" | "diagnostics";
  expandedPanel: "main" | "secondary" | "residual" | "diagnostics" | null;
  onExpandPanel: (panel: "main" | "secondary" | "residual" | "diagnostics" | null) => void;
  title: string;
  subtitle: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded border bg-white p-4 shadow-sm ${panelId === "main" ? "lg:row-span-1" : ""} ${expandedPanel === panelId ? "border-[#0f766e]" : "border-[#d7dfde]"} ${className ?? ""}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">2D Analyze</div>
          <div className="text-lg font-semibold text-[#1f2937]">{title}</div>
          <div className="text-xs text-[#55636d]">{subtitle}</div>
        </div>
        <button
          type="button"
          onClick={() => onExpandPanel(panelId)}
          className="flex items-center gap-2 rounded border border-[#cfd9dd] bg-white px-3 py-2 text-sm font-medium text-[#20303a] hover:bg-[#eef4f5]"
        >
          <Expand size={16} />
          Kattalashtir
        </button>
      </div>
      {children}
    </div>
  );
}

function InteractiveFigure({
  children,
  tooltip,
  onClearTooltip,
  minScale = 1,
  maxScale = 4,
}: {
  children: ReactNode;
  tooltip: ChartTooltip | null;
  onClearTooltip: () => void;
  minScale?: number;
  maxScale?: number;
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  return (
    <div className="relative h-[calc(100%-1rem)] min-h-[360px] overflow-hidden rounded border border-[#e3eaed] bg-white">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded border border-[#d7dfde] bg-white/95 px-2 py-1 text-xs text-[#40525c] shadow-sm">
        <button type="button" className="rounded px-2 py-1 hover:bg-[#eef4f5]" onClick={() => setScale((value) => Math.max(minScale, value - 0.2))}>-</button>
        <span>{scale.toFixed(1)}x</span>
        <button type="button" className="rounded px-2 py-1 hover:bg-[#eef4f5]" onClick={() => setScale((value) => Math.min(maxScale, value + 0.2))}>+</button>
        <button
          type="button"
          className="rounded px-2 py-1 hover:bg-[#eef4f5]"
          onClick={() => {
            setScale(1);
            setOffset({ x: 0, y: 0 });
          }}
        >
          Reset
        </button>
      </div>
      <div
        className="h-full w-full cursor-grab overflow-hidden active:cursor-grabbing"
        onWheel={(event) => {
          event.preventDefault();
          setScale((value) => Math.min(maxScale, Math.max(minScale, value + (event.deltaY < 0 ? 0.14 : -0.14))));
        }}
        onMouseDown={(event) => {
          dragRef.current = { startX: event.clientX, startY: event.clientY, originX: offset.x, originY: offset.y };
        }}
        onMouseMove={(event) => {
          if (!dragRef.current) return;
          setOffset({
            x: dragRef.current.originX + (event.clientX - dragRef.current.startX),
            y: dragRef.current.originY + (event.clientY - dragRef.current.startY),
          });
        }}
        onMouseUp={() => {
          dragRef.current = null;
        }}
        onMouseLeave={() => {
          dragRef.current = null;
          onClearTooltip();
        }}
      >
        <div className="h-full w-full" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: "center center" }}>
          {children}
        </div>
      </div>
      {tooltip ? (
        <div className="pointer-events-none absolute z-20 max-w-[240px] rounded border border-[#d7dfde] bg-white/96 px-3 py-2 text-xs shadow-lg" style={{ left: Math.min(tooltip.x + 18, 620), top: Math.max(16, tooltip.y + 18) }}>
          <div className="font-semibold text-[#1f2937]">{tooltip.title}</div>
          {tooltip.lines.map((line) => (
            <div key={line} className="mt-1 text-[#55636d]">{line}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function makeTooltip(event: ReactMouseEvent<SVGElement, MouseEvent>, title: string, lines: string[]): ChartTooltip {
  const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    title,
    lines,
  };
}

function latexMatrix(matrix: Array<[number, number]> | [[number, number], [number, number]]) {
  return String.raw`\begin{bmatrix}${matrix.map((row) => `${format(row[0])} & ${format(row[1])}`).join(String.raw`\\`)}\end{bmatrix}`;
}

function latexColumn(values: [number, number] | number[]) {
  return String.raw`\begin{bmatrix}${values.map((value) => format(value)).join(String.raw`\\`)}\end{bmatrix}`;
}

function matrixMethodColor(methodId: string) {
  if (methodId === "gauss-seidel") return "#10b981";
  if (methodId === "sor") return "#a855f7";
  if (methodId === "richardson") return "#f97316";
  if (methodId === "conjugate-gradient") return "#ef4444";
  if (methodId === "landweber-least-squares") return "#8b5cf6";
  if (methodId === "power-iteration") return "#f59e0b";
  if (methodId === "inverse-iteration") return "#14b8a6";
  if (methodId === "qr-iteration") return "#06b6d4";
  if (methodId === "pca-svd") return "#ec4899";
  return "#60a5fa";
}

function rootMethodColor(methodId: string) {
  if (methodId === "newton") return "#22d3ee";
  if (methodId === "secant") return "#a78bfa";
  if (methodId === "false-position") return "#ec4899";
  if (methodId === "illinois") return "#14b8a6";
  return "#f97316";
}

function interpolationMethodColor(methodId: string) {
  if (methodId === "cubic-spline") return "#10b981";
  if (methodId === "piecewise-linear") return "#f59e0b";
  if (methodId === "newton-divided-difference") return "#38bdf8";
  if (methodId === "chebyshev-barycentric") return "#8b5cf6";
  return "#fb7185";
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
