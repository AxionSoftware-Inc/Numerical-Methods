import type { OperatorGrammarId } from "@methodslab/methods-engine/core";
import type { VisualLayerSpec, VisualLineLayerSpec, VisualSceneSpec, VisualVec3 } from "./types";
import {
  createArrowLayer,
  createAxesLayers,
  createBoundingBoxLayer,
  createGridLayer,
  createLabelLayer,
  createLineLayer,
  createMarkerLayer,
  createSceneSpec,
} from "./scene-objects";

export type OperatorFamilySceneInput = {
  familyName: string;
  visualGrammar: OperatorGrammarId;
  schemeName: string;
  formula: string;
  summary: string;
  normalizedInput: string;
  confidence?: number;
  showAnalysis?: boolean;
  showComparison?: boolean;
  focus?: number;
};

export function createOperatorFamilySceneSpec(input: OperatorFamilySceneInput): VisualSceneSpec {
  switch (input.visualGrammar) {
    case "transform-basis":
      return createMatrixFamilySceneSpec(input);
    case "convergence-path":
      return createRootFindingSceneSpec(input);
    case "landscape-descent":
      return createOptimizationSceneSpec(input);
    case "stochastic-path":
      return createProbabilitySceneSpec(input);
    case "curve-reconstruction":
      return createInterpolationSceneSpec(input);
    default:
      return createFallbackOperatorSceneSpec(input);
  }
}

function createMatrixFamilySceneSpec(input: OperatorFamilySceneInput): VisualSceneSpec {
  const matrix = selectMatrixStyle(input.normalizedInput);
  const baseSquare = squarePoints(1.1, [-0.9, -0.7, -1.22]);
  const transformedSquare = baseSquare.map((point) => transformPoint(point, matrix));
  const basisOrigin: VisualVec3 = [-0.9, -0.7, -1.22];
  const e1: VisualVec3 = [basisOrigin[0] + 0.95, basisOrigin[1], basisOrigin[2]];
  const e2: VisualVec3 = [basisOrigin[0], basisOrigin[1] + 0.95, basisOrigin[2]];
  const te1 = transformPoint(e1, matrix);
  const te2 = transformPoint(e2, matrix);
  const gridLines = createUnitGridLayers(matrix, basisOrigin);
  const iterationPath = createMatrixIterationPath(matrix);
  const comparisonSquare = squarePoints(1.1, [-0.9, -0.7, -0.45]).map((point) => transformPoint(point, selectMatrixComparisonStyle(input.normalizedInput)));
  const analysisLayers = input.showAnalysis === false ? [] : createMatrixAnalysisLayers(matrix, iterationPath);
  const comparisonLayers =
    input.showComparison === false
      ? []
      : [
          createLineLayer("matrix-comparison-square", squareSegments(comparisonSquare), "#f472b6", {
            opacity: 0.62,
            linewidth: 1.4,
          }),
          createLabelLayer("matrix-comparison-label", "comparison transform", [0.86, 1.28, -0.45], "#f9a8d4", {
            scale: 0.1,
          }),
        ];

  return createSceneSpec({
    id: `matrix:${slugify(input.familyName)}:${slugify(input.schemeName)}`,
    camera: {
      position: [3.05, -4.9, 2.8],
      target: [0, 0, -1.0],
      fov: 46,
      minDistance: 1.8,
      maxDistance: 12,
    },
    style: {
      background: "#08131c",
      fogNear: 10,
      fogFar: 28,
      exposure: 1.15,
      ambientLight: 1.1,
      gridColor: "#234155",
    },
    layers: [
      createGridLayer("matrix-grid", { size: 3.1, y: -0.86, color: "#234155", opacity: 0.28 }),
      ...createAxesLayers(1.65, [-1.58, -0.84, -1.22]),
      createBoundingBoxLayer("matrix-frame", [-1.18, -1.0, -1.22], [2.55, 2.55, 0.12], "#3b82f6", {
        opacity: 0.18,
      }),
      createLabelLayer("matrix-title", input.familyName, [-1.48, 2.4, 1.95], "#f8fafc", {
        scale: 0.24,
        format: "text",
      }),
      createLabelLayer("matrix-subtitle", input.schemeName, [-1.48, 2.08, 1.95], "#b6c7d6", {
        scale: 0.12,
        format: "text",
      }),
      createLabelLayer("matrix-formula", input.formula, [-1.48, 1.72, 1.95], "#e0f2fe", {
        scale: 0.12,
        format: "latex",
      }),
      createLineLayer("matrix-base-square", squareSegments(baseSquare), "#94a3b8", {
        opacity: 0.72,
      }),
      createLineLayer("matrix-transformed-square", squareSegments(transformedSquare), "#38bdf8", {
        opacity: 0.92,
      }),
      createArrowLayer("matrix-e1", basisOrigin, e1, "#facc15", { headSize: 0.11, shaftRadius: 0.022 }),
      createArrowLayer("matrix-e2", basisOrigin, e2, "#f97316", { headSize: 0.11, shaftRadius: 0.022 }),
      createArrowLayer("matrix-te1", basisOrigin, te1, "#4ade80", { headSize: 0.11, shaftRadius: 0.022 }),
      createArrowLayer("matrix-te2", basisOrigin, te2, "#a78bfa", { headSize: 0.11, shaftRadius: 0.022 }),
      createLineLayer("matrix-e1-to-te1", [{ from: e1, to: te1 }], "#4ade80", { opacity: 0.7, linewidth: 2 }),
      createLineLayer("matrix-e2-to-te2", [{ from: e2, to: te2 }], "#a78bfa", { opacity: 0.7, linewidth: 2 }),
      createMarkerLayer("matrix-origin", basisOrigin, "#f8fafc", { radius: 0.04, label: "origin" }),
      createLineLayer("matrix-iteration-path", polylineSegments(iterationPath), "#fde047", {
        opacity: 0.9,
        linewidth: 2,
      }),
      ...iterationPath.map((point, index) =>
        createMarkerLayer(`matrix-iterate-${index}`, point, index === iterationPath.length - 1 ? "#fef08a" : "#f8fafc", {
          radius: index === iterationPath.length - 1 ? 0.046 : 0.028,
          label: index === iterationPath.length - 1 ? "fixed point" : `k${index}`,
          labelOffset: [0.06, 0.1, 0],
          labelScale: 0.075,
        }),
      ),
      ...gridLines,
      ...comparisonLayers,
      ...analysisLayers,
    ],
    metadata: {
      kind: "matrix-family",
      familyName: input.familyName,
      visualGrammar: input.visualGrammar,
      schemeName: input.schemeName,
      confidence: input.confidence ?? 0.5,
    },
  });
}

