import type { IntegrationTrace } from "@methodslab/methods-engine/core";
import type { VisualLayerSpec, VisualSceneSpec, VisualVec3 } from "./types";
import {
  createCoordinateAxesLayers,
  createGridLayer,
  createLabelLayer,
  createLineLayer,
  createMarkerLayer,
  createSceneSpec,
} from "./scene-objects";

export function createAreaIntegralSceneSpec(
  trace: IntegrationTrace,
  options: {
    showComparison?: boolean;
    showPanels?: boolean;
    showSamples?: boolean;
    showProgress?: boolean;
    comparisonTraces?: IntegrationTrace[];
    focus?: number;
  } = {},
): VisualSceneSpec {
  const bounds = curveBounds(trace);
  const focus = options.focus ?? 1;
  const panelLimit =
    trace.panels.length > 0
      ? Math.max(1, Math.floor(trace.panels.length * Math.max(0.08, focus)))
      : 0;
  const sampleLimit =
    trace.samples.length > 0
      ? Math.max(1, Math.floor(trace.samples.length * Math.max(0.08, focus)))
      : 0;
  const visiblePanels = trace.panels.slice(0, panelLimit);
  const visibleSamples = trace.samples.slice(0, sampleLimit);
  const visibleProgress = trace.progress.slice(
    0,
    Math.max(1, Math.floor(trace.progress.length * Math.max(0.08, focus))),
  );
  const showPanels = options.showPanels ?? true;
  const showSamples = options.showSamples ?? true;
  const showProgress = options.showProgress ?? true;

  const layers: VisualLayerSpec[] = [
    createGridLayer("area-grid", {
      size: 4.4,
      divisions: 20,
      y: -1.02,
      color: "#3f3f46",
      opacity: 0.2,
    }),
    ...createCoordinateAxesLayers({
      idPrefix: "area-axes",
      objectId: "axes",
      origin: [-1.85, -1.02, -1.35],
      size: 1.65,
      xLabel: "x",
      yLabel: "f(x)",
      zLabel: "analysis",
      showZ: true,
    }),
    createLabelLayer(
      "area-title",
      trace.metadata.exampleName,
      [-1.82, 2.08, 1.5],
      "#fff7ed",
      {
        scale: 0.24,
        metadata: tooltip("Integral example", trace.metadata.exampleName),
      },
    ),
    createLabelLayer(
      "area-method",
      trace.metadata.methodName,
      [-1.82, 1.76, 1.5],
      "#fdba74",
      { scale: 0.12, metadata: tooltip("Method", trace.metadata.methodName) },
    ),
    createLabelLayer(
      "area-stats",
      `I=${trace.numericValue.toExponential(2)}, err=${trace.absError.toExponential(2)}`,
      [-1.82, 1.5, 1.5],
      "#fed7aa",
      { scale: 0.095 },
    ),
    exactCurveLayer(trace, bounds),
    exactAreaRibbonLayer(trace, bounds),
  ];

  if (showPanels && visiblePanels.length > 0) {
    layers.push(panelMeshLayer(trace, visiblePanels, bounds));
    layers.push(approximationPathLayer(trace, visiblePanels, bounds));
    layers.push(...localErrorLayers(trace, visiblePanels, bounds));
  }

  if (showSamples && visibleSamples.length > 0) {
    layers.push(...sampleLayers(trace, visibleSamples, bounds));
  }

  if (showProgress && visibleProgress.length > 0) {
    layers.push(...progressLayers(trace, visibleProgress));
  }

  if (options.showComparison ?? true) {
    layers.push(
      ...comparisonLayers(
        options.comparisonTraces ?? [],
        bounds,
      ),
    );
  }

  return createSceneSpec({
    id: `area-integral:${trace.metadata.methodId}:${trace.metadata.exampleId}:${trace.panelCount}:${focus}`,
    camera: {
      position: [4.35, -6.1, 3.85],
      target: [0.12, 0.18, -0.05],
      fov: 45,
      minDistance: 2,
      maxDistance: 15,
    },
    style: {
      background: "#11100c",
      fogNear: 12,
      fogFar: 34,
      exposure: 1.22,
      ambientLight: 1.08,
    },
    layers,
    metadata: {
      kind: "area-integral",
      methodName: trace.metadata.methodName,
      exampleName: trace.metadata.exampleName,
    },
  });
}

function exactCurveLayer(trace: IntegrationTrace, bounds: Bounds): VisualLayerSpec {
  return {
    kind: "path",
    id: "area-exact-curve",
    objectId: "exact-curve",
    points: trace.curve.map((sample) => mapCurvePoint(sample.x, sample.y, bounds, -0.92)),
    color: "#7dd3fc",
    opacity: 0.96,
    linewidth: 2.4,
    metadata: tooltip("Exact curve", "Analytic or high-accuracy reference integrand."),
  };
}

