import type { ProbabilityTrace } from "@methodslab/methods-engine/core";
import type { VisualLayerSpec, VisualSceneSpec, VisualVec3 } from "./types";
import { createAxesLayers, createGridLayer, createLabelLayer, createLineLayer, createMarkerLayer, createSceneSpec } from "./scene-objects";

export function createProbabilityTraceSceneSpec(
  trace: ProbabilityTrace,
  options: {
    showPaths?: boolean;
    showMoments?: boolean;
    showHistogram?: boolean;
    showConvergence?: boolean;
    focus?: number;
    comparisonTraces?: ProbabilityTrace[];
  } = {},
): VisualSceneSpec {
  const showPaths = options.showPaths ?? true;
  const showMoments = options.showMoments ?? true;
  const showHistogram = options.showHistogram ?? true;
  const showConvergence = options.showConvergence ?? true;
  const focus = options.focus ?? 1;
  const comparisonTraces = options.comparisonTraces ?? [];
  const pathStride = Math.max(1, Math.ceil(trace.pathCount / 56));
  const visiblePathCount = Math.max(2, Math.floor(trace.paths.length * Math.max(0.08, focus)));
  const visiblePaths = trace.paths.slice(0, visiblePathCount).filter((_, index) => index % pathStride === 0);

  const layers: VisualLayerSpec[] = [
    createGridLayer("probability-base-grid", { size: 4.8, divisions: 18, y: -1.05, color: "#244458", opacity: 0.24 }),
    ...createAxesLayers(1.8, [-1.85, -1.0, -1.35]),
    createLabelLayer("probability-title", trace.metadata.exampleName, [-1.78, 2.1, 1.62], "#f8fafc", { scale: 0.24 }),
    createLabelLayer("probability-method", trace.metadata.methodName, [-1.78, 1.78, 1.62], "#93c5fd", { scale: 0.12 }),
    createLabelLayer("probability-equation", `mu=${trace.metadata.drift.toFixed(2)}, sigma=${trace.metadata.volatility.toFixed(2)}, dt=${trace.dt.toFixed(3)}`, [-1.78, 1.52, 1.62], "#dbeafe", {
      scale: 0.105,
    }),
  ];

  if (showPaths) {
    layers.push(
      ...visiblePaths.map((path) =>
        createLineLayer(`probability-path-${path.id}`, pathSegments(path.samples.map((sample) => mapSample(trace, sample.t, sample.value, path.id))), path.color, {
          opacity: 0.48,
          linewidth: 1.25,
        }),
      ),
    );
  }

  if (showMoments) {
    const meanPath = trace.moments.map((sample) => mapSample(trace, sample.t, sample.mean, 0));
    const exactPath = trace.moments.map((sample) => mapSample(trace, sample.t, sample.exactMean, -1));
    layers.push(
      createLineLayer("probability-sample-mean", pathSegments(meanPath), "#facc15", { opacity: 0.96, linewidth: 2.4 }),
      createLineLayer("probability-exact-mean", pathSegments(exactPath), "#f8fafc", { opacity: 0.82, linewidth: 1.8 }),
      createConfidenceBandLayer(trace),
      createMarkerLayer("probability-terminal-mean", meanPath[meanPath.length - 1]!, "#facc15", {
        radius: 0.055,
        label: "sample mean",
        labelOffset: [0.08, 0.12, 0],
      }),
      createMarkerLayer("probability-exact-terminal-mean", exactPath[exactPath.length - 1]!, "#f8fafc", {
        radius: 0.044,
        label: "exact mean",
        labelOffset: [0.08, -0.12, 0],
      }),
    );
  }

  layers.push(...createMethodComparisonLayers(trace, comparisonTraces));

  if (showHistogram) {
    layers.push(...createHistogramLayers(trace));
  }

  layers.push(...createRiskLayers(trace));

  if (showConvergence) {
    layers.push(...createConvergenceLayers(trace));
  }

  return createSceneSpec({
    id: `probability-trace:${trace.metadata.methodId}:${trace.metadata.exampleId}:${trace.pathCount}:${trace.steps}:${trace.metadata.drift}:${trace.metadata.volatility}:${trace.metadata.seed}`,
    camera: {
      position: [4.2, 3.7, 4.15],
      target: [0.1, -0.02, 0.08],
      fov: 45,
      minDistance: 2,
      maxDistance: 14,
    },
    style: {
      background: "#07131d",
      fogNear: 12,
      fogFar: 32,
      exposure: 1.18,
      ambientLight: 1.12,
    },
    layers,
    metadata: {
      kind: "probability-trace",
      methodName: trace.metadata.methodName,
      exampleName: trace.metadata.exampleName,
      pathCount: trace.pathCount,
      steps: trace.steps,
    },
  });
}

