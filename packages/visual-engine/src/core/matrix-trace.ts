import type { MatrixTrace } from "@methodslab/methods-engine/core";
import type { VisualLayerSpec, VisualSceneSpec, VisualVec3 } from "./types";
import { createArrowLayer, createAxesLayers, createBoundingBoxLayer, createGridLayer, createLabelLayer, createLineLayer, createMarkerLayer, createSceneSpec } from "./scene-objects";

export function createMatrixTraceSceneSpec(
  trace: MatrixTrace,
  options: {
    comparisonTraces?: MatrixTrace[];
    focus?: number;
    showBasis?: boolean;
    showOrbit?: boolean;
    showComparison?: boolean;
  } = {},
): VisualSceneSpec {
  const focus = options.focus ?? 1;
  const count = Math.max(2, Math.floor(trace.steps.length * Math.max(0.08, focus)));
  const visibleSteps = trace.steps.slice(0, count);
  const showBasis = options.showBasis ?? true;
  const showOrbit = options.showOrbit ?? true;
  const showComparison = options.showComparison ?? true;
  const orbit = visibleSteps.map((step) => mapMatrixVector(step.vector));
  const residualScale = 0.28 / Math.max(...visibleSteps.map((step) => step.residual), 1e-9);
  const basisOrigin: VisualVec3 = [-1.32, -0.92, -1.08];
  const e1: VisualVec3 = [basisOrigin[0] + 0.9, basisOrigin[1], basisOrigin[2]];
  const e2: VisualVec3 = [basisOrigin[0], basisOrigin[1] + 0.9, basisOrigin[2]];
  const te1 = mapBasisVector(trace.transformedBasis[0]);
  const te2 = mapBasisVector(trace.transformedBasis[1]);

  const layers: VisualLayerSpec[] = [
    createGridLayer("matrix-grid", { size: 4.3, divisions: 18, y: -1.04, color: "#264557", opacity: 0.22 }),
    ...createAxesLayers(1.62, [-1.72, -1.0, -1.2]),
    createBoundingBoxLayer("matrix-frame", [-1.48, -0.96, -1.12], [2.98, 2.42, 2.28], "#3b82f6", { opacity: 0.14 }),
    createLabelLayer("matrix-title", trace.metadata.exampleName, [-1.74, 2.12, 1.6], "#f8fafc", { scale: 0.24 }),
    createLabelLayer("matrix-method", trace.metadata.methodName, [-1.74, 1.8, 1.6], "#93c5fd", { scale: 0.12 }),
    createLabelLayer(
      "matrix-stats",
      `rho=${trace.spectralRadius.toFixed(2)}, cond=${trace.conditionNumber.toFixed(2)}, residual=${(visibleSteps.at(-1)?.residual ?? 0).toExponential(2)}`,
      [-1.74, 1.54, 1.6],
      "#dbeafe",
      { scale: 0.098 },
    ),
  ];

  if (showBasis) {
    layers.push(
      createArrowLayer("matrix-e1", basisOrigin, e1, "#facc15", { headSize: 0.08, shaftRadius: 0.012, opacity: 0.82 }),
      createArrowLayer("matrix-e2", basisOrigin, e2, "#fb7185", { headSize: 0.08, shaftRadius: 0.012, opacity: 0.82 }),
      createArrowLayer("matrix-te1", basisOrigin, te1, "#34d399", { headSize: 0.08, shaftRadius: 0.012, opacity: 0.9 }),
      createArrowLayer("matrix-te2", basisOrigin, te2, "#a78bfa", { headSize: 0.08, shaftRadius: 0.012, opacity: 0.9 }),
      createLineLayer("matrix-basis-bridge-1", [{ from: e1, to: te1 }], "#34d399", { opacity: 0.48, linewidth: 1.6 }),
      createLineLayer("matrix-basis-bridge-2", [{ from: e2, to: te2 }], "#a78bfa", { opacity: 0.48, linewidth: 1.6 }),
      createLineLayer("matrix-target-ray", [{ from: [0, -0.74, -0.92], to: mapMatrixVector(trace.targetVector) }], "#f8fafc", { opacity: 0.4, linewidth: 1.4 }),
    );
  }

  if (showOrbit) {
    layers.push(
      createLineLayer("matrix-orbit", pathSegments(orbit), "#f59e0b", { opacity: 0.94, linewidth: 2.3 }),
      createMarkerLayer("matrix-start", orbit[0]!, "#f8fafc", { radius: 0.04, label: "start" }),
      createMarkerLayer("matrix-final", orbit[orbit.length - 1]!, "#fde047", { radius: 0.055, label: "current" }),
      ...visibleSteps.flatMap((step, index) => {
        const from = orbit[index]!;
        const residual = step.residualVector;
        const to: VisualVec3 = [
          from[0] + residual[0] * residualScale,
          from[1] + residual[1] * residualScale,
          from[2] + 0.12,
        ];
        return [
          createArrowLayer(`matrix-residual-${index}`, from, to, "#fb7185", {
            opacity: 0.38,
            headSize: 0.045,
            shaftRadius: 0.007,
          }),
        ];
      }),
      ...createResidualHistory(trace, visibleSteps),
    );
  }

  if (showComparison) {
    layers.push(...createComparisonLayers(options.comparisonTraces ?? [], count));
  }

  return createSceneSpec({
    id: `matrix-trace:${trace.metadata.methodId}:${trace.metadata.exampleId}:${trace.iterations}:${focus}`,
    camera: {
      position: [4.0, 3.8, 4.05],
      target: [0.02, 0.02, -0.06],
      fov: 45,
      minDistance: 2,
      maxDistance: 14,
    },
    style: {
      background: "#08131c",
      fogNear: 11,
      fogFar: 31,
      exposure: 1.16,
      ambientLight: 1.08,
    },
    layers,
    metadata: {
      kind: "matrix-trace",
      methodName: trace.metadata.methodName,
      exampleName: trace.metadata.exampleName,
    },
  });
}