function createOptimizationSceneSpec(input: OperatorFamilySceneInput): VisualSceneSpec {
  const mesh = createLandscapeMesh();
  const descentPath = selectDescentPath(input.normalizedInput);
  const anchors = descentPath.filter((_, index) => index === 0 || index === descentPath.length - 1 || index % 2 === 0);
  const contourLayers = input.showAnalysis === false ? [] : createOptimizationContourLayers();
  const comparisonPath = input.showComparison === false ? [] : selectComparisonDescentPath(input.normalizedInput);

  return createSceneSpec({
    id: `optimization:${slugify(input.familyName)}:${slugify(input.schemeName)}`,
    camera: {
      position: [3.6, -5.4, 3.4],
      target: [0, 0, -0.2],
      fov: 46,
      minDistance: 1.8,
      maxDistance: 12,
    },
    style: {
      background: "#140b16",
      fogNear: 10,
      fogFar: 29,
      exposure: 1.22,
      ambientLight: 1.08,
    },
    layers: [
      createGridLayer("optimization-grid", { size: 3.3, y: -1.1, color: "#50305c", opacity: 0.18 }),
      ...createAxesLayers(1.5, [-1.6, -0.95, -1.18]),
      createLabelLayer("optimization-title", input.familyName, [-1.45, 2.4, 2.0], "#fff7ed", { scale: 0.24 }),
      createLabelLayer("optimization-subtitle", input.schemeName, [-1.45, 2.08, 2.0], "#fdba74", { scale: 0.12 }),
      createLabelLayer("optimization-formula", input.formula, [-1.45, 1.72, 2.0], "#fbcfe8", {
        scale: 0.12,
        format: "latex",
      }),
      {
        kind: "mesh",
        id: "optimization-landscape",
        objectId: "landscape",
        positions: mesh.positions,
        indices: mesh.indices,
        colors: mesh.colors,
        material: {
          vertexColors: true,
          doubleSided: true,
          shading: "standard",
          roughness: 0.76,
          metalness: 0.02,
          opacity: 0.94,
          transparent: true,
        },
        wireframe: {
          color: "#ffe7ba",
          opacity: 0.12,
        },
      },
      createLineLayer("optimization-descent", polylineSegments(descentPath), "#fb7185", {
        opacity: 0.92,
        linewidth: 2,
      }),
      ...(comparisonPath.length > 0
        ? [
            createLineLayer("optimization-comparison-descent", polylineSegments(comparisonPath), "#38bdf8", {
              opacity: 0.72,
              linewidth: 1.7,
            }),
            ...comparisonPath.slice(0, -1).map((point, index) =>
              createArrowLayer(`optimization-comparison-step-${index}`, point, comparisonPath[index + 1], "#38bdf8", {
                headSize: 0.065,
                shaftRadius: 0.012,
                opacity: 0.65,
              }),
            ),
          ]
        : []),
      ...descentPath.slice(0, -1).map((point, index) =>
        createArrowLayer(
          `optimization-step-${index}`,
          point,
          descentPath[index + 1],
          index % 2 === 0 ? "#fb7185" : "#2dd4bf",
          { headSize: 0.08, shaftRadius: 0.016, opacity: 0.85 },
        ),
      ),
      ...anchors.map((point, index) =>
        createMarkerLayer(`optimization-anchor-${index}`, point, index === anchors.length - 1 ? "#fde047" : "#f8fafc", {
          radius: index === anchors.length - 1 ? 0.05 : 0.035,
          label: index === anchors.length - 1 ? "minimum" : `x${index}`,
          labelOffset: [0.08, 0.12, 0],
        }),
      ),
      ...contourLayers,
    ],
    metadata: {
      kind: "optimization-family",
      familyName: input.familyName,
      visualGrammar: input.visualGrammar,
      schemeName: input.schemeName,
      confidence: input.confidence ?? 0.5,
    },
  });
}

