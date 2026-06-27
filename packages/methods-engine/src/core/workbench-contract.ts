import type { IntegrationTrace, SurfaceIntegralTrace, VolumeIntegralTrace } from "./integration";
import type { PdeTrace } from "./types";
import type {
  InterpolationTrace,
  MatrixTrace,
  OptimizationExampleSpec,
  OptimizationTrace,
  OperatorFamilyId,
  OperatorGrammarId,
  ProbabilityTrace,
  RootFindingTrace,
  TraceResult,
} from "./types";

export type OperatorWorkbenchSceneKind =
  | "ode-trace"
  | "pde-trace"
  | "area-integral"
  | "surface-integral"
  | "volume-integral"
  | "matrix-trace"
  | "root-finding-trace"
  | "optimization-trace"
  | "probability-trace"
  | "interpolation-trace"
  | "operator-family-preview";

export type OperatorWorkbenchLayerToggle = {
  id: string;
  label: string;
  defaultVisible: boolean;
};

export type OperatorWorkbenchDiagnostic = {
  id: string;
  label: string;
  value: number;
  display: string;
  emphasis?: "higher-better" | "lower-better" | "neutral";
  interpretation: string;
};

export type OperatorWorkbenchVisualContract = {
  sceneKind: OperatorWorkbenchSceneKind;
  visualGrammar: OperatorGrammarId;
  supportsComparison: boolean;
  supportsFocus: boolean;
  supportsComposition: boolean;
  defaultFocus: number;
  layerToggles: OperatorWorkbenchLayerToggle[];
};

export type OperatorWorkbenchTrace =
  | TraceResult
  | PdeTrace
  | IntegrationTrace
  | SurfaceIntegralTrace
  | VolumeIntegralTrace
  | MatrixTrace
  | RootFindingTrace
  | OptimizationTrace
  | ProbabilityTrace
  | InterpolationTrace;

export type OperatorWorkbenchArtifact<TTrace extends OperatorWorkbenchTrace = OperatorWorkbenchTrace> = {
  familyId: OperatorFamilyId;
  familyName: string;
  methodId: string;
  methodName: string;
  exampleId: string;
  exampleName: string;
  trace: TTrace;
  comparisonTraces: readonly TTrace[];
  diagnostics: readonly OperatorWorkbenchDiagnostic[];
  visual: OperatorWorkbenchVisualContract;
  summary: string;
  sceneInput?: unknown;
};

export function createOdeWorkbenchArtifact(trace: TraceResult, comparisonTraces: TraceResult[] = []): OperatorWorkbenchArtifact<TraceResult> {
  return createArtifact("ode", trace.metadata.methodId, trace.metadata.methodName, trace.metadata.exampleId, trace.metadata.exampleName, trace, comparisonTraces, {
    sceneKind: "ode-trace",
    supportsComparison: true,
    supportsFocus: true,
    supportsComposition: true,
    defaultFocus: 1,
    layerToggles: [
      toggle("numeric", "Numeric path"),
      toggle("exact", "Exact path"),
      toggle("errors", "Error spikes"),
      toggle("stages", "Stage vectors", false),
    ],
  }, [
    metric("final-error", "Final error", trace.metrics.finalError, "lower-better", "Oxirgi holatdagi aniqlik."),
    metric("max-error", "Max error", trace.metrics.maxError, "lower-better", "Butun trajectory bo'ylab eng yomon og'ish."),
    metric("steps", "Steps", trace.steps.length, "lower-better", "Solver xarajati uchun asosiy hisob."),
  ], "Trajectory, local error va stage geometry bir artefact ichida yig'ildi.");
}

