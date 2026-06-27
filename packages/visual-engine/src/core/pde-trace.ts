import type { PdeTrace } from "@methodslab/methods-engine/core";
import type { VisualLayerSpec, VisualSceneSpec, VisualVec3 } from "./types";
import { createAxesLayers, createGridLayer, createLabelLayer, createLineLayer, createMarkerLayer, createSceneSpec } from "./scene-objects";

export function createPdeTraceSceneSpec(
  trace: PdeTrace,
  options: {
    comparisonTraces?: PdeTrace[];
    focus?: number;
    showField?: boolean;
    showExact?: boolean;
    showError?: boolean;
  } = {},
): VisualSceneSpec {
  const frame = trace.frames.at(-1) ?? trace.frames[0]!;
  const comparisonTraces = options.comparisonTraces ?? [];
  const finalL2 = trace.errors.at(-1)?.l2 ?? 0;
  const finalLinf = trace.errors.at(-1)?.linf ?? 0;
  const showField = options.showField ?? true;
  const showExact = options.showExact ?? true;
  const showError = options.showError ?? true;

  const layers: VisualLayerSpec[] = [
    createGridLayer("pde-grid", { size: 4.5, divisions: 18, y: -1.04, color: "#2a3948", opacity: 0.22 }),
    ...createAxesLayers(1.7, [-1.8, -1.0, -1.28]),
    createLabelLayer("pde-title", trace.metadata.exampleName, [-1.75, 2.1, 1.62], "#f8fafc", { scale: 0.24 }),
    createLabelLayer("pde-method", trace.metadata.methodName, [-1.75, 1.8, 1.62], "#93c5fd", { scale: 0.12 }),
    createLabelLayer("pde-stats", `L2=${finalL2.toExponential(2)}, Linf=${finalLinf.toExponential(2)}, r=${trace.r.toFixed(3)}`, [-1.75, 1.54, 1.62], "#dbeafe", {
      scale: 0.1,
    }),
  ];

  if (showField) {
    layers.push(
      createLineLayer("pde-final-numeric", pathSegments(frame.values.map((value, index) => mapFieldPoint(trace, trace.xs[index]!, value, -0.62))), "#38bdf8", {
        opacity: 0.92,
        linewidth: 2,
      }),
      createMarkerLayer("pde-final-tail", mapFieldPoint(trace, trace.xs.at(-1) ?? 0, frame.values.at(-1) ?? 0, -0.62), "#fde047", {
        radius: 0.05,
        label: "numeric final",
      }),
    );
  }

  if (showExact) {
    layers.push(
      createLineLayer("pde-final-exact", pathSegments(frame.exactValues.map((value, index) => mapFieldPoint(trace, trace.xs[index]!, value, -0.18))), "#f8fafc", {
        opacity: 0.82,
        linewidth: 1.7,
      }),
    );
  }

  if (showError) {
    layers.push(...createErrorHistory(trace));
  }

  layers.push(...createComparisonLayers(comparisonTraces));

  return createSceneSpec({
    id: `pde-trace:${trace.metadata.methodId}:${trace.metadata.exampleId}:${trace.cells}:${trace.timeSteps}`,
    camera: {
      position: [4.2, -5.8, 4.0],
      target: [0.1, 0.1, 0.12],
      fov: 45,
      minDistance: 2,
      maxDistance: 14,
    },
    style: {
      background: "#0a1218",
      fogNear: 11,
      fogFar: 31,
      exposure: 1.15,
      ambientLight: 1.08,
    },
    layers,
    metadata: {
      kind: "pde-trace",
      methodName: trace.metadata.methodName,
      exampleName: trace.metadata.exampleName,
    },
  });
}

function createErrorHistory(trace: PdeTrace): VisualLayerSpec[] {
  const maxL2 = Math.max(...trace.errors.map((item) => item.l2), 1e-9);
  const points = trace.errors.map((sample, index) => {
    const x = -1.68 + (index / Math.max(trace.errors.length - 1, 1)) * 1.3;
    const y = -0.86 + (sample.l2 / maxL2) * 0.72;
    return [x, y, 1.18] as VisualVec3;
  });

  return [
    createLineLayer("pde-error-history", pathSegments(points), "#34d399", { opacity: 0.9, linewidth: 2 }),
    createLabelLayer("pde-error-label", "L2(t)", [-1.72, 0.02, 1.18], "#bbf7d0", { scale: 0.085 }),
  ];
}

function createComparisonLayers(comparisons: PdeTrace[]): VisualLayerSpec[] {
  return comparisons.flatMap((trace, index) => {
    const frame = trace.frames.at(-1) ?? trace.frames[0]!;
    const color = index % 2 === 0 ? "#c084fc" : "#f59e0b";
    return [
      createLineLayer(`pde-comparison-${trace.metadata.methodId}`, pathSegments(frame.values.map((value, sampleIndex) => mapFieldPoint(trace, trace.xs[sampleIndex]!, value, 0.25 + index * 0.18))), color, {
        opacity: 0.5,
        linewidth: 1.4,
      }),
    ];
  });
}

function mapFieldPoint(trace: PdeTrace, x: number, value: number, z: number): VisualVec3 {
  const xNorm = -1.4 + ((x - trace.xs[0]!) / Math.max((trace.xs.at(-1) ?? 1) - trace.xs[0]!, 1e-9)) * 2.8;
  const yNorm = -0.7 + ((value - trace.valueRange[0]) / Math.max(trace.valueRange[1] - trace.valueRange[0], 1e-9)) * 1.6;
  return [xNorm, yNorm, z];
}

function pathSegments(points: VisualVec3[]) {
  return points.slice(0, -1).map((point, index) => ({ from: point, to: points[index + 1]! }));
}
