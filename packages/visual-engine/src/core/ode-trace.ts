import type { TraceResult } from "@methodslab/methods-engine/core";
import type { VisualLayerSpec, VisualSceneSpec, VisualVec3 } from "./types";
import { createArrowLayer, createAxesLayers, createGridLayer, createLabelLayer, createLineLayer, createMarkerLayer, createSceneSpec } from "./scene-objects";

export function createOdeTraceSceneSpec(
  trace: TraceResult,
  options: {
    comparisonTraces?: TraceResult[];
    focus?: number;
    showNumeric?: boolean;
    showExact?: boolean;
    showErrors?: boolean;
    showStages?: boolean;
  } = {},
): VisualSceneSpec {
  const focus = options.focus ?? 1;
  const count = Math.max(2, Math.floor(trace.points.length * Math.max(0.08, focus)));
  const numeric = trace.points.slice(0, count);
  const exact = trace.exactAtStep.slice(0, count);
  const comparisons = options.comparisonTraces ?? [];
  const showNumeric = options.showNumeric ?? true;
  const showExact = options.showExact ?? true;
  const showErrors = options.showErrors ?? true;
  const stageLayers = options.showStages === false ? [] : createStageLayers(trace, count);

  const layers: VisualLayerSpec[] = [
    createGridLayer("ode-grid", { size: 4.4, divisions: 18, y: -1.02, color: "#284454", opacity: 0.2 }),
    ...createAxesLayers(1.7, [-1.76, -1.0, -1.3]),
    createLabelLayer("ode-title", trace.metadata.exampleName, [-1.75, 2.12, 1.65], "#f8fafc", { scale: 0.24 }),
    createLabelLayer("ode-method", trace.metadata.methodName, [-1.75, 1.8, 1.65], "#93c5fd", { scale: 0.12 }),
    createLabelLayer("ode-stats", `h=${trace.metadata.step.toFixed(3)}, final=${trace.metrics.finalError.toExponential(2)}`, [-1.75, 1.54, 1.65], "#dbeafe", {
      scale: 0.1,
    }),
  ];

  if (showNumeric) {
    layers.push(
      createLineLayer("ode-numeric", pathSegments(normalizePath(numeric)), "#f59e0b", { opacity: 0.92, linewidth: 2.2 }),
      createMarkerLayer("ode-start", normalizePoint(numeric[0]!), "#34d399", { radius: 0.045, label: "start" }),
      createMarkerLayer("ode-final", normalizePoint(numeric[numeric.length - 1]!), "#fde047", { radius: 0.055, label: "current" }),
    );
  }

  if (showExact) {
    layers.push(createLineLayer("ode-exact", pathSegments(normalizePath(exact)), "#f8fafc", { opacity: 0.82, linewidth: 1.8 }));
  }

  if (showErrors) {
    layers.push(...createErrorLayers(trace, count));
  }

  layers.push(...stageLayers, ...createComparisonLayers(comparisons, count));

  return createSceneSpec({
    id: `ode-trace:${trace.metadata.methodId}:${trace.metadata.exampleId}:${trace.metadata.step}:${focus}`,
    camera: {
      position: [4.05, -5.9, 3.95],
      target: [0, 0.08, 0],
      fov: 45,
      minDistance: 2,
      maxDistance: 14,
    },
    style: {
      background: "#08131c",
      fogNear: 11,
      fogFar: 31,
      exposure: 1.14,
      ambientLight: 1.08,
    },
    layers,
    metadata: {
      kind: "ode-trace",
      methodName: trace.metadata.methodName,
      exampleName: trace.metadata.exampleName,
    },
  });
}

function normalizePath(points: TraceResult["points"]) {
  return points.map(normalizePoint);
}

function normalizePoint(point: [number, number, number]): VisualVec3 {
  return [point[0], point[1], point[2]];
}

function pathSegments(points: VisualVec3[]) {
  return points.slice(0, -1).map((point, index) => ({ from: point, to: points[index + 1]! }));
}

function createErrorLayers(trace: TraceResult, count: number): VisualLayerSpec[] {
  return trace.errors.slice(0, count).flatMap((sample, index) => {
    const numeric = normalizePoint(trace.points[index]!);
    const exact = normalizePoint(trace.exactAtStep[index]!);
    return [
      createLineLayer(`ode-error-${index}`, [{ from: numeric, to: exact }], "#fb7185", {
        opacity: 0.38,
        linewidth: 1.2,
      }),
    ];
  });
}

function createStageLayers(trace: TraceResult, count: number): VisualLayerSpec[] {
  const stride = Math.max(1, Math.floor(count / 8));
  return trace.steps.slice(0, count).flatMap((step, index) => {
    if (index % stride !== 0) return [];
    return step.stages.map((stage, stageIndex) =>
      createArrowLayer(
        `ode-stage-${index}-${stageIndex}`,
        normalizePoint(stage.sample),
        normalizePoint(stage.vectorEnd),
        stage.color,
        { opacity: 0.42, headSize: 0.05, shaftRadius: 0.008 },
      ),
    );
  });
}

function createComparisonLayers(comparisons: TraceResult[], count: number): VisualLayerSpec[] {
  return comparisons.flatMap((trace) => [
    createLineLayer(`ode-comparison-${trace.metadata.methodId}`, pathSegments(normalizePath(trace.points.slice(0, count))), trace.metadata.methodId === "euler" ? "#60a5fa" : "#c084fc", {
      opacity: 0.48,
      linewidth: 1.4,
    }),
  ]);
}
