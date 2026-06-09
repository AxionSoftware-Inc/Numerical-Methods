export type IntegrationMethodId = string;
export type IntegrationExampleId = string;

export type IntegrationFunction = (x: number) => number;

export type IntegrationExampleSpec = {
  id: IntegrationExampleId;
  name: string;
  shortName: string;
  formula: string;
  a: number;
  b: number;
  defaultPanels: number;
  minPanels: number;
  maxPanels: number;
  exactValue: number;
  fn: IntegrationFunction;
  interpretation: string;
};

export type IntegrationPanelTrace = {
  index: number;
  x0: number;
  x1: number;
  sampleX: number;
  sampleY: number;
  area: number;
  exactArea: number;
  error: number;
  polygon: Array<[number, number]>;
  nodes: Array<[number, number]>;
};

export type IntegrationCurveSample = {
  x: number;
  y: number;
};

export type IntegrationTrace = {
  curve: IntegrationCurveSample[];
  panels: IntegrationPanelTrace[];
  numericValue: number;
  exactValue: number;
  error: number;
  absError: number;
  panelCount: number;
  metadata: {
    methodId: string;
    methodName: string;
    exampleId: string;
    exampleName: string;
    formula: string;
  };
};

export type IntegrationMethodSpec = {
  id: IntegrationMethodId;
  name: string;
  formula: string;
  order: string;
  color: string;
  geometry: string;
  requiresEvenPanels?: boolean;
  buildPanels: (example: IntegrationExampleSpec, panels: number) => IntegrationPanelTrace[];
};

export type IntegrationConvergenceSample = {
  panels: number;
  absError: number;
};

export type IntegrationConvergenceTrace = {
  methodId: string;
  methodName: string;
  color: string;
  samples: IntegrationConvergenceSample[];
};

export type SurfaceIntegralExampleId = string;
export type VolumeIntegralExampleId = string;

export type SurfaceIntegralExampleSpec = {
  id: SurfaceIntegralExampleId;
  name: string;
  shortName: string;
  formula: string;
  xRange: [number, number];
  yRange: [number, number];
  defaultResolution: number;
  minResolution: number;
  maxResolution: number;
  exactValue: number;
  fn: (x: number, y: number) => number;
  interpretation: string;
};

export type SurfaceCellTrace = {
  index: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  sample: [number, number, number];
  value: number;
  area: number;
  contribution: number;
  corners: Array<[number, number, number]>;
};

export type SurfaceIntegralTrace = {
  cells: SurfaceCellTrace[];
  numericValue: number;
  exactValue: number;
  error: number;
  absError: number;
  resolution: number;
  valueRange: [number, number];
  metadata: {
    exampleId: string;
    exampleName: string;
    formula: string;
  };
};

export type VolumeIntegralExampleSpec = {
  id: VolumeIntegralExampleId;
  name: string;
  shortName: string;
  formula: string;
  xRange: [number, number];
  yRange: [number, number];
  zRange: [number, number];
  defaultResolution: number;
  minResolution: number;
  maxResolution: number;
  exactValue: number;
  height: (x: number, y: number) => number;
  interpretation: string;
};

export type VoxelTrace = {
  index: number;
  center: [number, number, number];
  size: [number, number, number];
  value: number;
  contribution: number;
};

export type VolumeIntegralTrace = {
  voxels: VoxelTrace[];
  numericValue: number;
  exactValue: number;
  error: number;
  absError: number;
  resolution: number;
  valueRange: [number, number];
  metadata: {
    exampleId: string;
    exampleName: string;
    formula: string;
  };
};

export function buildIntegrationTrace(
  method: IntegrationMethodSpec,
  example: IntegrationExampleSpec,
  requestedPanels: number,
): IntegrationTrace {
  const panelCount = normalizePanelCount(method, example, requestedPanels);
  const panels = method.buildPanels(example, panelCount);
  const numericValue = panels.reduce((sum, panel) => sum + panel.area, 0);
  const error = numericValue - example.exactValue;

  return {
    curve: sampleCurve(example),
    panels,
    numericValue,
    exactValue: example.exactValue,
    error,
    absError: Math.abs(error),
    panelCount,
    metadata: {
      methodId: method.id,
      methodName: method.name,
      exampleId: example.id,
      exampleName: example.name,
      formula: method.formula,
    },
  };
}

export function buildIntegrationConvergence(
  methods: IntegrationMethodSpec[],
  example: IntegrationExampleSpec,
  maxPanels = example.maxPanels,
): IntegrationConvergenceTrace[] {
  const panelCounts = [4, 6, 8, 12, 16, 24, 32, 48, 64].filter((count) => count <= maxPanels);

  return methods.map((method) => ({
    methodId: method.id,
    methodName: method.name,
    color: method.color,
    samples: panelCounts.map((panels) => {
      const trace = buildIntegrationTrace(method, example, panels);
      return {
        panels: trace.panelCount,
        absError: trace.absError,
      };
    }),
  }));
}