function createRootFindingSceneSpec(input: OperatorFamilySceneInput): VisualSceneSpec {
  const curve = createRootCurve();
  const iterationPath = selectRootIterationPath(input.normalizedInput);
  const bracket = createBracketMarkers();
  const tangentSegments = createTangentSegments(iterationPath);
  const liftedPath = liftRootIterations(iterationPath);
  const bracketLayers = input.showAnalysis === false ? [] : createBracketContractionLayers(input.normalizedInput);
  const comparisonLayers =
    input.showComparison === false
      ? []
      : [
          createLineLayer("root-reference-curve", polylineSegments(createRootReferenceCurve()), "#94a3b8", {
            opacity: 0.42,
            linewidth: 1.4,
          }),
          createLabelLayer("root-reference-label", "reference residual", [0.72, 0.8, -0.12], "#cbd5e1", {
            scale: 0.09,
          }),
        ];

  return createSceneSpec({
    id: `root:${slugify(input.familyName)}:${slugify(input.schemeName)}`,
    camera: {
      position: [3.35, -5.15, 3.0],
      target: [0.25, 0.15, -0.2],
      fov: 46,
      minDistance: 1.8,
      maxDistance: 12,
    },
    style: {
      background: "#140f09",
      fogNear: 10,
      fogFar: 28,
      exposure: 1.2,
      ambientLight: 1.08,
    },
    layers: [
      createGridLayer("root-grid", { size: 3.2, y: -0.95, color: "#5b3417", opacity: 0.16 }),
      ...createAxesLayers(1.58, [-1.55, -0.83, -1.1]),
      createLabelLayer("root-title", input.familyName, [-1.45, 2.42, 2.0], "#fff7ed", { scale: 0.24 }),
      createLabelLayer("root-subtitle", input.schemeName, [-1.45, 2.1, 2.0], "#fdba74", { scale: 0.12 }),
      createLabelLayer("root-formula", input.formula, [-1.45, 1.74, 2.0], "#fde68a", {
        scale: 0.12,
        format: "latex",
      }),
      createLineLayer("root-curve", polylineSegments(curve), "#f8fafc", { opacity: 0.92, linewidth: 2.2 }),
      createLineLayer("root-iteration", polylineSegments(iterationPath), "#22d3ee", { opacity: 0.92, linewidth: 2 }),
      createLineLayer("root-lifted-iteration", polylineSegments(liftedPath), "#38bdf8", { opacity: 0.72, linewidth: 1.8 }),
      ...createRootErrorTowers(iterationPath),
      ...tangentSegments.map((segment, index) =>
        createLineLayer(`root-tangent-${index}`, [segment], index % 2 === 0 ? "#f97316" : "#a78bfa", {
          opacity: 0.7,
          linewidth: 1.4,
        }),
      ),
      ...bracket.map((marker, index) =>
        createMarkerLayer(`root-bracket-${index}`, marker.position, marker.color, {
          radius: marker.radius,
          label: marker.label,
          labelOffset: [0.08, 0.12, 0],
        }),
      ),
      ...iterationPath.map((point, index) =>
        createMarkerLayer(`root-step-${index}`, point, index === iterationPath.length - 1 ? "#fde047" : "#e2e8f0", {
          radius: index === iterationPath.length - 1 ? 0.05 : 0.035,
          label: index === iterationPath.length - 1 ? "root" : `x${index}`,
          labelOffset: [0.08, 0.12, 0],
        }),
      ),
      ...liftedPath.map((point, index) =>
        createMarkerLayer(`root-lifted-step-${index}`, point, "#38bdf8", {
          radius: 0.024,
          label: index === 0 ? "iteration height" : undefined,
          labelOffset: [0.07, 0.1, 0],
          labelScale: 0.07,
        }),
      ),
      ...bracketLayers,
      ...comparisonLayers,
    ],
    metadata: {
      kind: "root-family",
      familyName: input.familyName,
      visualGrammar: input.visualGrammar,
      schemeName: input.schemeName,
      confidence: input.confidence ?? 0.5,
    },
  });
}

function createProbabilitySceneSpec(input: OperatorFamilySceneInput): VisualSceneSpec {
  const ensemble = createStochasticEnsemble(input.normalizedInput);
  const driftLine = createDriftLine();
  const densityMarkers = buildDensityMarkers();
  const densitySlices = input.showAnalysis === false ? [] : createDensitySliceLayers();
  const endpointCloud = createEndpointCloud(ensemble);
  const comparisonLayers =
    input.showComparison === false
      ? []
      : [
          createLineLayer("probability-low-noise-envelope", polylineSegments(createLowNoiseEnvelope()), "#a7f3d0", {
            opacity: 0.58,
            linewidth: 1.6,
          }),
          createLabelLayer("probability-envelope-label", "low-noise envelope", [0.52, -0.28, 0.72], "#bbf7d0", {
            scale: 0.085,
          }),
        ];

  return createSceneSpec({
    id: `probability:${slugify(input.familyName)}:${slugify(input.schemeName)}`,
    camera: {
      position: [3.25, -5.25, 3.1],
      target: [0.2, 0.15, -0.2],
      fov: 46,
      minDistance: 1.8,
      maxDistance: 12,
    },
    style: {
      background: "#07131d",
      fogNear: 10,
      fogFar: 28,
      exposure: 1.18,
      ambientLight: 1.12,
    },
    layers: [
      createGridLayer("probability-grid", { size: 3.2, y: -0.92, color: "#234155", opacity: 0.2 }),
      ...createAxesLayers(1.55, [-1.55, -0.82, -1.15]),
      createLabelLayer("probability-title", input.familyName, [-1.45, 2.42, 2.0], "#f8fafc", { scale: 0.24 }),
      createLabelLayer("probability-subtitle", input.schemeName, [-1.45, 2.1, 2.0], "#93c5fd", { scale: 0.12 }),
      createLabelLayer("probability-formula", input.formula, [-1.45, 1.74, 2.0], "#dbeafe", {
        scale: 0.12,
        format: "latex",
      }),
      createLineLayer("probability-drift", polylineSegments(driftLine), "#facc15", {
        opacity: 0.85,
        linewidth: 2,
      }),
      ...ensemble.map((path, index) =>
        createLineLayer(`probability-path-${index}`, polylineSegments(path), stochasticColor(index), {
          opacity: 0.5,
          linewidth: 1.4,
        }),
      ),
      ...densityMarkers.map((marker, index) =>
        createMarkerLayer(`probability-marker-${index}`, marker.position, marker.color, {
          radius: marker.radius,
          label: marker.label,
          labelOffset: [0.08, 0.12, 0],
        }),
      ),
      createPointCloudLayer("probability-endpoint-cloud", endpointCloud, "#f8fafc", {
        size: 0.038,
        opacity: 0.76,
      }),
      ...densitySlices,
      ...comparisonLayers,
    ],
    metadata: {
      kind: "probability-family",
      familyName: input.familyName,
      visualGrammar: input.visualGrammar,
      schemeName: input.schemeName,
      confidence: input.confidence ?? 0.5,
    },
  });
}

