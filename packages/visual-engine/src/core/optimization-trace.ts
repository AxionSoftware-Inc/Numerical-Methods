import type { OptimizationExampleSpec, OptimizationTrace } from "@methodslab/methods-engine/core";
import type { VisualLayerSpec, VisualSceneSpec, VisualVec3 } from "./types";
import { createArrowLayer, createAxesLayers, createGridLayer, createLabelLayer, createLineLayer, createMarkerLayer, createSceneSpec } from "./scene-objects";

export function createOptimizationTraceSceneSpec(
  trace: OptimizationTrace,
  example: OptimizationExampleSpec,
  options: {
    showSurface?: boolean;
    showPath?: boolean;
    showGradient?: boolean;
    showComparison?: boolean;
    focus?: number;
    comparisonTraces?: OptimizationTrace[];
  } = {},
): VisualSceneSpec {
  const focus = options.focus ?? 1;
  const visibleCount = Math.max(2, Math.floor(trace.steps.length * Math.max(0.08, focus)));
  const visibleSteps = trace.steps.slice(0, visibleCount);
  const layers: VisualLayerSpec[] = [
    createGridLayer("optimization-base-grid", { size: 4.6, divisions: 18, y: -1.08, color: "#3f3f46", opacity: 0.2 }),
    ...createAxesLayers(1.65, [-1.8, -1.02, -1.35]),
    createLabelLayer("optimization-title", example.name, [-1.78, 2.1, 1.62], "#fff7ed", {
      scale: 0.24,
      metadata: tooltip("Optimization landscape", example.formula),
    }),
    createLabelLayer("optimization-method", trace.metadata.methodName, [-1.78, 1.78, 1.62], "#fdba74", { scale: 0.12 }),
    createLabelLayer("optimization-status", `f=${trace.finalValue.toExponential(2)}, ||grad||=${trace.finalGradientNorm.toExponential(2)}`, [-1.78, 1.52, 1.62], "#fed7aa", {
      scale: 0.105,
    }),
  ];

  if (options.showSurface ?? true) {
    layers.push(createLandscapeLayer(example, trace));
    layers.push(...createContourLayers());
  }

  if (options.showPath ?? true) {
    layers.push(
      createLineLayer("optimization-path", pathSegments(visibleSteps.map((step) => mapPoint(example, trace, step.point, step.value))), "#fb7185", {
        opacity: 0.94,
        linewidth: 2.4,
        metadata: tooltip("Descent path", "Iteration trajectory on the loss landscape."),
      }),
      ...visibleSteps.slice(0, -1).map((step, index) =>
        createArrowLayer(`optimization-step-${index}`, mapPoint(example, trace, step.point, step.value), mapPoint(example, trace, visibleSteps[index + 1]!.point, visibleSteps[index + 1]!.value), "#fb7185", {
          headSize: 0.07,
          shaftRadius: 0.012,
          opacity: 0.72,
          metadata: tooltip(`Step ${index}`, `f=${step.value.toExponential(2)}, ||grad||=${step.gradientNorm.toExponential(2)}`),
        }),
      ),
      createMarkerLayer("optimization-start", mapPoint(example, trace, trace.steps[0]!.point, trace.steps[0]!.value), "#f8fafc", {
        radius: 0.045,
        label: "start",
        metadata: tooltip("Start point", `(${trace.steps[0]!.point.map((value) => value.toFixed(2)).join(", ")})`),
      }),
      createMarkerLayer("optimization-final", mapPoint(example, trace, visibleSteps[visibleSteps.length - 1]!.point, visibleSteps[visibleSteps.length - 1]!.value), "#fde047", {
        radius: 0.06,
        label: "current",
        metadata: tooltip("Current iterate", `distance=${visibleSteps[visibleSteps.length - 1]!.distanceToOptimum.toExponential(2)}`),
      }),
      createMarkerLayer("optimization-optimum", mapPoint(example, trace, example.optimum, example.value(...example.optimum)), "#34d399", {
        radius: 0.055,
        label: "optimum",
        metadata: tooltip("Known optimum", `(${example.optimum.map((value) => value.toFixed(2)).join(", ")})`),
      }),
    );
  }

  if (options.showGradient ?? true) {
    layers.push(...createGradientLayers(example, trace, visibleSteps));
    layers.push(...createConvergenceLayers(trace));
  }

  if (options.showComparison ?? true) {
    layers.push(...createComparisonLayers(example, trace, options.comparisonTraces ?? []));
  }

  return createSceneSpec({
    id: `optimization-trace:${trace.metadata.methodId}:${trace.metadata.exampleId}:${trace.iterations}:${trace.stepSize}:${focus}`,
    camera: {
      position: [4.15, 3.8, 4.2],
      target: [0, 0.02, -0.02],
      fov: 45,
      minDistance: 2,
      maxDistance: 14,
    },
    style: {
      background: "#11100c",
      fogNear: 12,
      fogFar: 32,
      exposure: 1.2,
      ambientLight: 1.08,
    },
    layers,
    metadata: {
      kind: "optimization-trace",
      methodName: trace.metadata.methodName,
      exampleName: example.name,
    },
  });
}