function createMethodComparisonLayers(trace: ProbabilityTrace, comparisonTraces: ProbabilityTrace[]): VisualLayerSpec[] {
  return comparisonTraces.flatMap((comparison, index) => {
    const meanPath = comparison.moments.map((sample) => mapSample(trace, sample.t, sample.mean, 18 + index * 2));
    const terminal = meanPath[meanPath.length - 1]!;
    const color = comparison.metadata.methodId === "euler-maruyama" ? "#60a5fa" : comparison.metadata.methodId === "milstein" ? "#c084fc" : "#34d399";
    return [
      createLineLayer(`probability-method-mean-${comparison.metadata.methodId}`, pathSegments(meanPath), color, {
        opacity: 0.58,
        linewidth: 1.7,
      }),
      createMarkerLayer(`probability-method-terminal-${comparison.metadata.methodId}`, terminal, color, {
        radius: 0.036,
        label: comparison.metadata.methodName,
        labelOffset: [0.08, 0.1 + index * 0.08, 0],
        labelScale: 0.07,
      }),
    ];
  });
}

function createConfidenceBandLayer(trace: ProbabilityTrace): VisualLayerSpec {
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  const moments = trace.moments;

  moments.forEach((sample) => {
    const spread = 1.96 * sample.standardError;
    const upper = mapSample(trace, sample.t, sample.mean + spread, 0);
    const lower = mapSample(trace, sample.t, sample.mean - spread, 0);
    positions.push(...upper, ...lower);
    colors.push(0.34, 0.82, 0.96, 0.18, 0.45, 0.9);
  });

  for (let index = 0; index < moments.length - 1; index += 1) {
    const base = index * 2;
    indices.push(base, base + 1, base + 2);
    indices.push(base + 1, base + 3, base + 2);
  }

  return {
    kind: "mesh",
    id: "probability-confidence-band",
    objectId: "confidence-band",
    positions,
    indices,
    colors,
    material: {
      vertexColors: true,
      doubleSided: true,
      shading: "standard",
      transparent: true,
      opacity: 0.38,
      roughness: 0.75,
    },
    wireframe: { color: "#7dd3fc", opacity: 0.12 },
  };
}

