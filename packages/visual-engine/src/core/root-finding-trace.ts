import type { RootFindingTrace } from "@methodslab/methods-engine/core";
import type { VisualLayerSpec, VisualSceneSpec, VisualVec3 } from "./types";
import { createAxesLayers, createGridLayer, createLabelLayer, createLineLayer, createMarkerLayer, createSceneSpec } from "./scene-objects";

export function createRootFindingTraceSceneSpec(
  trace: RootFindingTrace,
  options: {
    comparisonTraces?: RootFindingTrace[];
    focus?: number;
    showCurve?: boolean;
    showBracket?: boolean;
    showComparison?: boolean;
    equation?: string;
    xRange?: [number, number];
    evaluate?: (x: number) => number;
    exactRoot?: number;
  } = {},
): VisualSceneSpec {
  const focus = options.focus ?? 1;
  const count = Math.max(2, Math.floor(trace.steps.length * Math.max(0.08, focus)));
  const steps = trace.steps.slice(0, count);
  const showCurve = options.showCurve ?? true;
  const showBracket = options.showBracket ?? true;
  const showComparison = options.showComparison ?? true;
  const domain = options.xRange ?? inferRootRange(trace);
  const functionCurve = options.evaluate ? sampleRootCurve(domain, options.evaluate) : [];
  const residualRange = inferResidualRange(trace, functionCurve);

  const layers: VisualLayerSpec[] = [
    createGridLayer("root-grid", { size: 4.2, divisions: 18, y: -1.02, color: "#5b3417", opacity: 0.18 }),
    ...createAxesLayers(1.6, [-1.72, -0.98, -1.16]),
    createLabelLayer("root-title", trace.metadata.exampleName, [-1.75, 2.12, 1.6], "#fff7ed", { scale: 0.24 }),
    createLabelLayer("root-method", trace.metadata.methodName, [-1.75, 1.8, 1.6], "#fdba74", { scale: 0.12 }),
    createLabelLayer(
      "root-stats",
      `${options.equation ?? "f(x)"} · residual=${trace.finalResidual.toExponential(2)} · root err=${trace.finalError.toExponential(2)}`,
      [-1.75, 1.54, 1.6],
      "#fde68a",
      { scale: 0.098 },
    ),
  ];

  if (showCurve && functionCurve.length > 1) {
    layers.push(
      createLineLayer("root-curve", pathSegments(functionCurve.map((point) => mapRootPoint(point[0], point[1], domain, residualRange, -0.92))), "#f8fafc", {
        opacity: 0.9,
        linewidth: 2,
      }),
      createLineLayer("root-axis", [{ from: [-1.4, 0, -0.92], to: [1.4, 0, -0.92] }], "#64748b", {
        opacity: 0.45,
        linewidth: 1.2,
      }),
    );
  }

  layers.push(
    createLineLayer(
      "root-iteration",
      pathSegments(steps.map((step) => mapRootPoint(step.x, step.fx, domain, residualRange, -0.92))),
      "#22d3ee",
      { opacity: 0.92, linewidth: 2.2 },
    ),
    ...steps.map((step, index) =>
      createMarkerLayer(`root-step-${index}`, mapRootPoint(step.x, step.fx, domain, residualRange, -0.92), index === steps.length - 1 ? "#fde047" : "#e2e8f0", {
        radius: index === steps.length - 1 ? 0.05 : 0.034,
        label: index === steps.length - 1 ? "root" : `x${index}`,
        labelOffset: [0.08, 0.12, 0],
        labelScale: 0.07,
      }),
    ),
    ...createResidualHistory(trace, steps),
  );

  if (showBracket) {
    layers.push(
      ...steps.flatMap((step, index) => {
        const [a, b] = step.bracket;
        const baseZ = -0.18 + index * 0.05;
        const left = mapRootPoint(a, 0, domain, residualRange, baseZ);
        const right = mapRootPoint(b, 0, domain, residualRange, baseZ);
        const iterate = mapRootPoint(step.x, step.fx, domain, residualRange, baseZ);
        const lines: VisualLayerSpec[] = [
          createLineLayer(`root-bracket-${index}`, [{ from: left, to: right }], "#fb7185", {
            opacity: 0.38,
            linewidth: 1.4,
          }),
        ];
        if (step.line) {
          lines.push(
            createLineLayer(
              `root-line-${index}`,
              [
                {
                  from: mapRootPoint(step.line.from[0], step.line.from[1], domain, residualRange, baseZ),
                  to: mapRootPoint(step.line.to[0], step.line.to[1], domain, residualRange, baseZ),
                },
              ],
              step.line.kind === "tangent" ? "#f97316" : step.line.kind === "secant" ? "#a78bfa" : "#fb7185",
              { opacity: 0.55, linewidth: 1.35 },
            ),
          );
        }
        lines.push(
          createLineLayer(`root-lift-${index}`, [{ from: mapRootPoint(step.x, 0, domain, residualRange, baseZ), to: iterate }], "#38bdf8", {
            opacity: 0.42,
            linewidth: 1.2,
          }),
        );
        return lines;
      }),
    );
  }

  if (showComparison) {
    layers.push(...createComparisonLayers(options.comparisonTraces ?? [], count, domain, residualRange));
  }

  if (typeof options.exactRoot === "number") {
    layers.push(
      createMarkerLayer("root-exact", mapRootPoint(options.exactRoot, 0, domain, residualRange, -0.92), "#34d399", {
        radius: 0.042,
        label: "exact",
      }),
    );
  }

  return createSceneSpec({
    id: `root-finding-trace:${trace.metadata.methodId}:${trace.metadata.exampleId}:${trace.iterations}:${focus}`,
    camera: {
      position: [4.0, 3.7, 4.0],
      target: [0, 0.06, -0.08],
      fov: 45,
      minDistance: 2,
      maxDistance: 14,
    },
    style: {
      background: "#140f09",
      fogNear: 11,
      fogFar: 31,
      exposure: 1.18,
      ambientLight: 1.08,
    },
    layers,
    metadata: {
      kind: "root-finding-trace",
      methodName: trace.metadata.methodName,
      exampleName: trace.metadata.exampleName,
    },
  });
}

