import type { IntegrationTrace } from "./integration";
import type {
  InterpolationTrace,
  MatrixTrace,
  OptimizationTrace,
  PdeTrace,
  ProbabilityTrace,
  RootFindingTrace,
  TraceResult,
} from "./types";
import type { OperatorWorkbenchArtifact } from "./workbench-contract";

export type WorkbenchComparisonDimensionId = "accuracy" | "stability" | "efficiency" | "geometry";

export type WorkbenchComparisonDimension = {
  id: WorkbenchComparisonDimensionId;
  label: string;
  score: number;
  display: string;
  summary: string;
};

export type WorkbenchComparisonProfile = {
  artifactId: string;
  familyId: OperatorWorkbenchArtifact["familyId"];
  methodName: string;
  exampleName: string;
  overallScore: number;
  dimensions: WorkbenchComparisonDimension[];
};

export type WorkbenchComparisonSummary = {
  profiles: WorkbenchComparisonProfile[];
  leaders: Record<WorkbenchComparisonDimensionId, WorkbenchComparisonProfile | null>;
};

export function createWorkbenchComparisonProfile(artifact: OperatorWorkbenchArtifact): WorkbenchComparisonProfile {
  const dimensions = comparisonDimensionsByFamily(artifact);
  return {
    artifactId: `${artifact.familyId}:${artifact.methodId}:${artifact.exampleId}`,
    familyId: artifact.familyId,
    methodName: artifact.methodName,
    exampleName: artifact.exampleName,
    overallScore: dimensions.reduce((sum, item) => sum + item.score, 0) / Math.max(dimensions.length, 1),
    dimensions,
  };
}

export function summarizeWorkbenchComparison(artifacts: readonly OperatorWorkbenchArtifact[]): WorkbenchComparisonSummary {
  const profiles = artifacts.map(createWorkbenchComparisonProfile);
  return {
    profiles,
    leaders: {
      accuracy: bestProfile(profiles, "accuracy"),
      stability: bestProfile(profiles, "stability"),
      efficiency: bestProfile(profiles, "efficiency"),
      geometry: bestProfile(profiles, "geometry"),
    },
  };
}

function comparisonDimensionsByFamily(artifact: OperatorWorkbenchArtifact): WorkbenchComparisonDimension[] {
  switch (artifact.familyId) {
    case "ode":
      return dimensionsFromOde(artifact.trace as TraceResult);
    case "integral":
      return dimensionsFromIntegral(artifact.trace as IntegrationTrace);
    case "pde":
      return dimensionsFromPde(artifact.trace as PdeTrace);
    case "matrix":
      return dimensionsFromMatrix(artifact.trace as MatrixTrace);
    case "root-finding":
      return dimensionsFromRootFinding(artifact.trace as RootFindingTrace);
    case "optimization":
      return dimensionsFromOptimization(artifact.trace as OptimizationTrace);
    case "probability":
      return dimensionsFromProbability(artifact.trace as ProbabilityTrace);
    case "interpolation":
      return dimensionsFromInterpolation(artifact.trace as InterpolationTrace);
    default:
      return fallbackDimensions();
  }
}

function dimensionsFromOde(trace: TraceResult) {
  return [
    dimension("accuracy", scoreFromLower(trace.metrics.finalError), trace.metrics.finalError, "final error"),
    dimension("stability", scoreFromLower(trace.metrics.maxError * 0.7 + mean(trace.errors.map((item) => item.magnitude)) * 0.3), trace.metrics.maxError, "max path drift"),
    dimension("efficiency", scoreFromLower(trace.steps.length / 24), trace.steps.length, "steps"),
    dimension("geometry", scoreFromLower(mean(trace.steps.map((step) => step.stages.length > 0 ? distance(step.end, step.exactEnd) : 0))), trace.metrics.metricValue, trace.metrics.metricLabel),
  ];
}

function dimensionsFromIntegral(trace: IntegrationTrace) {
  return [
    dimension("accuracy", scoreFromLower(trace.absError), trace.absError, "abs error"),
    dimension("stability", scoreFromLower(trace.sensitivity), trace.sensitivity, "resolution sensitivity"),
    dimension("efficiency", scoreFromLower(trace.sampleCount / 160), trace.sampleCount, "samples"),
    dimension("geometry", scoreFromLower(trace.sensitivity * 0.7 + trace.absError * 0.3), trace.panelCount, "panels"),
  ];
}

function dimensionsFromPde(trace: PdeTrace) {
  const finalL2 = trace.errors.at(-1)?.l2 ?? 0;
  const finalLinf = trace.errors.at(-1)?.linf ?? 0;
  return [
    dimension("accuracy", scoreFromLower(finalL2), finalL2, "final L2"),
    dimension("stability", scoreFromLower(finalLinf), finalLinf, "final Linf"),
    dimension("efficiency", scoreFromLower((trace.cells * trace.timeSteps) / 900), trace.cells * trace.timeSteps, "cell-step budget"),
    dimension("geometry", scoreFromLower(Math.abs(trace.r - 0.5)), trace.r, "stability ratio r"),
  ];
}