function exactAreaRibbonLayer(trace: IntegrationTrace, bounds: Bounds): VisualLayerSpec {
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  const z = -0.92;

  trace.curve.slice(0, -1).forEach((sample, index) => {
    const next = trace.curve[index + 1]!;
    const base = positions.length / 3;
    const p0 = mapCurvePoint(sample.x, 0, bounds, z);
    const p1 = mapCurvePoint(sample.x, sample.y, bounds, z);
    const p2 = mapCurvePoint(next.x, next.y, bounds, z);
    const p3 = mapCurvePoint(next.x, 0, bounds, z);
    positions.push(...p0, ...p1, ...p2, ...p3);
    colors.push(0.2, 0.54, 0.7, 0.2, 0.54, 0.7, 0.2, 0.54, 0.7, 0.2, 0.54, 0.7);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });

  return {
    kind: "mesh",
    id: "area-exact-ribbon",
    objectId: "exact-area",
    positions,
    indices,
    colors,
    material: {
      vertexColors: true,
      shading: "standard",
      opacity: 0.12,
      transparent: true,
      doubleSided: true,
      roughness: 0.82,
    },
    metadata: tooltip("Exact area ribbon", "Reference area under the true curve."),
  };
}

function panelMeshLayer(
  trace: IntegrationTrace,
  panels: IntegrationTrace["panels"],
  bounds: Bounds,
): VisualLayerSpec {
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  const laneZ = 0.05;

  panels.forEach((panel) => {
    const base = positions.length / 3;
    const vertices = panel.polygon.map(([x, y]) => mapCurvePoint(x, y, bounds, laneZ));
    if (vertices.length < 3) return;
    vertices.forEach((point) => positions.push(...point));
    const color = signedColor(panel.error);
    for (let index = 0; index < vertices.length; index += 1) {
      colors.push(...color);
    }
    for (let index = 1; index < vertices.length - 1; index += 1) {
      indices.push(base, base + index, base + index + 1);
    }
  });

  return {
    kind: "mesh",
    id: "area-panel-mesh",
    objectId: "panels",
    positions,
    indices,
    colors,
    material: {
      vertexColors: true,
      shading: "standard",
      opacity: 0.42,
      transparent: true,
      doubleSided: true,
      roughness: 0.74,
    },
    wireframe: {
      color: "#f8fafc",
      opacity: 0.08,
    },
    metadata: tooltip("Quadrature panels", "Numeric replacement geometry used by the active method."),
  };
}

function approximationPathLayer(
  trace: IntegrationTrace,
  panels: IntegrationTrace["panels"],
  bounds: Bounds,
): VisualLayerSpec {
  const points = panels.flatMap((panel, index) => {
    const current = mapCurvePoint(panel.x0, panel.nodes[0]?.[1] ?? panel.sampleY, bounds, 0.12);
    const next = mapCurvePoint(panel.x1, panel.nodes.at(-1)?.[1] ?? panel.sampleY, bounds, 0.12);
    return index === 0 ? [current, next] : [next];
  });

  return {
    kind: "path",
    id: "area-approximation-path",
    objectId: "approximation",
    points,
    color: "#fb7185",
    opacity: 0.94,
    linewidth: 2.2,
    metadata: tooltip("Approximation path", "Top profile implied by the active quadrature method."),
  };
}

function sampleLayers(
  trace: IntegrationTrace,
  samples: IntegrationTrace["samples"],
  bounds: Bounds,
): VisualLayerSpec[] {
  const stride = Math.max(1, Math.floor(samples.length / 56));
  const markers = samples.filter((_, index) => index % stride === 0);

  return markers.map((sample) =>
    createMarkerLayer(
      `area-sample-${sample.index}`,
      mapCurvePoint(sample.x, sample.y, bounds, 0.56),
      sample.role === "monte-carlo" ? "#ef4444" : "#f8fafc",
      {
        objectId: "samples",
        radius: sample.role === "monte-carlo" ? 0.022 : 0.028,
        label: sample.index === markers[0]?.index ? sample.role : undefined,
        labelScale: 0.06,
        metadata: tooltip(
          "Sample point",
          `x=${sample.x.toFixed(3)}, f=${sample.y.toFixed(3)}, w=${sample.weight.toExponential(1)}`,
        ),
      },
    ),
  );
}

function localErrorLayers(
  trace: IntegrationTrace,
  panels: IntegrationTrace["panels"],
  bounds: Bounds,
): VisualLayerSpec[] {
  const stride = Math.max(1, Math.floor(panels.length / 18));
  return panels.filter((_, index) => index % stride === 0).flatMap((panel) => {
    const exactY = interpolateCurveY(trace, panel.sampleX);
    const from = mapCurvePoint(panel.sampleX, panel.sampleY, bounds, 0.52);
    const to = mapCurvePoint(panel.sampleX, exactY, bounds, 0.52);
    return [
      createLineLayer(
        `area-local-error-${panel.index}`,
        [{ from, to }],
        panel.error >= 0 ? "#fb7185" : "#60a5fa",
        {
          opacity: 0.72,
          metadata: tooltip(
            `Local panel error ${panel.index}`,
            `panel err=${panel.error.toExponential(2)}`,
          ),
        },
      ),
    ];
  });
}