export function buildSurfaceIntegralTrace(example: SurfaceIntegralExampleSpec, requestedResolution: number): SurfaceIntegralTrace {
  const resolution = normalizeResolution(example.minResolution, example.maxResolution, requestedResolution);
  const [xMin, xMax] = example.xRange;
  const [yMin, yMax] = example.yRange;
  const dx = (xMax - xMin) / resolution;
  const dy = (yMax - yMin) / resolution;
  const cells: SurfaceCellTrace[] = [];
  let numericValue = 0;
  let minValue = Number.POSITIVE_INFINITY;
  let maxValue = Number.NEGATIVE_INFINITY;

  for (let iy = 0; iy < resolution; iy++) {
    for (let ix = 0; ix < resolution; ix++) {
      const x0 = xMin + ix * dx;
      const x1 = x0 + dx;
      const y0 = yMin + iy * dy;
      const y1 = y0 + dy;
      const sampleX = (x0 + x1) / 2;
      const sampleY = (y0 + y1) / 2;
      const value = example.fn(sampleX, sampleY);
      const area = dx * dy;
      const contribution = value * area;
      numericValue += contribution;
      minValue = Math.min(minValue, value);
      maxValue = Math.max(maxValue, value);
      cells.push({
        index: cells.length,
        x0,
        x1,
        y0,
        y1,
        sample: [sampleX, sampleY, value],
        value,
        area,
        contribution,
        corners: [
          [x0, y0, example.fn(x0, y0)],
          [x1, y0, example.fn(x1, y0)],
          [x1, y1, example.fn(x1, y1)],
          [x0, y1, example.fn(x0, y1)],
        ],
      });
    }
  }

  const error = numericValue - example.exactValue;
  return {
    cells,
    numericValue,
    exactValue: example.exactValue,
    error,
    absError: Math.abs(error),
    resolution,
    valueRange: [minValue, maxValue],
    metadata: {
      exampleId: example.id,
      exampleName: example.name,
      formula: example.formula,
    },
  };
}

export function buildVolumeIntegralTrace(example: VolumeIntegralExampleSpec, requestedResolution: number): VolumeIntegralTrace {
  const resolution = normalizeResolution(example.minResolution, example.maxResolution, requestedResolution);
  const [xMin, xMax] = example.xRange;
  const [yMin, yMax] = example.yRange;
  const dx = (xMax - xMin) / resolution;
  const dy = (yMax - yMin) / resolution;
  const area = dx * dy;
  const voxels: VoxelTrace[] = [];
  let numericValue = 0;
  let minValue = Number.POSITIVE_INFINITY;
  let maxValue = Number.NEGATIVE_INFINITY;

  for (let iy = 0; iy < resolution; iy++) {
    for (let ix = 0; ix < resolution; ix++) {
      const x = xMin + (ix + 0.5) * dx;
      const y = yMin + (iy + 0.5) * dy;
      const height = Math.max(0, example.height(x, y));
      const contribution = height * area;
      numericValue += contribution;
      minValue = Math.min(minValue, height);
      maxValue = Math.max(maxValue, height);
      voxels.push({
        index: voxels.length,
        center: [x, y, height / 2],
        size: [dx, dy, height],
        value: height,
        contribution,
      });
    }
  }

  const error = numericValue - example.exactValue;
  return {
    voxels,
    numericValue,
    exactValue: example.exactValue,
    error,
    absError: Math.abs(error),
    resolution,
    valueRange: [minValue, maxValue],
    metadata: {
      exampleId: example.id,
      exampleName: example.name,
      formula: example.formula,
    },
  };
}

export function buildResolutionConvergence(
  builder: (resolution: number) => { resolution: number; absError: number },
  minResolution: number,
  maxResolution: number,
) {
  const candidates = [4, 6, 8, 10, 12, 16, 20, 24, 28, 32].filter((value) => value >= minResolution && value <= maxResolution);
  return candidates.map((resolution) => builder(resolution));
}

export function normalizePanelCount(method: IntegrationMethodSpec, example: IntegrationExampleSpec, requestedPanels: number) {
  let panels = Math.round(requestedPanels);
  panels = Math.max(example.minPanels, Math.min(example.maxPanels, panels));
  if (method.requiresEvenPanels && panels % 2 !== 0) panels += panels >= example.maxPanels ? -1 : 1;
  return Math.max(example.minPanels, Math.min(example.maxPanels, panels));
}

function normalizeResolution(minResolution: number, maxResolution: number, requestedResolution: number) {
  return Math.max(minResolution, Math.min(maxResolution, Math.round(requestedResolution)));
}

export function exactPanelArea(example: IntegrationExampleSpec, x0: number, x1: number) {
  return adaptiveSimpson(example.fn, x0, x1, 1e-9, 12);
}