function createInterpolationSceneSpec(input: OperatorFamilySceneInput): VisualSceneSpec {
  const nodes = createInterpolationNodes();
  const curve = selectInterpolationCurve(input.normalizedInput);
  const supportLines = createInterpolationSupportLines(nodes);
  const errorRibbon = createInterpolationErrorRibbon(curve);
  const basisLayers = input.showAnalysis === false ? [] : createInterpolationBasisLayers(nodes);
  const comparisonCurve =
    input.showComparison === false
      ? []
      : [
          createLineLayer("interp-comparison-curve", polylineSegments(selectInterpolationComparisonCurve(input.normalizedInput)), "#f472b6", {
            opacity: 0.64,
            linewidth: 1.6,
          }),
          createLabelLayer("interp-comparison-label", "alternative fit", [0.82, 0.78, 0.12], "#f9a8d4", {
            scale: 0.085,
          }),
        ];

  return createSceneSpec({
    id: `interpolation:${slugify(input.familyName)}:${slugify(input.schemeName)}`,
    camera: {
      position: [3.4, -5.3, 3.2],
      target: [0.15, 0.2, -0.15],
      fov: 46,
      minDistance: 1.8,
      maxDistance: 12,
    },
    style: {
      background: "#081611",
      fogNear: 10,
      fogFar: 28,
      exposure: 1.18,
      ambientLight: 1.12,
    },
    layers: [
      createGridLayer("interp-grid", { size: 3.2, y: -0.92, color: "#234f44", opacity: 0.18 }),
      ...createAxesLayers(1.55, [-1.55, -0.82, -1.08]),
      createLabelLayer("interp-title", input.familyName, [-1.45, 2.42, 2.0], "#f0fdf4", { scale: 0.24 }),
      createLabelLayer("interp-subtitle", input.schemeName, [-1.45, 2.1, 2.0], "#86efac", { scale: 0.12 }),
      createLabelLayer("interp-formula", input.formula, [-1.45, 1.74, 2.0], "#bbf7d0", {
        scale: 0.12,
        format: "latex",
      }),
      createLineLayer("interp-support", supportLines, "#1f7663", { opacity: 0.32, linewidth: 1.2 }),
      {
        kind: "mesh",
        id: "interp-error-ribbon",
        objectId: "interpolation-error",
        positions: errorRibbon.positions,
        indices: errorRibbon.indices,
        colors: errorRibbon.colors,
        material: {
          vertexColors: true,
          doubleSided: true,
          shading: "standard",
          opacity: 0.52,
          transparent: true,
          roughness: 0.7,
        },
        wireframe: {
          color: "#bbf7d0",
          opacity: 0.16,
        },
      },
      createLineLayer("interp-curve", polylineSegments(curve), "#34d399", { opacity: 0.96, linewidth: 2.2 }),
      ...nodes.map((node, index) =>
        createMarkerLayer(`interp-node-${index}`, node, index % 2 === 0 ? "#fb7185" : "#38bdf8", {
          radius: 0.038,
          label: `p${index}`,
          labelOffset: [0.07, 0.1, 0],
        }),
      ),
      createMarkerLayer("interp-focus", curve[Math.floor(curve.length * 0.7)]!, "#fde047", {
        radius: 0.05,
        label: "reconstruction",
        labelOffset: [0.09, 0.13, 0],
      }),
      ...basisLayers,
      ...comparisonCurve,
    ],
    metadata: {
      kind: "interpolation-family",
      familyName: input.familyName,
      visualGrammar: input.visualGrammar,
      schemeName: input.schemeName,
      confidence: input.confidence ?? 0.5,
    },
  });
}

function createFallbackOperatorSceneSpec(input: OperatorFamilySceneInput): VisualSceneSpec {
  return createSceneSpec({
    id: `operator:${slugify(input.familyName)}:${slugify(input.schemeName)}`,
    camera: {
      position: [3.2, -4.8, 2.9],
      target: [0, 0, 0],
      fov: 46,
      minDistance: 1.8,
      maxDistance: 12,
    },
    style: {
      background: "#0b2024",
      fogNear: 11,
      fogFar: 28,
      exposure: 1.18,
      ambientLight: 1.08,
    },
    layers: [
      createGridLayer("operator-grid", { size: 2.45, y: -0.78 }),
      ...createAxesLayers(1.5, [-1.45, -0.7, -1.25]),
      createLabelLayer("operator-title", input.familyName, [-1.4, 2.2, 1.95], "#f8fafc", {
        scale: 0.24,
        format: "text",
      }),
      createLabelLayer("operator-formula", input.formula, [-1.4, 1.78, 1.95], "#e0f2fe", {
        scale: 0.12,
        format: "latex",
      }),
      createLabelLayer("operator-summary", input.summary, [-1.4, 1.48, 1.95], "#b6c7d6", {
        scale: 0.11,
        format: "text",
      }),
    ],
    metadata: {
      kind: "operator-family",
      familyName: input.familyName,
      visualGrammar: input.visualGrammar,
      schemeName: input.schemeName,
      confidence: input.confidence ?? 0.5,
    },
  });
}