export function createPdeWorkbenchArtifact(trace: PdeTrace, comparisonTraces: PdeTrace[] = []): OperatorWorkbenchArtifact<PdeTrace> {
  const finalL2 = trace.errors.at(-1)?.l2 ?? 0;
  const finalLinf = trace.errors.at(-1)?.linf ?? 0;
  return createArtifact("pde", trace.metadata.methodId, trace.metadata.methodName, trace.metadata.exampleId, trace.metadata.exampleName, trace, comparisonTraces, {
    sceneKind: "pde-trace",
    supportsComparison: true,
    supportsFocus: true,
    supportsComposition: true,
    defaultFocus: 1,
    layerToggles: [
      toggle("field", "Field profile"),
      toggle("exact", "Exact profile"),
      toggle("error", "Error history"),
    ],
  }, [
    metric("final-l2", "Final L2", finalL2, "lower-better", "Yakuniy global maydon xatosi."),
    metric("final-linf", "Final Linf", finalLinf, "lower-better", "Eng yomon fazoviy og'ish."),
    metric("resolution", "Resolution", trace.cells * trace.timeSteps, "lower-better", "Grid va vaqt diskretizatsiyasi budjeti."),
  ], "Field evolution, final profile va error history workbench uchun standartlashtirildi.");
}

export function createAreaIntegralWorkbenchArtifact(trace: IntegrationTrace, comparisonTraces: IntegrationTrace[] = []): OperatorWorkbenchArtifact<IntegrationTrace> {
  return createArtifact("integral", trace.metadata.methodId, trace.metadata.methodName, trace.metadata.exampleId, trace.metadata.exampleName, trace, comparisonTraces, {
    sceneKind: "area-integral",
    supportsComparison: true,
    supportsFocus: true,
    supportsComposition: true,
    defaultFocus: 1,
    layerToggles: [
      toggle("panels", "Panels"),
      toggle("samples", "Samples"),
      toggle("progress", "Convergence"),
    ],
  }, [
    metric("abs-error", "Abs error", trace.absError, "lower-better", "Integral aniqligi."),
    metric("sample-count", "Samples", trace.sampleCount, "lower-better", "Hisoblash xarajati."),
    metric("sensitivity", "Sensitivity", trace.sensitivity, "lower-better", "Resolutionga sezgirlik."),
  ], "Panel, sample va convergence trace'lari bir xil workbench contractga keltirildi.");
}

export function createSurfaceIntegralWorkbenchArtifact(trace: SurfaceIntegralTrace, comparisonTraces: SurfaceIntegralTrace[] = []): OperatorWorkbenchArtifact<SurfaceIntegralTrace> {
  return createArtifact("integral", trace.metadata.methodId, trace.metadata.methodName, trace.metadata.exampleId, trace.metadata.exampleName, trace, comparisonTraces, {
    sceneKind: "surface-integral",
    supportsComparison: false,
    supportsFocus: true,
    supportsComposition: true,
    defaultFocus: 1,
    layerToggles: [
      toggle("surface", "Surface"),
      toggle("samples", "Samples"),
      toggle("analysis", "Analysis"),
    ],
  }, [
    metric("abs-error", "Abs error", trace.absError, "lower-better", "Surface integral xatosi."),
    metric("resolution", "Resolution", trace.resolution, "lower-better", "Grid zichligi."),
    metric("sample-count", "Samples", trace.sampleCount, "lower-better", "Sampling budjeti."),
  ], "Surface integral sahnasi workbench composition uchun markazlashtirildi.");
}

export function createVolumeIntegralWorkbenchArtifact(trace: VolumeIntegralTrace, comparisonTraces: VolumeIntegralTrace[] = []): OperatorWorkbenchArtifact<VolumeIntegralTrace> {
  return createArtifact("integral", trace.metadata.methodId, trace.metadata.methodName, trace.metadata.exampleId, trace.metadata.exampleName, trace, comparisonTraces, {
    sceneKind: "volume-integral",
    supportsComparison: false,
    supportsFocus: true,
    supportsComposition: true,
    defaultFocus: 1,
    layerToggles: [
      toggle("columns", "Columns"),
      toggle("samples", "Samples"),
      toggle("analysis", "Analysis"),
    ],
  }, [
    metric("abs-error", "Abs error", trace.absError, "lower-better", "Volume integral xatosi."),
    metric("resolution", "Resolution", trace.resolution, "lower-better", "Voxel zichligi."),
    metric("sample-count", "Samples", trace.sampleCount, "lower-better", "Sampling budjeti."),
  ], "Volume column visualization workbench ichida qayta ishlatish uchun contract qilindi.");
}