export function sampleCurve(example: IntegrationExampleSpec, samples = 360): IntegrationCurveSample[] {
  return Array.from({ length: samples }, (_, index) => {
    const x = example.a + ((example.b - example.a) * index) / (samples - 1);
    return { x, y: example.fn(x) };
  });
}

export function buildLeftPanels(example: IntegrationExampleSpec, panels: number): IntegrationPanelTrace[] {
  const h = (example.b - example.a) / panels;
  return Array.from({ length: panels }, (_, index) => {
    const x0 = example.a + index * h;
    const x1 = x0 + h;
    const sampleX = x0;
    const sampleY = example.fn(sampleX);
    const area = sampleY * h;
    const exactArea = exactPanelArea(example, x0, x1);
    return {
      index,
      x0,
      x1,
      sampleX,
      sampleY,
      area,
      exactArea,
      error: area - exactArea,
      polygon: [
        [x0, 0],
        [x0, sampleY],
        [x1, sampleY],
        [x1, 0],
      ],
      nodes: [[sampleX, sampleY]],
    };
  });
}

export function buildMidpointPanels(example: IntegrationExampleSpec, panels: number): IntegrationPanelTrace[] {
  const h = (example.b - example.a) / panels;
  return Array.from({ length: panels }, (_, index) => {
    const x0 = example.a + index * h;
    const x1 = x0 + h;
    const sampleX = (x0 + x1) / 2;
    const sampleY = example.fn(sampleX);
    const area = sampleY * h;
    const exactArea = exactPanelArea(example, x0, x1);
    return {
      index,
      x0,
      x1,
      sampleX,
      sampleY,
      area,
      exactArea,
      error: area - exactArea,
      polygon: [
        [x0, 0],
        [x0, sampleY],
        [x1, sampleY],
        [x1, 0],
      ],
      nodes: [[sampleX, sampleY]],
    };
  });
}

export function buildTrapezoidPanels(example: IntegrationExampleSpec, panels: number): IntegrationPanelTrace[] {
  const h = (example.b - example.a) / panels;
  return Array.from({ length: panels }, (_, index) => {
    const x0 = example.a + index * h;
    const x1 = x0 + h;
    const y0 = example.fn(x0);
    const y1 = example.fn(x1);
    const area = ((y0 + y1) * h) / 2;
    const exactArea = exactPanelArea(example, x0, x1);
    return {
      index,
      x0,
      x1,
      sampleX: (x0 + x1) / 2,
      sampleY: (y0 + y1) / 2,
      area,
      exactArea,
      error: area - exactArea,
      polygon: [
        [x0, 0],
        [x0, y0],
        [x1, y1],
        [x1, 0],
      ],
      nodes: [
        [x0, y0],
        [x1, y1],
      ],
    };
  });
}

export function buildSimpsonPanels(example: IntegrationExampleSpec, panels: number): IntegrationPanelTrace[] {
  const h = (example.b - example.a) / panels;
  const pairCount = panels / 2;

  return Array.from({ length: pairCount }, (_, index) => {
    const x0 = example.a + index * 2 * h;
    const xm = x0 + h;
    const x1 = x0 + 2 * h;
    const y0 = example.fn(x0);
    const ym = example.fn(xm);
    const y1 = example.fn(x1);
    const area = (h / 3) * (y0 + 4 * ym + y1);
    const exactArea = exactPanelArea(example, x0, x1);
    return {
      index,
      x0,
      x1,
      sampleX: xm,
      sampleY: ym,
      area,
      exactArea,
      error: area - exactArea,
      polygon: [
        [x0, 0],
        [x0, y0],
        [xm, ym],
        [x1, y1],
        [x1, 0],
      ],
      nodes: [
        [x0, y0],
        [xm, ym],
        [x1, y1],
      ],
    };
  });
}

function adaptiveSimpson(fn: IntegrationFunction, a: number, b: number, epsilon: number, depth: number): number {
  const c = (a + b) / 2;
  const whole = simpson(fn, a, b);
  return adaptiveSimpsonRecursive(fn, a, b, c, epsilon, whole, depth);
}

function adaptiveSimpsonRecursive(
  fn: IntegrationFunction,
  a: number,
  b: number,
  c: number,
  epsilon: number,
  whole: number,
  depth: number,
): number {
  const left = simpson(fn, a, c);
  const right = simpson(fn, c, b);
  const delta = left + right - whole;
  if (depth <= 0 || Math.abs(delta) <= 15 * epsilon) return left + right + delta / 15;
  return (
    adaptiveSimpsonRecursive(fn, a, c, (a + c) / 2, epsilon / 2, left, depth - 1) +
    adaptiveSimpsonRecursive(fn, c, b, (c + b) / 2, epsilon / 2, right, depth - 1)
  );
}

function simpson(fn: IntegrationFunction, a: number, b: number) {
  const c = (a + b) / 2;
  return ((b - a) / 6) * (fn(a) + 4 * fn(c) + fn(b));
}