function createPointCloudLayer(
  id: string,
  points: VisualVec3[],
  color: string,
  options: { opacity?: number; size?: number } = {},
): VisualLayerSpec {
  return {
    kind: "point-cloud",
    id,
    objectId: id,
    points,
    color,
    opacity: options.opacity ?? 0.72,
    size: options.size ?? 0.035,
    sizeAttenuation: true,
  };
}

function createPlaneLayer(
  id: string,
  position: VisualVec3,
  size: [number, number],
  color: string,
  options: { opacity?: number; rotation?: VisualVec3; objectId?: string } = {},
): VisualLayerSpec {
  return {
    kind: "plane",
    id,
    objectId: options.objectId ?? id,
    position,
    size,
    color,
    opacity: options.opacity ?? 0.22,
    rotation: options.rotation,
    doubleSided: true,
    depthTest: true,
  };
}

function createRingLayer(
  id: string,
  position: VisualVec3,
  color: string,
  options: { radius?: number; tubeRadius?: number; rotation?: VisualVec3; opacity?: number } = {},
): VisualLayerSpec {
  return {
    kind: "ring",
    id,
    objectId: id,
    position,
    color,
    radius: options.radius ?? 0.2,
    tubeRadius: options.tubeRadius ?? 0.01,
    rotation: options.rotation,
    opacity: options.opacity ?? 0.72,
  };
}

function createMatrixIterationPath(matrix: Transform2D): VisualVec3[] {
  let point: VisualVec3 = [-0.42, 0.62, 0.82];
  const path: VisualVec3[] = [point];
  for (let index = 0; index < 6; index += 1) {
    const transformed = transformPoint([point[0], point[1], 0], matrix);
    point = [
      -0.28 + transformed[0] * 0.48 + index * 0.08,
      -0.02 + transformed[1] * 0.42,
      0.78 - index * 0.27,
    ];
    path.push(point);
  }
  return path;
}

function createMatrixAnalysisLayers(matrix: Transform2D, iterationPath: VisualVec3[]): VisualLayerSpec[] {
  const eigenA = transformPoint([0.72, 0.18, 0.44], matrix);
  const eigenB = transformPoint([-0.18, 0.72, 0.44], matrix);
  const residualSegments = iterationPath.slice(0, -1).map((point, index) => ({
    from: point,
    to: [point[0], point[1], point[2] - 0.18 - index * 0.03] as VisualVec3,
  }));

  return [
    createBoundingBoxLayer("matrix-volume-frame", [-1.16, -1.02, -1.25], [2.72, 2.64, 2.44], "#60a5fa", {
      opacity: 0.18,
    }),
    createArrowLayer("matrix-eigen-a", [-0.9, -0.7, 0.44], eigenA, "#22c55e", { headSize: 0.1, shaftRadius: 0.018 }),
    createArrowLayer("matrix-eigen-b", [-0.9, -0.7, 0.44], eigenB, "#f472b6", { headSize: 0.1, shaftRadius: 0.018 }),
    createLineLayer("matrix-residual-bars", residualSegments, "#f97316", { opacity: 0.7, linewidth: 1.6 }),
    createPlaneLayer("matrix-domain-plane", [-0.02, 0.02, -1.22], [2.2, 2.2], "#0ea5e9", { opacity: 0.08 }),
    createPlaneLayer("matrix-image-plane", [0.05, -0.02, 0.48], [2.2, 2.2], "#22c55e", { opacity: 0.08 }),
    createLabelLayer("matrix-eigen-label", "basis / spectrum", [0.76, 1.34, 0.56], "#bbf7d0", { scale: 0.09 }),
  ];
}

function selectMatrixComparisonStyle(input: string): Transform2D {
  if (input.includes("jacobi")) {
    return [
      [0.92, -0.18],
      [0.24, 1.08],
    ];
  }

  if (input.includes("power")) {
    return [
      [1.46, 0.08],
      [0.02, 0.58],
    ];
  }

  return [
    [0.82, 0.42],
    [-0.16, 1.16],
  ];
}

function createUnitGridLayers(matrix: Transform2D, origin: VisualVec3) {
  const lines: VisualLineLayerSpec[] = [];
  const steps = 6;
  for (let i = -steps; i <= steps; i += 1) {
    const x = i * 0.22;
    const a: VisualVec3 = [origin[0] + x, origin[1] - 1.05, origin[2]];
    const b: VisualVec3 = [origin[0] + x, origin[1] + 1.05, origin[2]];
    const c: VisualVec3 = [origin[0] - 1.05, origin[1] + x, origin[2]];
    const d: VisualVec3 = [origin[0] + 1.05, origin[1] + x, origin[2]];
    lines.push(createLineLayer(`matrix-grid-v-${i}`, [{ from: transformPoint(a, matrix), to: transformPoint(b, matrix) }], "#17324a", { opacity: 0.32 }));
    lines.push(createLineLayer(`matrix-grid-h-${i}`, [{ from: transformPoint(c, matrix), to: transformPoint(d, matrix) }], "#17324a", { opacity: 0.32 }));
  }
  return lines;
}