function createResidualHistory(trace: RootFindingTrace, steps: RootFindingTrace["steps"]): VisualLayerSpec[] {
  const maxResidual = Math.max(...trace.steps.map((step) => Math.abs(step.fx)), 1e-9);
  const points = steps.map((step, index) => {
    const x = -1.72 + (index / Math.max(steps.length - 1, 1)) * 1.28;
    const y = -0.88 + (Math.abs(step.fx) / maxResidual) * 0.74;
    return [x, y, 1.18] as VisualVec3;
  });
  return [
    createLineLayer("root-residual-history", pathSegments(points), "#34d399", { opacity: 0.88, linewidth: 2 }),
    createLabelLayer("root-residual-label", "|f(x_k)|", [-1.72, 0.02, 1.18], "#bbf7d0", { scale: 0.085 }),
  ];
}

function createComparisonLayers(
  comparisons: RootFindingTrace[],
  count: number,
  domain: [number, number],
  residualRange: [number, number],
): VisualLayerSpec[] {
  return comparisons.flatMap((trace, index) => {
    const points = trace.steps.slice(0, count).map((step) => mapRootPoint(step.x, step.fx, domain, residualRange, 0.16 + index * 0.1));
    const color = index % 2 === 0 ? "#60a5fa" : "#c084fc";
    return [
      createLineLayer(`root-comparison-${trace.metadata.methodId}`, pathSegments(points), color, {
        opacity: 0.52,
        linewidth: 1.4,
      }),
    ];
  });
}

function sampleRootCurve(domain: [number, number], evaluate: (x: number) => number) {
  return Array.from({ length: 180 }, (_, index) => {
    const alpha = index / 179;
    const x = domain[0] + alpha * (domain[1] - domain[0]);
    return [x, evaluate(x)] as const;
  });
}

function inferRootRange(trace: RootFindingTrace): [number, number] {
  const xs = trace.steps.flatMap((step) => [step.x, step.bracket[0], step.bracket[1]]);
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const pad = Math.max((max - min) * 0.15, 0.3);
  return [min - pad, max + pad];
}

function inferResidualRange(trace: RootFindingTrace, curve: readonly (readonly [number, number])[]): [number, number] {
  const ys = [...trace.steps.map((step) => step.fx), ...curve.map((point) => point[1])];
  const maxAbs = Math.max(...ys.map((value) => Math.abs(value)), 1e-6);
  return [-maxAbs, maxAbs];
}

function mapRootPoint(x: number, y: number, domain: [number, number], residualRange: [number, number], z: number): VisualVec3 {
  const xNorm = -1.38 + ((x - domain[0]) / Math.max(domain[1] - domain[0], 1e-9)) * 2.76;
  const yNorm = -0.68 + ((y - residualRange[0]) / Math.max(residualRange[1] - residualRange[0], 1e-9)) * 1.52;
  return [xNorm, yNorm, z];
}

function pathSegments(points: VisualVec3[]) {
  return points.slice(0, -1).map((point, index) => ({ from: point, to: points[index + 1]! }));
}
