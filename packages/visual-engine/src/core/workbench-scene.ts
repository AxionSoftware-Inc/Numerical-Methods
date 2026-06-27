import type {
  IntegrationTrace,
  MatrixTrace,
  OptimizationExampleSpec,
  OperatorWorkbenchArtifact,
  PdeTrace,
  ProbabilityTrace,
  RootFindingTrace,
  SurfaceIntegralTrace,
  TraceResult,
  VolumeIntegralTrace,
  OptimizationTrace,
  InterpolationTrace,
} from "@methodslab/methods-engine/core";
import { createAreaIntegralSceneSpec } from "./area-integral";
import { createInterpolationTraceSceneSpec } from "./interpolation-trace";
import { createMatrixTraceSceneSpec } from "./matrix-trace";
import { createSurfaceIntegralSceneSpec, createVolumeIntegralSceneSpec } from "./multi-integral";
import { createOdeTraceSceneSpec } from "./ode-trace";
import { createOperatorFamilySceneSpec } from "./operator-family";
import { createOptimizationTraceSceneSpec } from "./optimization-trace";
import { createPdeTraceSceneSpec } from "./pde-trace";
import { createProbabilityTraceSceneSpec } from "./probability-trace";
import { createRootFindingTraceSceneSpec } from "./root-finding-trace";
import type { VisualSceneSpec } from "./types";

type WorkbenchSceneOptions = {
  focus?: number;
  visibleLayerIds?: string[];
};