function createLandscapeMesh() {
  const size = 28;
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];

  const xMin = -1.25;
  const xMax = 1.25;
  const yMin = -1.25;
  const yMax = 1.25;

  const points: Array<{ x: number; y: number; z: number }> = [];
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (let iy = 0; iy < size; iy += 1) {
    for (let ix = 0; ix < size; ix += 1) {
      const x = xMin + ((xMax - xMin) * ix) / (size - 1);
      const y = yMin + ((yMax - yMin) * iy) / (size - 1);
      const z = 0.42 * (x * x + 1.35 * y * y) + 0.16 * Math.sin(3.2 * x) - 0.12 * Math.cos(2.6 * y) - 1.05;
      points.push({ x, y, z });
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
  }

  for (const point of points) {
    positions.push(point.x, point.y, point.z);
    const t = (point.z - minZ) / Math.max(maxZ - minZ, 1e-9);
    colors.push(0.58 + 0.38 * t, 0.16 + 0.36 * (1 - t), 0.42 + 0.3 * (1 - t));
  }

  for (let iy = 0; iy < size - 1; iy += 1) {
    for (let ix = 0; ix < size - 1; ix += 1) {
      const base = iy * size + ix;
      indices.push(base, base + 1, base + size);
      indices.push(base + 1, base + size + 1, base + size);
    }
  }

  return { positions, indices, colors };
}

function selectDescentPath(input: string): VisualVec3[] {
  if (input.includes("momentum")) {
    return [
      [1.02, 0.98, 0.12],
      [0.76, 0.44, -0.2],
      [0.48, 0.14, -0.46],
      [0.23, -0.08, -0.62],
      [0.08, -0.15, -0.69],
    ];
  }

  if (input.includes("newton")) {
    return [
      [1.02, 0.96, 0.14],
      [0.52, 0.3, -0.32],
      [0.16, 0.02, -0.63],
      [0.03, -0.04, -0.71],
    ];
  }

  return [
    [1.05, 1.0, 0.16],
    [0.82, 0.72, 0.02],
    [0.62, 0.45, -0.18],
    [0.42, 0.22, -0.36],
    [0.24, 0.08, -0.53],
    [0.11, -0.02, -0.64],
    [0.02, -0.06, -0.71],
  ];
}

function selectComparisonDescentPath(input: string): VisualVec3[] {
  if (input.includes("newton")) {
    return [
      [1.02, 0.96, 0.14],
      [0.78, 0.62, -0.04],
      [0.56, 0.36, -0.24],
      [0.34, 0.16, -0.42],
      [0.18, 0.03, -0.58],
      [0.06, -0.04, -0.69],
    ];
  }

  return [
    [1.04, -0.92, 0.2],
    [0.68, -0.48, -0.14],
    [0.38, -0.24, -0.42],
    [0.18, -0.12, -0.6],
    [0.04, -0.06, -0.7],
  ];
}

function createOptimizationContourLayers(): VisualLayerSpec[] {
  const layers: VisualLayerSpec[] = [];
  const levels = [
    { radius: 1.05, z: -0.82, color: "#f97316" },
    { radius: 0.76, z: -0.9, color: "#facc15" },
    { radius: 0.48, z: -0.98, color: "#34d399" },
    { radius: 0.22, z: -1.04, color: "#38bdf8" },
  ];

  for (const [index, level] of levels.entries()) {
    layers.push(createRingLayer(`optimization-contour-${index}`, [0.04, -0.04, level.z], level.color, {
      radius: level.radius,
      tubeRadius: 0.008,
      rotation: [Math.PI / 2, 0, 0],
      opacity: 0.78,
    }));
  }

  const arrows: VisualLayerSpec[] = [];
  for (let ix = -2; ix <= 2; ix += 1) {
    for (let iy = -2; iy <= 2; iy += 1) {
      const x = ix * 0.36;
      const y = iy * 0.36;
      if (Math.hypot(x, y) < 0.18) continue;
      arrows.push(
        createArrowLayer(
          `optimization-gradient-${ix}-${iy}`,
          [x, y, -0.68],
          [x - x * 0.18, y - y * 0.2, -0.76],
          "#f8fafc",
          { headSize: 0.045, shaftRadius: 0.008, opacity: 0.36 },
        ),
      );
    }
  }

  return [
    ...layers,
    ...arrows,
    createMarkerLayer("optimization-saddle", [-0.54, 0.38, -0.44], "#c084fc", {
      radius: 0.04,
      label: "saddle",
      labelOffset: [0.08, 0.1, 0],
      labelScale: 0.075,
    }),
  ];
}

function createRootCurve() {
  const points: VisualVec3[] = [];
  for (let step = 0; step <= 72; step += 1) {
    const x = -1.25 + (2.5 * step) / 72;
    const y = 0.62 * x * x * x - 0.42 * x + 0.05;
    points.push([x, y, -0.5]);
  }
  return points;
}

function createRootReferenceCurve() {
  const points: VisualVec3[] = [];
  for (let step = 0; step <= 72; step += 1) {
    const x = -1.25 + (2.5 * step) / 72;
    const y = 0.34 * Math.sin(2.3 * x) + 0.18 * x;
    points.push([x, y, 0.16]);
  }
  return points;
}

function liftRootIterations(path: VisualVec3[]) {
  return path.map((point, index) => {
    const errorHeight = Math.max(0.08, 0.76 / (index + 1.15));
    return [point[0], point[1], errorHeight] as VisualVec3;
  });
}

function createRootErrorTowers(path: VisualVec3[]): VisualLayerSpec[] {
  return path.flatMap((point, index) => {
    const height = Math.max(0.08, 0.76 / (index + 1.15));
    const top: VisualVec3 = [point[0], point[1], height];
    return [
      createLineLayer(`root-error-tower-${index}`, [{ from: point, to: top }], index === path.length - 1 ? "#fde047" : "#f97316", {
        opacity: 0.7,
        linewidth: 1.5,
      }),
      createRingLayer(`root-error-ring-${index}`, top, index === path.length - 1 ? "#fde047" : "#f97316", {
        radius: 0.055 + height * 0.08,
        tubeRadius: 0.006,
        rotation: [Math.PI / 2, 0, 0],
        opacity: 0.62,
      }),
    ];
  });
}