function progressLayers(
  trace: IntegrationTrace,
  progress: IntegrationTrace["progress"],
): VisualLayerSpec[] {
  const numericRange = progress.reduce(
    (range, sample) => ({
      min: Math.min(range.min, sample.numeric, sample.exact),
      max: Math.max(range.max, sample.numeric, sample.exact),
    }),
    { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
  );
  const mapProgress = (sample: (typeof progress)[number], value: number): VisualVec3 => {
    const x = -1.72 + sample.t * 1.18;
    const y =
      -0.76 +
      ((value - numericRange.min) / Math.max(numericRange.max - numericRange.min, 1e-9)) * 0.68;
    return [x, y, 1.16];
  };
  const exactPoints = progress.map((sample) => mapProgress(sample, sample.exact));
  const numericPoints = progress.map((sample) => mapProgress(sample, sample.numeric));
  const last = progress[progress.length - 1]!;

  return [
    {
      kind: "path",
      id: "area-progress-exact",
      objectId: "progress",
      points: exactPoints,
      color: "#7dd3fc",
      opacity: 0.76,
      linewidth: 1.6,
      metadata: tooltip("Reference progression", "Partial exact integral or exact final target."),
    },
    {
      kind: "path",
      id: "area-progress-numeric",
      objectId: "progress",
      points: numericPoints,
      color: "#34d399",
      opacity: 0.95,
      linewidth: 2.1,
      metadata: tooltip("Numeric progression", "How the running integral estimate evolves."),
    },
    createMarkerLayer(
      "area-progress-final",
      numericPoints[numericPoints.length - 1]!,
      "#fde047",
      {
        objectId: "progress",
        radius: 0.038,
        label: last.label,
        labelScale: 0.06,
        metadata: tooltip("Current progress endpoint", `err=${last.error.toExponential(2)}`),
      },
    ),
    createLabelLayer("area-progress-label", "progress", [-1.74, -0.02, 1.16], "#bbf7d0", {
      scale: 0.082,
    }),
  ];
}

function comparisonLayers(
  traces: IntegrationTrace[],
  bounds: Bounds,
): VisualLayerSpec[] {
  return traces.slice(0, 4).flatMap((trace) => {
    if (trace.panels.length === 0) return [];
    const points = trace.panels.flatMap((panel, index) => {
      const current = mapCurvePoint(panel.x0, panel.nodes[0]?.[1] ?? panel.sampleY, bounds, 0.92);
      const next = mapCurvePoint(panel.x1, panel.nodes.at(-1)?.[1] ?? panel.sampleY, bounds, 0.92);
      return index === 0 ? [current, next] : [next];
    });
    return [
      {
        kind: "path",
        id: `area-compare-${trace.metadata.methodId}`,
        objectId: "comparison",
        points,
        color: comparisonColor(trace.metadata.methodId),
        opacity: 0.48,
        linewidth: 1.4,
        metadata: tooltip(
          `${trace.metadata.methodName} overlay`,
          `abs err=${trace.absError.toExponential(2)}`,
        ),
      },
    ];
  });
}

type Bounds = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

function curveBounds(trace: IntegrationTrace): Bounds {
  const xs = trace.curve.map((sample) => sample.x);
  const ys = [0, ...trace.curve.map((sample) => sample.y), ...trace.samples.map((sample) => sample.y)];
  return {
    xMin: Math.min(...xs),
    xMax: Math.max(...xs),
    yMin: Math.min(...ys),
    yMax: Math.max(...ys),
  };
}

function mapCurvePoint(
  x: number,
  y: number,
  bounds: Bounds,
  z: number,
): VisualVec3 {
  const nx =
    -1.35 +
    ((x - bounds.xMin) / Math.max(bounds.xMax - bounds.xMin, 1e-9)) * 2.7;
  const ny =
    -0.82 +
    ((y - bounds.yMin) / Math.max(bounds.yMax - bounds.yMin, 1e-9)) * 1.76;
  return [nx, ny, z];
}

function interpolateCurveY(trace: IntegrationTrace, x: number) {
  for (let index = 1; index < trace.curve.length; index += 1) {
    const left = trace.curve[index - 1]!;
    const right = trace.curve[index]!;
    if (x >= left.x && x <= right.x) {
      const t = (x - left.x) / Math.max(right.x - left.x, 1e-9);
      return left.y + (right.y - left.y) * t;
    }
  }
  return trace.curve[trace.curve.length - 1]?.y ?? 0;
}

function signedColor(error: number): [number, number, number] {
  if (error >= 0) return [0.96, 0.44, 0.38];
  return [0.36, 0.72, 0.98];
}

function comparisonColor(methodId: string) {
  if (methodId.includes("simpson")) return "#cc79a7";
  if (methodId.includes("gauss")) return "#f97316";
  if (methodId.includes("romberg")) return "#22c55e";
  if (methodId.includes("monte")) return "#ef4444";
  if (methodId.includes("midpoint")) return "#009e73";
  return "#cbd5e1";
}

function tooltip(title: string, description: string) {
  return { title, description };
}
