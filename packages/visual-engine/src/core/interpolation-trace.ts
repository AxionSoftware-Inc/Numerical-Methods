import type { InterpolationTrace } from "@methodslab/methods-engine/core";
import type { VisualLayerSpec, VisualSceneSpec, VisualVec3 } from "./types";
import { createAxesLayers, createGridLayer, createLabelLayer, createLineLayer, createMarkerLayer, createSceneSpec } from "./scene-objects";

export function createInterpolationTraceSceneSpec(
  trace: InterpolationTrace,
  options: {
    comparisonTraces?: InterpolationTrace[];
    focus?: number;
    showNodes?: boolean;
    showCurve?: boolean;
    showComparison?: boolean;
    formula?: string;
    xRange?: [number, number];
    yRange?: [number, number];
  } = {},
): VisualSceneSpec {
  const focus = options.focus ?? 1;
  const count = Math.max(8, Math.floor(trace.samples.length * Math.max(0.08, focus)));
  const samples = trace.samples.slice(0, count);
  const showNodes = options.showNodes ?? true;
  const showCurve = options.showCurve ?? true;
  const showComparison = options.showComparison ?? true;
  const xRange = options.xRange ?? inferXRange(trace);
  const yRange = options.yRange ?? inferYRange(trace);

  const exactCurve = samples.map((sample) => mapInterpolationPoint(sample.x, sample.exact, xRange, yRange, -0.92));
  const estimateCurve = samples.map((sample) => mapInterpolationPoint(sample.x, sample.estimate, xRange, yRange, -0.42));

  const layers: VisualLayerSpec[] = [
    createGridLayer("interpolation-grid", { size: 4.2, divisions: 18, y: -1.04, color: "#234f44", opacity: 0.18 }),
    ...createAxesLayers(1.6, [-1.72, -1.0, -1.18]),
    createLabelLayer("interpolation-title", trace.metadata.exampleName, [-1.75, 2.12, 1.6], "#f0fdf4", { scale: 0.24 }),
    createLabelLayer("interpolation-method", trace.metadata.methodName, [-1.75, 1.8, 1.6], "#86efac", { scale: 0.12 }),
    createLabelLayer(
      "interpolation-stats",
      `${options.formula ?? "f(x)"} · max=${trace.maxAbsError.toExponential(2)} · rms=${trace.rmsError.toExponential(2)}`,
      [-1.75, 1.54, 1.6],
      "#bbf7d0",
      { scale: 0.098 },
    ),
  ];

  if (showCurve) {
    layers.push(
      createLineLayer("interpolation-exact", pathSegments(exactCurve), "#f8fafc", { opacity: 0.82, linewidth: 1.7 }),
      createLineLayer("interpolation-estimate", pathSegments(estimateCurve), "#34d399", { opacity: 0.94, linewidth: 2.3 }),
      ...createErrorBridges(trace, samples, xRange, yRange),
      ...createErrorHistory(trace, samples),
    );
  }

  if (showNodes) {
    layers.push(
      ...trace.nodes.map((node, index) =>
        createMarkerLayer(`interpolation-node-${index}`, mapInterpolationPoint(node.x, node.y, xRange, yRange, -0.42), index % 2 === 0 ? "#fb7185" : "#38bdf8", {
          radius: 0.036,
          label: index === 0 ? "node" : undefined,
          labelOffset: [0.07, 0.1, 0],
        }),
      ),
    );
  }

  if (showComparison) {
    layers.push(...createComparisonLayers(options.comparisonTraces ?? [], count, xRange, yRange));
  }

  return createSceneSpec({
    id: `interpolation-trace:${trace.metadata.methodId}:${trace.metadata.exampleId}:${trace.nodeCount}:${focus}`,
    camera: {
      position: [4.0, 3.8, 4.0],
      target: [0.05, 0.04, -0.08],
      fov: 45,
      minDistance: 2,
      maxDistance: 14,
    },
    style: {
      background: "#081611",
      fogNear: 11,
      fogFar: 31,
      exposure: 1.18,
      ambientLight: 1.1,
    },
    layers,
    metadata: {
      kind: "interpolation-trace",
      methodName: trace.metadata.methodName,
      exampleName: trace.metadata.exampleName,
    },
  });
}

function createErrorBridges(
  trace: InterpolationTrace,
  samples: InterpolationTrace["samples"],
  xRange: [number, number],
  yRange: [number, number],
): VisualLayerSpec[] {
  const stride = Math.max(1, Math.floor(samples.length / 18));
  return samples.flatMap((sample, index) => {
    if (index % stride !== 0) return [];
    return [
      createLineLayer(
        `interpolation-error-${index}`,
        [
          {
            from: mapInterpolationPoint(sample.x, sample.exact, xRange, yRange, -0.92),
            to: mapInterpolationPoint(sample.x, sample.estimate, xRange, yRange, -0.42),
          },
        ],
        sample.error >= 0 ? "#f59e0b" : "#60a5fa",
        { opacity: 0.34, linewidth: 1.2 },
      ),
    ];
  });
}

function createErrorHistory(trace: InterpolationTrace, samples: InterpolationTrace["samples"]): VisualLayerSpec[] {
  const maxError = Math.max(...trace.samples.map((sample) => Math.abs(sample.error)), 1e-9);
  const points = samples.map((sample, index) => {
    const x = -1.72 + (index / Math.max(samples.length - 1, 1)) * 1.28;
    const y = -0.88 + (Math.abs(sample.error) / maxError) * 0.72;
    return [x, y, 1.16] as VisualVec3;
  });
  return [
    createLineLayer("interpolation-error-history", pathSegments(points), "#fde047", { opacity: 0.88, linewidth: 2 }),
    createLabelLayer("interpolation-error-label", "|error(x)|", [-1.72, 0.02, 1.16], "#fef08a", { scale: 0.085 }),
  ];
}

function createComparisonLayers(
  comparisons: InterpolationTrace[],
  count: number,
  xRange: [number, number],
  yRange: [number, number],
): VisualLayerSpec[] {
  return comparisons.flatMap((trace, index) => {
    const points = trace.samples.slice(0, count).map((sample) => mapInterpolationPoint(sample.x, sample.estimate, xRange, yRange, 0.06 + index * 0.12));
    const color = index % 2 === 0 ? "#c084fc" : "#f472b6";
    return [
      createLineLayer(`interpolation-comparison-${trace.metadata.methodId}`, pathSegments(points), color, {
        opacity: 0.54,
        linewidth: 1.5,
      }),
    ];
  });
}

function inferXRange(trace: InterpolationTrace): [number, number] {
  return [trace.samples[0]?.x ?? -1, trace.samples.at(-1)?.x ?? 1];
}

function inferYRange(trace: InterpolationTrace): [number, number] {
  const ys = [...trace.samples.map((sample) => sample.exact), ...trace.samples.map((sample) => sample.estimate), ...trace.nodes.map((node) => node.y)];
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const pad = Math.max((max - min) * 0.12, 0.1);
  return [min - pad, max + pad];
}

function mapInterpolationPoint(x: number, y: number, xRange: [number, number], yRange: [number, number], z: number): VisualVec3 {
  const xNorm = -1.38 + ((x - xRange[0]) / Math.max(xRange[1] - xRange[0], 1e-9)) * 2.76;
  const yNorm = -0.68 + ((y - yRange[0]) / Math.max(yRange[1] - yRange[0], 1e-9)) * 1.56;
  return [xNorm, yNorm, z];
}

function pathSegments(points: VisualVec3[]) {
  return points.slice(0, -1).map((point, index) => ({ from: point, to: points[index + 1]! }));
}