function createLandscapeLayer(example: OptimizationExampleSpec, trace: OptimizationTrace): VisualLayerSpec {
  const size = 36;
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];

  for (let iy = 0; iy < size; iy += 1) {
    for (let ix = 0; ix < size; ix += 1) {
      const x = example.xRange[0] + ((example.xRange[1] - example.xRange[0]) * ix) / (size - 1);
      const y = example.yRange[0] + ((example.yRange[1] - example.yRange[0]) * iy) / (size - 1);
      const value = Math.log1p(example.value(x, y));
      const point = mapPoint(example, trace, [x, y], value, true);
      positions.push(...point);
      const t = normalizeTraceValue(trace, value, true);
      colors.push(0.18 + t * 0.72, 0.55 - t * 0.22, 0.68 - t * 0.4);
    }
  }

  for (let iy = 0; iy < size - 1; iy += 1) {
    for (let ix = 0; ix < size - 1; ix += 1) {
      const base = iy * size + ix;
      indices.push(base, base + 1, base + size);
      indices.push(base + 1, base + size + 1, base + size);
    }
  }

  return {
    kind: "mesh",
    id: "optimization-loss-surface",
    objectId: "loss-surface",
    positions,
    indices,
    colors,
    material: {
      vertexColors: true,
      doubleSided: true,
      shading: "standard",
      opacity: 0.9,
      transparent: true,
      roughness: 0.76,
    },
    wireframe: { color: "#fde68a", opacity: 0.08 },
    metadata: tooltip("Loss surface", "Height is log(1+f(x,y)); color follows objective value."),
  };
}

function createContourLayers(): VisualLayerSpec[] {
  return [0.18, 0.34, 0.52, 0.72, 0.9].map((level, index) =>
    ({
      kind: "ring",
      id: `optimization-contour-${index}`,
      objectId: "loss-contours",
      position: [0, -0.9 + level * 1.35, -1.08 + index * 0.12] as VisualVec3,
      color: index % 2 === 0 ? "#facc15" : "#38bdf8",
      radius: 0.18 + level * 1.1,
      tubeRadius: 0.006,
      rotation: [Math.PI / 2, 0, 0] as VisualVec3,
      opacity: 0.42,
      metadata: tooltip("Objective contour", `Relative level ${(level * 100).toFixed(0)}%`),
    }) satisfies VisualLayerSpec,
  );
}