export function createOptimizationWorkbenchArtifact(
  trace: OptimizationTrace,
  example: OptimizationExampleSpec,
  comparisonTraces: OptimizationTrace[] = [],
): OperatorWorkbenchArtifact<OptimizationTrace> {
  return createArtifact("optimization", trace.metadata.methodId, trace.metadata.methodName, trace.metadata.exampleId, trace.metadata.exampleName, trace, comparisonTraces, {
    sceneKind: "optimization-trace",
    supportsComparison: true,
    supportsFocus: true,
    supportsComposition: true,
    defaultFocus: 1,
    layerToggles: [
      toggle("surface", "Surface"),
      toggle("path", "Path"),
      toggle("gradients", "Gradients"),
      toggle("comparison", "Comparison"),
    ],
  }, [
    metric("final-value", "Final value", trace.finalValue, "lower-better", "Objective qiymati."),
    metric("gradient-norm", "Grad norm", trace.finalGradientNorm, "lower-better", "Optimality sharti."),
    metric("distance", "Distance", trace.finalDistance, "lower-better", "Known optimumgacha masofa."),
  ], "Optimizer state, path va convergence endi bitta markaziy artifactdan olinadi.", {
    example,
  });
}

export function createProbabilityWorkbenchArtifact(trace: ProbabilityTrace, comparisonTraces: ProbabilityTrace[] = []): OperatorWorkbenchArtifact<ProbabilityTrace> {
  return createArtifact("probability", trace.metadata.methodId, trace.metadata.methodName, trace.metadata.exampleId, trace.metadata.exampleName, trace, comparisonTraces, {
    sceneKind: "probability-trace",
    supportsComparison: true,
    supportsFocus: true,
    supportsComposition: true,
    defaultFocus: 1,
    layerToggles: [
      toggle("paths", "Paths"),
      toggle("moments", "Moments"),
      toggle("histogram", "Histogram"),
      toggle("convergence", "Convergence"),
    ],
  }, [
    metric("weak-error", "Weak error", trace.weakErrorEstimate, "lower-better", "Mean estimator bias."),
    metric("strong-error", "Strong error", trace.strongErrorEstimate, "lower-better", "Pathwise og'ish."),
    metric("stderr", "Payoff stderr", trace.payoffStdError, "lower-better", "Estimator uncertainty."),
  ], "Stochastic paths, moment geometry va risk statistikasi workbench contractga tushdi.");
}

export function createMatrixWorkbenchArtifact(trace: MatrixTrace, comparisonTraces: MatrixTrace[] = []): OperatorWorkbenchArtifact<MatrixTrace> {
  return createArtifact("matrix", trace.metadata.methodId, trace.metadata.methodName, trace.metadata.exampleId, trace.metadata.exampleName, trace, comparisonTraces, {
    sceneKind: "matrix-trace",
    supportsComparison: true,
    supportsFocus: true,
    supportsComposition: true,
    defaultFocus: 1,
    layerToggles: [
      toggle("basis", "Basis"),
      toggle("orbit", "Orbit"),
      toggle("comparison", "Comparison"),
    ],
  }, [
    metric("residual", "Residual", trace.steps.at(-1)?.residual ?? 0, "lower-better", "Yakuniy residual."),
    metric("error", "State error", trace.steps.at(-1)?.error ?? 0, "lower-better", "Targetga yaqinlik."),
    metric("rayleigh", "Rayleigh error", trace.finalRayleighError, "lower-better", "Spektral moslik."),
  ], "Matrix orbit, basis deformation va spectral diagnostics endi trace-driven markaziy sahnada ko'rsatiladi.");
}