export function createWorkbenchSceneSpec(
  artifact: OperatorWorkbenchArtifact,
  options: WorkbenchSceneOptions = {},
): VisualSceneSpec {
  const visibleLayerIds = new Set(options.visibleLayerIds ?? artifact.visual.layerToggles.filter((item) => item.defaultVisible).map((item) => item.id));

  switch (artifact.visual.sceneKind) {
    case "ode-trace":
      return createOdeTraceSceneSpec(artifact.trace as TraceResult, {
        comparisonTraces: artifact.comparisonTraces as TraceResult[],
        focus: options.focus ?? artifact.visual.defaultFocus,
        showNumeric: visibleLayerIds.has("numeric"),
        showExact: visibleLayerIds.has("exact"),
        showErrors: visibleLayerIds.has("errors"),
        showStages: visibleLayerIds.has("stages"),
      });
    case "pde-trace":
      return createPdeTraceSceneSpec(artifact.trace as PdeTrace, {
        comparisonTraces: artifact.comparisonTraces as PdeTrace[],
        focus: options.focus ?? artifact.visual.defaultFocus,
        showField: visibleLayerIds.has("field"),
        showExact: visibleLayerIds.has("exact"),
        showError: visibleLayerIds.has("error"),
      });
    case "area-integral":
      return createAreaIntegralSceneSpec(artifact.trace as IntegrationTrace, {
        comparisonTraces: artifact.comparisonTraces as IntegrationTrace[],
        focus: options.focus ?? artifact.visual.defaultFocus,
        showPanels: visibleLayerIds.has("panels"),
        showSamples: visibleLayerIds.has("samples"),
        showProgress: visibleLayerIds.has("progress"),
        showComparison: visibleLayerIds.has("comparison"),
      });
    case "surface-integral":
      return createSurfaceIntegralSceneSpec(artifact.trace as SurfaceIntegralTrace, {
        showAnalysis: visibleLayerIds.has("analysis"),
        showGrid: visibleLayerIds.has("surface"),
      });
    case "volume-integral":
      return createVolumeIntegralSceneSpec(artifact.trace as VolumeIntegralTrace, {
        showAnalysis: visibleLayerIds.has("analysis"),
        showGrid: visibleLayerIds.has("columns"),
        showFrame: visibleLayerIds.has("samples"),
      });
    case "matrix-trace":
      return createMatrixTraceSceneSpec(artifact.trace as MatrixTrace, {
        comparisonTraces: artifact.comparisonTraces as MatrixTrace[],
        focus: options.focus ?? artifact.visual.defaultFocus,
        showBasis: visibleLayerIds.has("basis"),
        showOrbit: visibleLayerIds.has("orbit"),
        showComparison: artifact.visual.supportsComparison && visibleLayerIds.has("comparison"),
      });
    case "root-finding-trace":
      return createRootFindingTraceSceneSpec(artifact.trace as RootFindingTrace, {
        comparisonTraces: artifact.comparisonTraces as RootFindingTrace[],
        focus: options.focus ?? artifact.visual.defaultFocus,
        showCurve: visibleLayerIds.has("curve"),
        showBracket: visibleLayerIds.has("bracket"),
        showComparison: artifact.visual.supportsComparison && visibleLayerIds.has("comparison"),
        ...(artifact.sceneInput as { equation?: string; xRange?: [number, number]; evaluate?: (x: number) => number; exactRoot?: number } | undefined),
      });
    case "optimization-trace":
      return createOptimizationTraceSceneSpec(
        artifact.trace as OptimizationTrace,
        (artifact.sceneInput as { example: OptimizationExampleSpec }).example,
        {
          comparisonTraces: artifact.comparisonTraces as OptimizationTrace[],
          focus: options.focus ?? artifact.visual.defaultFocus,
          showSurface: visibleLayerIds.has("surface"),
          showPath: visibleLayerIds.has("path"),
          showGradient: visibleLayerIds.has("gradients"),
          showComparison: artifact.visual.supportsComparison && visibleLayerIds.has("comparison"),
        },
      );
    case "probability-trace":
      return createProbabilityTraceSceneSpec(artifact.trace as ProbabilityTrace, {
        comparisonTraces: artifact.comparisonTraces as ProbabilityTrace[],
        focus: options.focus ?? artifact.visual.defaultFocus,
        showPaths: visibleLayerIds.has("paths"),
        showMoments: visibleLayerIds.has("moments"),
        showHistogram: visibleLayerIds.has("histogram"),
        showConvergence: visibleLayerIds.has("convergence"),
      });
    case "interpolation-trace":
      return createInterpolationTraceSceneSpec(artifact.trace as InterpolationTrace, {
        comparisonTraces: artifact.comparisonTraces as InterpolationTrace[],
        focus: options.focus ?? artifact.visual.defaultFocus,
        showNodes: visibleLayerIds.has("nodes"),
        showCurve: visibleLayerIds.has("curve"),
        showComparison: artifact.visual.supportsComparison && visibleLayerIds.has("comparison"),
        ...(artifact.sceneInput as { formula?: string; xRange?: [number, number]; yRange?: [number, number] } | undefined),
      });
    case "operator-family-preview":
      return createOperatorFamilySceneSpec(previewInputFromArtifact(artifact));
    default:
      return createOperatorFamilySceneSpec(previewInputFromArtifact(artifact));
  }
}

function previewInputFromArtifact(artifact: OperatorWorkbenchArtifact) {
  return {
    familyName: artifact.familyName,
    visualGrammar: artifact.visual.visualGrammar,
    schemeName: artifact.methodName,
    formula: inferFormula(artifact.trace as MatrixTrace | RootFindingTrace | InterpolationTrace),
    summary: artifact.summary,
    normalizedInput: `${artifact.familyId} ${artifact.methodName} ${artifact.exampleName}`.toLowerCase(),
    confidence: 0.92,
    showAnalysis: true,
    showComparison: artifact.comparisonTraces.length > 0,
    focus: artifact.visual.defaultFocus,
  };
}

function inferFormula(trace: MatrixTrace | RootFindingTrace | InterpolationTrace) {
  if ("steps" in trace && trace.metadata.methodId) return trace.metadata.methodName;
  if ("samples" in trace) return trace.metadata.methodName;
  return trace.metadata.methodName;
}