function createBracketContractionLayers(input: string): VisualLayerSpec[] {
  const isBisection = input.includes("bisection") || input.includes("bracket");
  const widths = isBisection ? [1.72, 0.86, 0.43, 0.22] : [1.5, 0.82, 0.36];
  return widths.flatMap((width, index) => {
    const z = -0.82 + index * 0.34;
    const left = -width / 2 + 0.02;
    const right = width / 2 + 0.02;
    return [
      createLineLayer(`root-bracket-width-${index}`, [{ from: [left, -0.36, z], to: [right, -0.36, z] }], "#facc15", {
        opacity: 0.44 + index * 0.08,
        linewidth: 1.4,
      }),
      createMarkerLayer(`root-bracket-left-${index}`, [left, -0.36, z], "#f97316", { radius: 0.022 }),
      createMarkerLayer(`root-bracket-right-${index}`, [right, -0.36, z], "#a78bfa", { radius: 0.022 }),
    ];
  });
}

function selectRootIterationPath(input: string) {
  if (input.includes("bisection")) {
    return [
      [-1.0, 0.18, -0.42],
      [0.68, -0.06, -0.42],
      [-0.16, 0.03, -0.42],
      [0.26, -0.01, -0.42],
      [0.05, 0.002, -0.42],
    ] satisfies VisualVec3[];
  }

  if (input.includes("secant")) {
    return [
      [-0.92, 0.24, -0.42],
      [0.74, -0.12, -0.42],
      [0.24, 0.02, -0.42],
      [0.07, -0.002, -0.42],
    ] satisfies VisualVec3[];
  }

  return [
    [-0.64, 0.14, -0.42],
    [0.34, -0.06, -0.42],
    [0.11, 0.006, -0.42],
    [0.03, -0.0008, -0.42],
  ] satisfies VisualVec3[];
}

function createBracketMarkers() {
  return [
    { position: [-1.02, 0, -0.58] as VisualVec3, color: "#f97316", radius: 0.045, label: "a" },
    { position: [0.74, 0, -0.58] as VisualVec3, color: "#a78bfa", radius: 0.045, label: "b" },
  ];
}

function createTangentSegments(path: VisualVec3[]) {
  const segments: Array<{ from: VisualVec3; to: VisualVec3 }> = [];
  for (let index = 0; index < path.length - 1; index += 1) {
    const point = path[index]!;
    const next = path[index + 1]!;
    segments.push({
      from: [point[0], point[1] + 0.32, point[2]],
      to: [next[0], next[1] - 0.18, next[2]],
    });
  }
  return segments;
}

function createStochasticEnsemble(input: string) {
  const pathCount = input.includes("monte carlo") ? 18 : input.includes("milstein") ? 14 : 12;
  const amplitude = input.includes("milstein") ? 0.14 : 0.19;
  return Array.from({ length: pathCount }, (_, pathIndex) => {
    const points: VisualVec3[] = [];
    let x = -1.05;
    let y = 0;
    for (let step = 0; step < 18; step += 1) {
      const t = step / 17;
      const drift = -0.05 + t * 0.12;
      const wave = Math.sin(step * 0.9 + pathIndex * 0.85) * amplitude;
      const correction = Math.cos(step * 0.45 + pathIndex * 0.3) * amplitude * 0.42;
      points.push([x, y + wave + correction, -1.05 + t * 2.1]);
      x += 0.12;
      y += drift * 0.12;
    }
    return points;
  });
}

function createEndpointCloud(ensemble: VisualVec3[][]) {
  return ensemble.map((path) => path[path.length - 1]!).filter(Boolean);
}

function createDensitySliceLayers(): VisualLayerSpec[] {
  const slices = [
    { t: -0.72, spread: 0.22, color: "#38bdf8" },
    { t: 0.04, spread: 0.42, color: "#f472b6" },
    { t: 0.82, spread: 0.62, color: "#fde047" },
  ];

  return slices.flatMap((slice, index) => [
    createPlaneLayer(`probability-density-plane-${index}`, [0.12, 0.06, slice.t], [1.75, slice.spread], slice.color, {
      opacity: 0.12,
      rotation: [0, Math.PI / 2, 0],
      objectId: "probability-density",
    }),
    createRingLayer(`probability-density-ring-${index}`, [0.12, 0.06, slice.t], slice.color, {
      radius: slice.spread,
      tubeRadius: 0.008,
      rotation: [0, Math.PI / 2, 0],
      opacity: 0.62,
    }),
  ]);
}

function createLowNoiseEnvelope() {
  return Array.from({ length: 22 }, (_, step) => {
    const t = step / 21;
    return [-1.06 + t * 2.08, -0.18 + 0.2 * t + Math.sin(t * Math.PI * 2) * 0.04, -1.02 + t * 2.04] as VisualVec3;
  });
}

function createInterpolationNodes() {
  return [
    [-1.1, -0.18, -0.45],
    [-0.72, 0.28, -0.45],
    [-0.2, 0.12, -0.45],
    [0.34, 0.52, -0.45],
    [0.82, 0.18, -0.45],
    [1.1, 0.44, -0.45],
  ] satisfies VisualVec3[];
}