function createRiskLayers(trace: ProbabilityTrace): VisualLayerSpec[] {
  const payoffY = normalizeValue(trace, trace.payoffLevel);
  const q05Y = normalizeValue(trace, trace.quantile05);
  const q95Y = normalizeValue(trace, trace.quantile95);
  const terminalX = 1.3;

  return [
    createLineLayer("probability-payoff-threshold", [{ from: [-1.42, payoffY, 1.04], to: [1.72, payoffY, 1.04] }], "#f97316", {
      opacity: 0.86,
      linewidth: 2,
    }),
    createLineLayer(
      "probability-quantile-band",
      [
        { from: [terminalX, q05Y, -1.05], to: [terminalX, q05Y, 1.2] },
        { from: [terminalX, q95Y, -1.05], to: [terminalX, q95Y, 1.2] },
      ],
      "#facc15",
      { opacity: 0.68, linewidth: 1.6 },
    ),
    createMarkerLayer("probability-var-05", [terminalX, q05Y, 1.22], "#facc15", {
      radius: 0.04,
      label: "q05",
      labelOffset: [0.08, 0.1, 0],
    }),
    createMarkerLayer("probability-var-95", [terminalX, q95Y, 1.22], "#facc15", {
      radius: 0.04,
      label: "q95",
      labelOffset: [0.08, 0.1, 0],
    }),
    createLabelLayer("probability-payoff-label", `P(X_T>K)=${Math.round(trace.probabilityAbovePayoff * 100)}%`, [0.72, payoffY + 0.08, 1.04], "#fed7aa", {
      scale: 0.085,
    }),
  ];
}

function createHistogramLayers(trace: ProbabilityTrace): VisualLayerSpec[] {
  const maxProbability = Math.max(...trace.histogram.map((bin) => bin.probability), 1e-9);
  return trace.histogram.flatMap((bin, index) => {
    const x = 1.72;
    const y = normalizeValue(trace, bin.center);
    const height = (bin.probability / maxProbability) * 0.72;
    const z = -1.02 + index * 0.14;
    return [
      {
        kind: "box-outline",
        id: `probability-histogram-bin-${index}`,
        objectId: "terminal-histogram",
        position: [x, y, z] as VisualVec3,
        size: [height, 0.075, 0.1] as VisualVec3,
        color: index % 2 === 0 ? "#38bdf8" : "#f472b6",
        opacity: 0.72,
      } satisfies VisualLayerSpec,
      createLineLayer(`probability-histogram-stem-${index}`, [{ from: [x, y, z], to: [x + height, y, z] }], "#dbeafe", {
        opacity: 0.46,
        linewidth: 1.2,
      }),
    ];
  });
}

function createConvergenceLayers(trace: ProbabilityTrace): VisualLayerSpec[] {
  const maxPaths = Math.max(...trace.convergence.map((sample) => sample.paths), 1);
  const maxError = Math.max(...trace.convergence.map((sample) => sample.stderr), 1e-9);
  const points = trace.convergence.map((sample) => {
    const x = -1.62 + (sample.paths / maxPaths) * 1.24;
    const y = -0.88 + Math.min(sample.stderr / maxError, 1) * 0.74;
    const z = 1.28;
    return [x, y, z] as VisualVec3;
  });

  return [
    createLineLayer("probability-convergence", pathSegments(points), "#34d399", { opacity: 0.88, linewidth: 2 }),
    ...points.map((point, index) =>
      createMarkerLayer(`probability-convergence-point-${index}`, point, index === points.length - 1 ? "#fde047" : "#34d399", {
        radius: index === points.length - 1 ? 0.042 : 0.026,
      }),
    ),
    createLabelLayer("probability-convergence-label", "stderr shrinks as N grows", [-1.72, 0.02, 1.28], "#bbf7d0", {
      scale: 0.085,
    }),
  ];
}

function mapSample(trace: ProbabilityTrace, t: number, value: number, pathId: number): VisualVec3 {
  const x = -1.42 + (t / Math.max(trace.moments.at(-1)?.t ?? 1, 1e-9)) * 2.72;
  const y = normalizeValue(trace, value);
  const z = -0.78 + (pathId % 9) * 0.055 + Math.floor((pathId % 27) / 9) * 0.09;
  return [x, y, z];
}

function normalizeValue(trace: ProbabilityTrace, value: number) {
  const [minValue, maxValue] = trace.valueRange;
  return -0.68 + ((value - minValue) / Math.max(maxValue - minValue, 1e-9)) * 1.72;
}

function pathSegments(points: VisualVec3[]) {
  return points.slice(0, -1).map((point, index) => ({ from: point, to: points[index + 1]! }));
}