export function createRootFindingWorkbenchArtifact(
  trace: RootFindingTrace,
  comparisonTraces: RootFindingTrace[] = [],
  sceneInput?: { equation?: string; xRange?: [number, number]; evaluate?: (x: number) => number; exactRoot?: number },
): OperatorWorkbenchArtifact<RootFindingTrace> {
  return createArtifact("root-finding", trace.metadata.methodId, trace.metadata.methodName, trace.metadata.exampleId, trace.metadata.exampleName, trace, comparisonTraces, {
    sceneKind: "root-finding-trace",
    supportsComparison: true,
    supportsFocus: true,
    supportsComposition: true,
    defaultFocus: 1,
    layerToggles: [
      toggle("curve", "Curve"),
      toggle("bracket", "Bracket"),
      toggle("comparison", "Comparison"),
    ],
  }, [
    metric("residual", "Residual", trace.finalResidual, "lower-better", "Oxirgi qoldiq."),
    metric("root-error", "Root error", trace.finalError, "lower-better", "Exact rootgacha xato."),
    metric("bracket", "Bracket retention", trace.bracketRetentionRate, "higher-better", "Xavfsizlik darajasi."),
  ], "Residual curve, interval geometry va iteration path bitta root-finding sahnaga yig'ildi.", sceneInput);
}

export function createInterpolationWorkbenchArtifact(
  trace: InterpolationTrace,
  comparisonTraces: InterpolationTrace[] = [],
  sceneInput?: { formula?: string; xRange?: [number, number]; yRange?: [number, number] },
): OperatorWorkbenchArtifact<InterpolationTrace> {
  return createArtifact("interpolation", trace.metadata.methodId, trace.metadata.methodName, trace.metadata.exampleId, trace.metadata.exampleName, trace, comparisonTraces, {
    sceneKind: "interpolation-trace",
    supportsComparison: true,
    supportsFocus: true,
    supportsComposition: true,
    defaultFocus: 1,
    layerToggles: [
      toggle("nodes", "Nodes"),
      toggle("curve", "Curve"),
      toggle("comparison", "Comparison"),
    ],
  }, [
    metric("max-error", "Max error", trace.maxAbsError, "lower-better", "Eng yomon nuqtadagi xato."),
    metric("rms", "RMS error", trace.rmsError, "lower-better", "Global fit sifati."),
    metric("roughness", "Roughness", trace.roughness, "lower-better", "Silliqlik darajasi."),
  ], "Nodes, reconstructed curve va error geometry trace-driven markaziy sahnaga o'tdi.", sceneInput);
}

function createArtifact<TTrace extends OperatorWorkbenchTrace>(
  familyId: OperatorFamilyId,
  methodId: string,
  methodName: string,
  exampleId: string,
  exampleName: string,
  trace: TTrace,
  comparisonTraces: TTrace[],
  visualInput: Omit<OperatorWorkbenchVisualContract, "visualGrammar">,
  diagnostics: OperatorWorkbenchDiagnostic[],
  summary: string,
  sceneInput?: unknown,
): OperatorWorkbenchArtifact<TTrace> {
  return {
    familyId,
    familyName: familyNames[familyId],
    methodId,
    methodName,
    exampleId,
    exampleName,
    trace,
    comparisonTraces,
    diagnostics,
    visual: {
      ...visualInput,
      visualGrammar: familyGrammars[familyId],
    },
    summary,
    sceneInput,
  };
}

function toggle(id: string, label: string, defaultVisible = true): OperatorWorkbenchLayerToggle {
  return { id, label, defaultVisible };
}

function metric(
  id: string,
  label: string,
  value: number,
  emphasis: "higher-better" | "lower-better" | "neutral",
  interpretation: string,
): OperatorWorkbenchDiagnostic {
  return {
    id,
    label,
    value,
    display: formatMetric(value),
    emphasis,
    interpretation,
  };
}

function formatMetric(value: number) {
  return Math.abs(value) >= 100 || Math.abs(value) < 0.01 ? value.toExponential(2) : value.toFixed(3);
}

const familyNames: Record<OperatorFamilyId, string> = {
  ode: "ODE",
  integral: "Integral",
  pde: "PDE",
  matrix: "Matrix / linear algebra",
  "root-finding": "Root finding",
  optimization: "Optimization",
  probability: "Probability / stochastic",
  interpolation: "Interpolation / approximation",
};

const familyGrammars: Record<OperatorFamilyId, OperatorGrammarId> = {
  ode: "trajectory-flow",
  integral: "partition-accumulation",
  pde: "field-mesh",
  matrix: "transform-basis",
  "root-finding": "convergence-path",
  optimization: "landscape-descent",
  probability: "stochastic-path",
  interpolation: "curve-reconstruction",
};