function createGradientLayers(example: OptimizationExampleSpec, trace: OptimizationTrace, steps: OptimizationTrace["steps"]): VisualLayerSpec[] {
  const stride = Math.max(1, Math.floor(steps.length / 10));
  return steps.filter((_, index) => index % stride === 0).map((step) => {
    const from = mapPoint(example, trace, step.point, step.value);
    const scale = 0.16 / Math.max(step.gradientNorm, 1e-9);
    const to = [from[0] - step.gradient[0] * scale, from[1] - step.gradient[1] * scale, from[2] - 0.03] as VisualVec3;
    return createArrowLayer(`optimization-gradient-${step.index}`, from, to, "#f8fafc", {
      headSize: 0.055,
      shaftRadius: 0.01,
      opacity: 0.48,
      metadata: tooltip("Negative gradient", `||grad||=${step.gradientNorm.toExponential(2)}`),
    });
  });
}

function createComparisonLayers(example: OptimizationExampleSpec, comparisonBaseline: OptimizationTrace, comparisonTraces: OptimizationTrace[]): VisualLayerSpec[] {
  return comparisonTraces.flatMap((comparison) => {
    const points = comparison.steps.map((step) => mapPoint(example, comparisonBaseline, step.point, step.value));
    const color = comparison.metadata.methodId === "gradient-descent" ? "#60a5fa" : comparison.metadata.methodId === "momentum" ? "#14b8a6" : "#f59e0b";
    return [
      createLineLayer(`optimization-comparison-${comparison.metadata.methodId}`, pathSegments(points), color, {
        opacity: 0.62,
        linewidth: 1.6,
        metadata: tooltip(`${comparison.metadata.methodName} path`, `final f=${comparison.finalValue.toExponential(2)}`),
      }),
      createMarkerLayer(`optimization-comparison-terminal-${comparison.metadata.methodId}`, points[points.length - 1]!, color, {
        radius: 0.036,
        label: comparison.metadata.methodName,
        labelScale: 0.07,
        metadata: tooltip("Comparison terminal", `distance=${comparison.finalDistance.toExponential(2)}`),
      }),
    ];
  });
}

function createConvergenceLayers(trace: OptimizationTrace): VisualLayerSpec[] {
  const maxValue = Math.max(...trace.steps.map((step) => Math.log1p(step.value)), 1e-9);
  const points = trace.steps.map((step) => {
    const x = -1.68 + (step.index / Math.max(trace.steps.length - 1, 1)) * 1.24;
    const y = -0.86 + (Math.log1p(step.value) / maxValue) * 0.72;
    return [x, y, 1.26] as VisualVec3;
  });
  return [
    createLineLayer("optimization-convergence", pathSegments(points), "#34d399", {
      opacity: 0.9,
      linewidth: 2,
      metadata: tooltip("Convergence graph", "Objective value over iterations."),
    }),
    createLabelLayer("optimization-convergence-label", "f(x_k) convergence", [-1.72, 0.02, 1.26], "#bbf7d0", { scale: 0.085 }),
  ];
}

function mapPoint(example: OptimizationExampleSpec, trace: OptimizationTrace, point: [number, number], value: number, valueIsLog = false): VisualVec3 {
  const x = -1.34 + ((point[0] - example.xRange[0]) / (example.xRange[1] - example.xRange[0])) * 2.68;
  const z = -1.08 + ((point[1] - example.yRange[0]) / (example.yRange[1] - example.yRange[0])) * 2.16;
  const y = -0.78 + normalizeTraceValue(trace, value, valueIsLog) * 1.72;
  return [x, y, z];
}

function normalizeTraceValue(trace: OptimizationTrace, value: number, valueIsLog = false) {
  const minValue = valueIsLog ? Math.log1p(trace.minValue) : trace.minValue;
  const maxValue = valueIsLog ? Math.log1p(trace.maxValue) : trace.maxValue;
  const normalizedValue = valueIsLog ? value : value;
  return Math.max(0, Math.min(1, (normalizedValue - minValue) / Math.max(maxValue - minValue, 1e-9)));
}

function pathSegments(points: VisualVec3[]) {
  return points.slice(0, -1).map((point, index) => ({ from: point, to: points[index + 1]! }));
}

function tooltip(title: string, description: string) {
  return { title, description };
}