function dimensionsFromMatrix(trace: MatrixTrace) {
  const finalResidual = trace.steps.at(-1)?.residual ?? trace.initialResidual;
  return [
    dimension("accuracy", scoreFromLower(finalResidual + trace.finalRayleighError * 0.5), finalResidual, "final residual"),
    dimension("stability", scoreFromLower(Math.max(0, trace.averageContraction - 1) + trace.turnCount * 0.08), trace.averageContraction, "avg contraction"),
    dimension("efficiency", scoreFromLower(trace.iterations / 28), trace.iterations, "iterations"),
    dimension("geometry", scoreFromLower(trace.conditionNumber * 0.06 + trace.residualAxisSkew * 0.4), trace.conditionNumber, "condition number"),
  ];
}

function dimensionsFromRootFinding(trace: RootFindingTrace) {
  return [
    dimension("accuracy", scoreFromLower(trace.finalResidual + trace.finalError), trace.finalError, "root error"),
    dimension("stability", scoreFromHigher(trace.bracketRetentionRate / Math.max(1 + trace.oscillationCount + trace.stagnationCount, 1)), trace.bracketRetentionRate, "bracket retention"),
    dimension("efficiency", scoreFromLower(trace.iterations / 12), trace.iterations, "iterations"),
    dimension("geometry", scoreFromLower(trace.derivativeStress * 0.25 + trace.finalIntervalWidth), trace.finalIntervalWidth, "interval width"),
  ];
}

function dimensionsFromOptimization(trace: OptimizationTrace) {
  return [
    dimension("accuracy", scoreFromLower(trace.finalValue + trace.finalDistance), trace.finalValue, "final objective"),
    dimension("stability", scoreFromLower(trace.monotoneIncreaseCount * 0.25 + trace.oscillationCount * 0.25 + trace.negativeCurvatureSteps * 0.12), trace.oscillationCount, "oscillation count"),
    dimension("efficiency", scoreFromLower(trace.iterations / 28 + trace.averageConditionNumber * 0.01), trace.iterations, "iterations"),
    dimension("geometry", scoreFromLower(trace.finalGradientNorm + trace.averageConditionNumber * 0.02), trace.finalGradientNorm, "final grad norm"),
  ];
}

function dimensionsFromProbability(trace: ProbabilityTrace) {
  return [
    dimension("accuracy", scoreFromLower(trace.weakErrorEstimate + trace.strongErrorEstimate * 0.4), trace.weakErrorEstimate, "weak error"),
    dimension("stability", scoreFromLower(trace.payoffStdError), trace.payoffStdError, "payoff stderr"),
    dimension("efficiency", scoreFromLower((trace.pathCount * trace.steps) / 32000), trace.pathCount * trace.steps, "path-step budget"),
    dimension("geometry", scoreFromLower(Math.abs(trace.quantile95 - trace.quantile05) * 0.12), trace.quantile95 - trace.quantile05, "quantile width"),
  ];
}

function dimensionsFromInterpolation(trace: InterpolationTrace) {
  return [
    dimension("accuracy", scoreFromLower(trace.maxAbsError + trace.rmsError * 0.6), trace.maxAbsError, "max error"),
    dimension("stability", scoreFromLower(trace.overshootArea + trace.signChangeCount * 0.08), trace.overshootArea, "overshoot area"),
    dimension("efficiency", scoreFromLower(trace.nodeCount / 14), trace.nodeCount, "nodes"),
    dimension("geometry", scoreFromLower(trace.roughness * 0.02 + Math.abs(trace.totalVariationRatio - 1)), trace.totalVariationRatio, "variation ratio"),
  ];
}

function fallbackDimensions() {
  return [
    dimension("accuracy", 0.5, 0.5, "normalized"),
    dimension("stability", 0.5, 0.5, "normalized"),
    dimension("efficiency", 0.5, 0.5, "normalized"),
    dimension("geometry", 0.5, 0.5, "normalized"),
  ];
}

function dimension(id: WorkbenchComparisonDimensionId, score: number, value: number, unitLabel: string): WorkbenchComparisonDimension {
  return {
    id,
    label: dimensionLabel(id),
    score,
    display: formatMetric(value),
    summary: `${dimensionLabel(id)} · ${unitLabel}`,
  };
}

function dimensionLabel(id: WorkbenchComparisonDimensionId) {
  if (id === "accuracy") return "Accuracy";
  if (id === "stability") return "Stability";
  if (id === "efficiency") return "Efficiency";
  return "Geometry";
}

function bestProfile(profiles: WorkbenchComparisonProfile[], id: WorkbenchComparisonDimensionId) {
  return profiles.reduce<WorkbenchComparisonProfile | null>((best, current) => {
    if (!best) return current;
    const bestScore = best.dimensions.find((item) => item.id === id)?.score ?? -1;
    const currentScore = current.dimensions.find((item) => item.id === id)?.score ?? -1;
    return currentScore > bestScore ? current : best;
  }, null);
}

function scoreFromLower(value: number) {
  return clamp01(1 / (1 + Math.max(0, value)));
}

function scoreFromHigher(value: number) {
  return clamp01(value);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function distance(left: [number, number, number], right: [number, number, number]) {
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
}

function formatMetric(value: number) {
  return Math.abs(value) >= 100 || Math.abs(value) < 0.01 ? value.toExponential(2) : value.toFixed(3);
}