function createResidualHistory(trace: MatrixTrace, steps: MatrixTrace["steps"]): VisualLayerSpec[] {
  const maxResidual = Math.max(...trace.steps.map((step) => step.residual), 1e-9);
  const points = steps.map((step, index) => {
    const x = -1.72 + (index / Math.max(steps.length - 1, 1)) * 1.28;
    const y = -0.88 + (step.residual / maxResidual) * 0.72;
    return [x, y, 1.16] as VisualVec3;
  });
  return [
    createLineLayer("matrix-residual-history", pathSegments(points), "#34d399", { opacity: 0.88, linewidth: 2 }),
    createLabelLayer("matrix-residual-label", "residual(k)", [-1.72, 0.02, 1.16], "#bbf7d0", { scale: 0.085 }),
  ];
}

function createComparisonLayers(comparisons: MatrixTrace[], count: number): VisualLayerSpec[] {
  return comparisons.flatMap((trace, index) => {
    const orbit = trace.steps.slice(0, count).map((step) => mapMatrixVector(step.vector, 0.18 + index * 0.12));
    const color = index % 2 === 0 ? "#60a5fa" : "#c084fc";
    return [
      createLineLayer(`matrix-comparison-${trace.metadata.methodId}`, pathSegments(orbit), color, {
        opacity: 0.5,
        linewidth: 1.4,
      }),
    ];
  });
}

function mapMatrixVector(vector: [number, number], z = -0.92): VisualVec3 {
  return [vector[0], vector[1], z];
}

function mapBasisVector(vector: [number, number]): VisualVec3 {
  return [vector[0] - 1.32, vector[1] - 0.92, -0.48];
}

function pathSegments(points: VisualVec3[]) {
  return points.slice(0, -1).map((point, index) => ({ from: point, to: points[index + 1]! }));
}