function selectInterpolationComparisonCurve(input: string) {
  const points: VisualVec3[] = [];
  for (let step = 0; step <= 80; step += 1) {
    const x = -1.2 + (2.4 * step) / 80;
    const y =
      input.includes("spline")
        ? 0.11 * x * x * x - 0.06 * x + 0.24
        : 0.15 * Math.sin(2.6 * x + 0.4) + 0.16 * x + 0.2;
    points.push([x, y, 0.16]);
  }
  return points;
}

function createInterpolationErrorRibbon(curve: VisualVec3[]) {
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];

  curve.forEach((point, index) => {
    const error = 0.05 + Math.abs(Math.sin(index * 0.28)) * 0.12;
    const upper: VisualVec3 = [point[0], point[1] + error, point[2] + 0.24];
    const lower: VisualVec3 = [point[0], point[1] - error, point[2] + 0.24];
    positions.push(...upper, ...lower);
    const t = error / 0.17;
    colors.push(0.2 + t * 0.8, 0.85 - t * 0.32, 0.62, 0.12 + t * 0.7, 0.68, 0.94);
  });

  for (let index = 0; index < curve.length - 1; index += 1) {
    const base = index * 2;
    indices.push(base, base + 1, base + 2);
    indices.push(base + 1, base + 3, base + 2);
  }

  return { positions, indices, colors };
}

function createInterpolationBasisLayers(nodes: VisualVec3[]): VisualLayerSpec[] {
  const layers: VisualLayerSpec[] = [];
  for (const [index, node] of nodes.entries()) {
    const support: VisualVec3[] = [];
    for (let step = 0; step <= 24; step += 1) {
      const x = node[0] - 0.34 + (0.68 * step) / 24;
      const y = -0.55 + Math.max(0, 1 - Math.abs(x - node[0]) / 0.34) * 0.36;
      support.push([x, y, 0.36 + index * 0.035]);
    }
    layers.push(
      createLineLayer(`interp-basis-${index}`, polylineSegments(support), index % 2 === 0 ? "#38bdf8" : "#f472b6", {
        opacity: 0.58,
        linewidth: 1.3,
      }),
    );
  }

  layers.push(createLabelLayer("interp-basis-label", "local basis influence", [-1.2, -0.34, 0.58], "#bfdbfe", { scale: 0.085 }));
  return layers;
}

function selectInterpolationCurve(input: string) {
  const points: VisualVec3[] = [];
  for (let step = 0; step <= 80; step += 1) {
    const x = -1.2 + (2.4 * step) / 80;
    const y =
      input.includes("spline")
        ? 0.18 * Math.sin(3.2 * x) + 0.2 * x + 0.26
        : input.includes("newton")
          ? 0.12 * x * x * x - 0.08 * x * x + 0.22 * x + 0.2
          : 0.1 * x * x * x * x - 0.22 * x * x + 0.28 * x + 0.22;
    points.push([x, y, -0.45]);
  }
  return points;
}

function createInterpolationSupportLines(nodes: VisualVec3[]) {
  return nodes.map((node) => ({
    from: [node[0], -0.75, node[2]] as VisualVec3,
    to: node,
  }));
}

function createDriftLine() {
  return Array.from({ length: 18 }, (_, step) => {
    const t = step / 17;
    return [-1.05 + step * 0.12, -0.02 + t * 0.18, -1.05 + t * 2.1] as VisualVec3;
  });
}

function buildDensityMarkers() {
  return [
    { position: [-0.9, -0.12, -0.92] as VisualVec3, color: "#38bdf8", radius: 0.03, label: "low variance" },
    { position: [0.1, 0.22, 0.1] as VisualVec3, color: "#f472b6", radius: 0.045, label: "spread" },
    { position: [0.82, 0.36, 0.88] as VisualVec3, color: "#fde047", radius: 0.052, label: "tail" },
  ];
}

function squarePoints(size: number, origin: VisualVec3): VisualVec3[] {
  const [x, y, z] = origin;
  return [
    [x, y, z],
    [x + size, y, z],
    [x + size, y + size, z],
    [x, y + size, z],
  ];
}

function squareSegments(points: VisualVec3[]) {
  return points.map((point, index) => ({
    from: point,
    to: points[(index + 1) % points.length],
  }));
}

function polylineSegments(points: VisualVec3[]) {
  return points.slice(0, -1).map((point, index) => ({
    from: point,
    to: points[index + 1],
  }));
}

type Transform2D = [[number, number], [number, number]];

function transformPoint(point: VisualVec3, matrix: Transform2D): VisualVec3 {
  const [x, y, z] = point;
  return [x * matrix[0][0] + y * matrix[0][1], x * matrix[1][0] + y * matrix[1][1], z];
}

function selectMatrixStyle(input: string): Transform2D {
  if (input.includes("rotation") || input.includes("rotate")) {
    const theta = Math.PI / 6;
    return [
      [Math.cos(theta), -Math.sin(theta)],
      [Math.sin(theta), Math.cos(theta)],
    ];
  }

  if (input.includes("shear")) {
    return [
      [1, 0.45],
      [0, 1],
    ];
  }

  if (input.includes("stretch") || input.includes("scale")) {
    return [
      [1.35, 0],
      [0, 0.78],
    ];
  }

  if (input.includes("eigen") || input.includes("spectrum")) {
    return [
      [1.28, 0.18],
      [-0.12, 0.82],
    ];
  }

  return [
    [1.12, 0.32],
    [-0.22, 0.92],
  ];
}

function stochasticColor(index: number) {
  const palette = ["#60a5fa", "#34d399", "#f472b6", "#f59e0b", "#22d3ee", "#c084fc"];
  return palette[index % palette.length];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "operator";
}
