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
  sampleCount?: number;
};

export type IntegrationCurveSample = {
  x: number;
  y: number;
};

export type IntegrationSampleRole = "node" | "gauss" | "adaptive" | "monte-carlo" | "corner";

export type IntegrationSampleTrace = {
  index: number;
  x: number;
  y: number;
  exactY: number;
  weight: number;
  contribution: number;
  role: IntegrationSampleRole;
};

export type IntegrationProgressSample = {
  index: number;
  t: number;
  numeric: number;
  exact: number;
  error: number;
  label: string;
};

export type IntegrationMethodCategory = "panel" | "adaptive" | "extrapolation" | "stochastic";

export type IntegrationTrace = {
  curve: IntegrationCurveSample[];
  panels: IntegrationPanelTrace[];
  samples: IntegrationSampleTrace[];
  progress: IntegrationProgressSample[];
  numericValue: number;
  exactValue: number;
  error: number;
  absError: number;
  panelCount: number;
  sampleCount: number;
  estimatorStdError: number;
  sensitivity: number;
  peakPanelError: number;
  signedBias: number;
  metadata: {
    methodId: string;
    methodName: string;
    exampleId: string;
    exampleName: string;
    formula: string;
    category: IntegrationMethodCategory;
  };
};

export type IntegrationTraceDraft = {
  panels: IntegrationPanelTrace[];
  samples?: IntegrationSampleTrace[];
  progress?: IntegrationProgressSample[];
  numericValue?: number;
  panelCount?: number;
  sampleCount?: number;
  estimatorStdError?: number;
};

export type IntegrationMethodSpec = {
  id: IntegrationMethodId;
  name: string;
  formula: string;
  order: string;
  color: string;
  geometry: string;
  category?: IntegrationMethodCategory;
  requiresEvenPanels?: boolean;
  prefersPowerOfTwoPanels?: boolean;
  buildTrace: (example: IntegrationExampleSpec, panels: number) => IntegrationTraceDraft;
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
export type SurfaceIntegrationMethodId = string;
export type VolumeIntegrationMethodId = string;

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
  samplePoints: Array<[number, number, number]>;
  value: number;
  area: number;
  contribution: number;
  corners: Array<[number, number, number]>;
  sampleCount: number;
};

export type SurfaceIntegralTrace = {
  cells: SurfaceCellTrace[];
  numericValue: number;
  exactValue: number;
  error: number;
  absError: number;
  resolution: number;
  valueRange: [number, number];
  sampleCount: number;
  sensitivity: number;
  metadata: {
    methodId: string;
    methodName: string;
    exampleId: string;
    exampleName: string;
    formula: string;
  };
};

export type SurfaceIntegralTraceDraft = {
  cells: SurfaceCellTrace[];
  numericValue?: number;
  sampleCount?: number;
};

export type SurfaceIntegrationMethodSpec = {
  id: SurfaceIntegrationMethodId;
  name: string;
  formula: string;
  order: string;
  color: string;
  geometry: string;
  buildTrace: (example: SurfaceIntegralExampleSpec, resolution: number) => SurfaceIntegralTraceDraft;
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
  samplePoints: Array<[number, number, number]>;
  sampleCount: number;
};

export type VolumeIntegralTrace = {
  voxels: VoxelTrace[];
  numericValue: number;
  exactValue: number;
  error: number;
  absError: number;
  resolution: number;
  valueRange: [number, number];
  sampleCount: number;
  sensitivity: number;
  metadata: {
    methodId: string;
    methodName: string;
    exampleId: string;
    exampleName: string;
    formula: string;
  };
};

export type VolumeIntegralTraceDraft = {
  voxels: VoxelTrace[];
  numericValue?: number;
  sampleCount?: number;
};

export type VolumeIntegrationMethodSpec = {
  id: VolumeIntegrationMethodId;
  name: string;
  formula: string;
  order: string;
  color: string;
  geometry: string;
  buildTrace: (example: VolumeIntegralExampleSpec, resolution: number) => VolumeIntegralTraceDraft;
};

export function buildIntegrationTrace(
  method: IntegrationMethodSpec,
  example: IntegrationExampleSpec,
  requestedPanels: number,
  options: { computeSensitivity?: boolean } = {},
): IntegrationTrace {
  const panelCount = normalizePanelCount(method, example, requestedPanels);
  const draft = method.buildTrace(example, panelCount);
  const panels = draft.panels;
  const numericValue = draft.numericValue ?? panels.reduce((sum, panel) => sum + panel.area, 0);
  const error = numericValue - example.exactValue;
  const samples = draft.samples ?? collectPanelSamples(panels);
  const progress = draft.progress ?? buildPanelProgress(example, panels);
  const actualPanelCount = draft.panelCount ?? panelCount;
  const estimatorStdError = draft.estimatorStdError ?? 0;
  const sensitivity =
    options.computeSensitivity === false
      ? 0
      : buildSensitivity(method, example, panelCount, numericValue);
  const peakPanelError = panels.length > 0 ? Math.max(...panels.map((panel) => Math.abs(panel.error))) : Math.abs(error);
  const signedBias =
    panels.length > 0 ? panels.reduce((sum, panel) => sum + panel.error, 0) / panels.length : error;

  return {
    curve: sampleCurve(example),
    panels,
    samples,
    progress,
    numericValue,
    exactValue: example.exactValue,
    error,
    absError: Math.abs(error),
    panelCount: actualPanelCount,
    sampleCount: draft.sampleCount ?? samples.length,
    estimatorStdError,
    sensitivity,
    peakPanelError,
    signedBias,
    metadata: {
      methodId: method.id,
      methodName: method.name,
      exampleId: example.id,
      exampleName: example.name,
      formula: method.formula,
      category: method.category ?? "panel",
    },
  };
}

export function buildIntegrationConvergence(
  methods: IntegrationMethodSpec[],
  example: IntegrationExampleSpec,
  maxPanels = example.maxPanels,
): IntegrationConvergenceTrace[] {
  const panelCounts = [4, 6, 8, 12, 16, 24, 32, 48, 64, 80, 96, 128].filter(
    (count) => count <= maxPanels,
  );

  return methods.map((method) => ({
    methodId: method.id,
    methodName: method.name,
    color: method.color,
    samples: panelCounts.map((panels) => {
      const trace = buildIntegrationTrace(method, example, panels, { computeSensitivity: false });
      return {
        panels: trace.panelCount,
        absError: trace.absError,
      };
    }),
  }));
}

export function buildSurfaceIntegralTrace(
  method: SurfaceIntegrationMethodSpec,
  example: SurfaceIntegralExampleSpec,
  requestedResolution: number,
  options: { computeSensitivity?: boolean } = {},
): SurfaceIntegralTrace {
  const resolution = normalizeResolution(
    example.minResolution,
    example.maxResolution,
    requestedResolution,
  );
  const draft = method.buildTrace(example, resolution);
  const numericValue =
    draft.numericValue ?? draft.cells.reduce((sum, cell) => sum + cell.contribution, 0);
  const values = draft.cells.map((cell) => cell.value);
  const minValue = values.length > 0 ? Math.min(...values) : 0;
  const maxValue = values.length > 0 ? Math.max(...values) : 1;
  const error = numericValue - example.exactValue;
  const sensitivity =
    options.computeSensitivity === false
      ? 0
      : buildSurfaceSensitivity(method, example, resolution, numericValue);

  return {
    cells: draft.cells,
    numericValue,
    exactValue: example.exactValue,
    error,
    absError: Math.abs(error),
    resolution,
    valueRange: [minValue, maxValue],
    sampleCount:
      draft.sampleCount ??
      draft.cells.reduce((sum, cell) => sum + cell.sampleCount, 0),
    sensitivity,
    metadata: {
      methodId: method.id,
      methodName: method.name,
      exampleId: example.id,
      exampleName: example.name,
      formula: example.formula,
    },
  };
}

export function buildVolumeIntegralTrace(
  method: VolumeIntegrationMethodSpec,
  example: VolumeIntegralExampleSpec,
  requestedResolution: number,
  options: { computeSensitivity?: boolean } = {},
): VolumeIntegralTrace {
  const resolution = normalizeResolution(
    example.minResolution,
    example.maxResolution,
    requestedResolution,
  );
  const draft = method.buildTrace(example, resolution);
  const numericValue =
    draft.numericValue ?? draft.voxels.reduce((sum, voxel) => sum + voxel.contribution, 0);
  const values = draft.voxels.map((voxel) => voxel.value);
  const minValue = values.length > 0 ? Math.min(...values) : 0;
  const maxValue = values.length > 0 ? Math.max(...values) : 1;
  const error = numericValue - example.exactValue;
  const sensitivity =
    options.computeSensitivity === false
      ? 0
      : buildVolumeSensitivity(method, example, resolution, numericValue);

  return {
    voxels: draft.voxels,
    numericValue,
    exactValue: example.exactValue,
    error,
    absError: Math.abs(error),
    resolution,
    valueRange: [minValue, maxValue],
    sampleCount:
      draft.sampleCount ??
      draft.voxels.reduce((sum, voxel) => sum + voxel.sampleCount, 0),
    sensitivity,
    metadata: {
      methodId: method.id,
      methodName: method.name,
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
  const candidates = [4, 6, 8, 10, 12, 16, 20, 24, 28, 32].filter(
    (value) => value >= minResolution && value <= maxResolution,
  );
  return candidates.map((resolution) => builder(resolution));
}

export function normalizePanelCount(
  method: IntegrationMethodSpec,
  example: IntegrationExampleSpec,
  requestedPanels: number,
) {
  let panels = Math.round(requestedPanels);
  panels = Math.max(example.minPanels, Math.min(example.maxPanels, panels));

  if (method.prefersPowerOfTwoPanels) {
    panels = nearestSupportedPowerOfTwo(panels, example.minPanels, example.maxPanels);
  }

  if (method.requiresEvenPanels && panels % 2 !== 0) {
    panels += panels >= example.maxPanels ? -1 : 1;
  }

  return Math.max(example.minPanels, Math.min(example.maxPanels, panels));
}

export function exactPanelArea(example: IntegrationExampleSpec, x0: number, x1: number) {
  return adaptiveSimpson(example.fn, x0, x1, 1e-9, 12);
}

export function sampleCurve(
  example: IntegrationExampleSpec,
  samples = 360,
): IntegrationCurveSample[] {
  return Array.from({ length: samples }, (_, index) => {
    const x = example.a + ((example.b - example.a) * index) / (samples - 1);
    return { x, y: example.fn(x) };
  });
}

export function buildLeftPanels(
  example: IntegrationExampleSpec,
  panels: number,
): IntegrationPanelTrace[] {
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
      sampleCount: 1,
    };
  });
}

export function buildMidpointPanels(
  example: IntegrationExampleSpec,
  panels: number,
): IntegrationPanelTrace[] {
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
      sampleCount: 1,
    };
  });
}

export function buildTrapezoidPanels(
  example: IntegrationExampleSpec,
  panels: number,
): IntegrationPanelTrace[] {
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
      sampleCount: 2,
    };
  });
}

export function buildSimpsonPanels(
  example: IntegrationExampleSpec,
  panels: number,
): IntegrationPanelTrace[] {
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
      sampleCount: 3,
    };
  });
}

export function buildGaussPanels(
  example: IntegrationExampleSpec,
  panels: number,
): IntegrationPanelTrace[] {
  const h = (example.b - example.a) / panels;
  const offset = 1 / Math.sqrt(3);
  return Array.from({ length: panels }, (_, index) => {
    const x0 = example.a + index * h;
    const x1 = x0 + h;
    const mid = (x0 + x1) / 2;
    const half = h / 2;
    const xA = mid - offset * half;
    const xB = mid + offset * half;
    const yA = example.fn(xA);
    const yB = example.fn(xB);
    const sampleY = (yA + yB) / 2;
    const area = half * (yA + yB);
    const exactArea = exactPanelArea(example, x0, x1);
    return {
      index,
      x0,
      x1,
      sampleX: mid,
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
      nodes: [
        [xA, yA],
        [xB, yB],
      ],
      sampleCount: 2,
    };
  });
}

export function buildAdaptiveSimpsonDraft(
  example: IntegrationExampleSpec,
  requestedPanels: number,
): IntegrationTraceDraft {
  const targetLeaves = Math.max(2, Math.floor(requestedPanels / 2));
  let leaves = [makeAdaptiveLeaf(example, example.a, example.b)];

  while (leaves.length < targetLeaves) {
    let bestIndex = 0;
    let bestError = -Infinity;

    leaves.forEach((leaf, index) => {
      if (leaf.errorEstimate > bestError) {
        bestError = leaf.errorEstimate;
        bestIndex = index;
      }
    });

    const leaf = leaves[bestIndex];
    if (!leaf || leaf.depth >= 12 || leaf.b - leaf.a < 1e-6) break;
    leaves.splice(bestIndex, 1, ...splitAdaptiveLeaf(example, leaf));
  }

  leaves.sort((left, right) => left.a - right.a);
  const panels = leaves.map((leaf, index) => adaptiveLeafToPanel(example, leaf, index));
  return {
    panels,
    numericValue: leaves.reduce((sum, leaf) => sum + leaf.area, 0),
    sampleCount: panels.reduce((sum, panel) => sum + (panel.sampleCount ?? panel.nodes.length), 0),
  };
}

export function buildRombergDraft(
  example: IntegrationExampleSpec,
  requestedPanels: number,
): IntegrationTraceDraft {
  const finestPanels = nearestSupportedPowerOfTwo(requestedPanels, 4, Math.max(4, requestedPanels));
  const levels = Math.max(1, Math.min(6, Math.round(Math.log2(finestPanels))));
  const table: number[][] = [];

  for (let level = 0; level <= levels; level += 1) {
    const panels = 2 ** level;
    const h = (example.b - example.a) / panels;
    let trap = 0.5 * (example.fn(example.a) + example.fn(example.b));

    for (let index = 1; index < panels; index += 1) {
      trap += example.fn(example.a + index * h);
    }

    table[level] = [];
    table[level][0] = trap * h;

    for (let column = 1; column <= level; column += 1) {
      const factor = 4 ** column;
      table[level][column] =
        table[level][column - 1] +
        (table[level][column - 1] - table[level - 1][column - 1]) / (factor - 1);
    }
  }

  const panels = buildTrapezoidPanels(example, 2 ** levels);
  const progress = table.map((row, index) => {
    const numeric = row[index];
    return {
      index,
      t: index / Math.max(levels, 1),
      numeric,
      exact: example.exactValue,
      error: numeric - example.exactValue,
      label: `R(${index},${index})`,
    };
  });

  return {
    panels,
    progress,
    numericValue: table[levels][levels],
    panelCount: 2 ** levels,
    sampleCount: 2 ** levels + 1,
  };
}

export function buildMonteCarloDraft(
  example: IntegrationExampleSpec,
  requestedPanels: number,
): IntegrationTraceDraft {
  const interval = example.b - example.a;
  const sampleCount = Math.max(24, requestedPanels * 18);
  const random = createDeterministicRandom(hashSeed(`${example.id}:${requestedPanels}:monte-carlo`));
  const samples: IntegrationSampleTrace[] = [];
  const progress: IntegrationProgressSample[] = [];
  let sum = 0;
  let sumSquares = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const x = example.a + random() * interval;
    const y = example.fn(x);
    sum += y;
    sumSquares += y * y;
    const estimate = (sum / (index + 1)) * interval;
    const meanSquare = sumSquares / (index + 1);
    const variance = Math.max(0, meanSquare - (sum / (index + 1)) ** 2);
    const stdError = (Math.sqrt(variance) / Math.sqrt(index + 1)) * interval;

    samples.push({
      index,
      x,
      y,
      exactY: y,
      weight: interval / sampleCount,
      contribution: y * interval / sampleCount,
      role: "monte-carlo",
    });
    progress.push({
      index,
      t: (index + 1) / sampleCount,
      numeric: estimate,
      exact: example.exactValue,
      error: estimate - example.exactValue,
      label: `N=${index + 1}`,
    });
  }

  const mean = sum / sampleCount;
  const meanSquare = sumSquares / sampleCount;
  const variance = Math.max(0, meanSquare - mean * mean);
  return {
    panels: [],
    samples,
    progress,
    numericValue: mean * interval,
    sampleCount,
    estimatorStdError: (Math.sqrt(variance) / Math.sqrt(sampleCount)) * interval,
  };
}

export function buildImportanceMonteCarloDraft(
  example: IntegrationExampleSpec,
  requestedPanels: number,
): IntegrationTraceDraft {
  const interval = example.b - example.a;
  const sampleCount = Math.max(24, requestedPanels * 18);
  const random = createDeterministicRandom(hashSeed(`${example.id}:${requestedPanels}:importance-monte-carlo`));
  const samples: IntegrationSampleTrace[] = [];
  const progress: IntegrationProgressSample[] = [];
  let sum = 0;
  let sumSquares = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const u = random();
    const warped = u * u;
    const x = example.a + interval * warped;
    const density = 1 / Math.max(2 * Math.sqrt(Math.max(warped, 1e-9)), 1e-9);
    const weight = interval / Math.max(density * sampleCount, 1e-9);
    const y = example.fn(x);
    const contribution = y * weight;
    sum += contribution;
    sumSquares += contribution * contribution;
    const estimate = sum;
    const meanSquare = sumSquares / (index + 1);
    const meanContribution = estimate / Math.max(index + 1, 1);
    const variance = Math.max(0, meanSquare - meanContribution * meanContribution);
    const stdError = Math.sqrt(variance * (index + 1));

    samples.push({
      index,
      x,
      y,
      exactY: y,
      weight,
      contribution,
      role: "monte-carlo",
    });
    progress.push({
      index,
      t: (index + 1) / sampleCount,
      numeric: estimate,
      exact: example.exactValue,
      error: estimate - example.exactValue,
      label: `N=${index + 1}`,
    });
  }

  const contributionMean = sum / Math.max(sampleCount, 1);
  const contributionMeanSquare = sumSquares / Math.max(sampleCount, 1);
  const estimatorVariance = Math.max(0, contributionMeanSquare - contributionMean * contributionMean);

  return {
    panels: [],
    samples,
    progress,
    numericValue: sum,
    sampleCount,
    estimatorStdError: Math.sqrt(estimatorVariance * sampleCount),
  };
}

export function buildClenshawCurtisDraft(
  example: IntegrationExampleSpec,
  requestedPanels: number,
): IntegrationTraceDraft {
  const nodes = Math.max(4, requestedPanels);
  const half = (example.b - example.a) / 2;
  const center = (example.a + example.b) / 2;
  const dTheta = Math.PI / nodes;
  const samples: IntegrationSampleTrace[] = [];
  const progress: IntegrationProgressSample[] = [];
  const xNodes: Array<[number, number]> = [];
  let numericValue = 0;

  for (let index = 0; index <= nodes; index += 1) {
    const theta = index * dTheta;
    const x = center + half * Math.cos(theta);
    const y = example.fn(x);
    const thetaWeight = index === 0 || index === nodes ? 0.5 : 1;
    const contribution = half * thetaWeight * dTheta * Math.sin(theta) * y;
    numericValue += contribution;
    samples.push({
      index,
      x,
      y,
      exactY: y,
      weight: half * thetaWeight * dTheta * Math.sin(theta),
      contribution,
      role: "gauss",
    });
    progress.push({
      index,
      t: index / nodes,
      numeric: numericValue,
      exact: example.exactValue,
      error: numericValue - example.exactValue,
      label: `theta ${index}`,
    });
    xNodes.push([x, y]);
  }

  xNodes.sort((left, right) => left[0] - right[0]);
  const panels: IntegrationPanelTrace[] = xNodes.slice(0, -1).map(([x0, y0], index) => {
    const [x1, y1] = xNodes[index + 1]!;
    const exactArea = exactPanelArea(example, x0, x1);
    const approxArea = ((y0 + y1) * (x1 - x0)) / 2;
    return {
      index,
      x0,
      x1,
      sampleX: (x0 + x1) / 2,
      sampleY: (y0 + y1) / 2,
      area: approxArea,
      exactArea,
      error: approxArea - exactArea,
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
      sampleCount: 2,
    };
  });

  return {
    panels,
    samples,
    progress,
    numericValue,
    sampleCount: samples.length,
  };
}

export function buildMidpointSurfaceTraceDraft(
  example: SurfaceIntegralExampleSpec,
  resolution: number,
): SurfaceIntegralTraceDraft {
  return buildSurfaceFromSampler(example, resolution, ({ x0, x1, y0, y1, fn }) => {
    const sampleX = (x0 + x1) / 2;
    const sampleY = (y0 + y1) / 2;
    return {
      value: fn(sampleX, sampleY),
      sample: [sampleX, sampleY],
      samplePoints: [[sampleX, sampleY]],
    };
  });
}

export function buildCornerAverageSurfaceTraceDraft(
  example: SurfaceIntegralExampleSpec,
  resolution: number,
): SurfaceIntegralTraceDraft {
  return buildSurfaceFromSampler(example, resolution, ({ x0, x1, y0, y1, fn }) => {
    const corners: Array<[number, number]> = [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ];
    const value =
      corners.reduce((sum, [x, y]) => sum + fn(x, y), 0) / corners.length;
    return {
      value,
      sample: [(x0 + x1) / 2, (y0 + y1) / 2],
      samplePoints: corners,
    };
  });
}

export function buildTensorGaussSurfaceTraceDraft(
  example: SurfaceIntegralExampleSpec,
  resolution: number,
): SurfaceIntegralTraceDraft {
  const offset = 1 / Math.sqrt(3);
  return buildSurfaceFromSampler(example, resolution, ({ x0, x1, y0, y1, fn }) => {
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    const hx = (x1 - x0) / 2;
    const hy = (y1 - y0) / 2;
    const samplePoints: Array<[number, number]> = [
      [mx - offset * hx, my - offset * hy],
      [mx + offset * hx, my - offset * hy],
      [mx + offset * hx, my + offset * hy],
      [mx - offset * hx, my + offset * hy],
    ];
    const value =
      samplePoints.reduce((sum, [x, y]) => sum + fn(x, y), 0) / samplePoints.length;
    return {
      value,
      sample: [mx, my],
      samplePoints,
    };
  });
}

export function buildMidpointVolumeTraceDraft(
  example: VolumeIntegralExampleSpec,
  resolution: number,
): VolumeIntegralTraceDraft {
  return buildVolumeFromSampler(example, resolution, ({ x0, x1, y0, y1, height }) => {
    const x = (x0 + x1) / 2;
    const y = (y0 + y1) / 2;
    return {
      value: Math.max(0, height(x, y)),
      samplePoints: [[x, y]],
    };
  });
}

export function buildCornerAverageVolumeTraceDraft(
  example: VolumeIntegralExampleSpec,
  resolution: number,
): VolumeIntegralTraceDraft {
  return buildVolumeFromSampler(example, resolution, ({ x0, x1, y0, y1, height }) => {
    const samplePoints: Array<[number, number]> = [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ];
    const value =
      samplePoints.reduce((sum, [x, y]) => sum + Math.max(0, height(x, y)), 0) /
      samplePoints.length;
    return { value, samplePoints };
  });
}

export function buildTensorGaussVolumeTraceDraft(
  example: VolumeIntegralExampleSpec,
  resolution: number,
): VolumeIntegralTraceDraft {
  const offset = 1 / Math.sqrt(3);
  return buildVolumeFromSampler(example, resolution, ({ x0, x1, y0, y1, height }) => {
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    const hx = (x1 - x0) / 2;
    const hy = (y1 - y0) / 2;
    const samplePoints: Array<[number, number]> = [
      [mx - offset * hx, my - offset * hy],
      [mx + offset * hx, my - offset * hy],
      [mx + offset * hx, my + offset * hy],
      [mx - offset * hx, my + offset * hy],
    ];
    const value =
      samplePoints.reduce((sum, [x, y]) => sum + Math.max(0, height(x, y)), 0) /
      samplePoints.length;
    return { value, samplePoints };
  });
}

function buildSurfaceFromSampler(
  example: SurfaceIntegralExampleSpec,
  resolution: number,
  sampler: (cell: {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
    fn: SurfaceIntegralExampleSpec["fn"];
  }) => {
    value: number;
    sample: [number, number];
    samplePoints: Array<[number, number]>;
  },
): SurfaceIntegralTraceDraft {
  const [xMin, xMax] = example.xRange;
  const [yMin, yMax] = example.yRange;
  const dx = (xMax - xMin) / resolution;
  const dy = (yMax - yMin) / resolution;
  const cells: SurfaceCellTrace[] = [];

  for (let iy = 0; iy < resolution; iy += 1) {
    for (let ix = 0; ix < resolution; ix += 1) {
      const x0 = xMin + ix * dx;
      const x1 = x0 + dx;
      const y0 = yMin + iy * dy;
      const y1 = y0 + dy;
      const result = sampler({ x0, x1, y0, y1, fn: example.fn });
      const area = dx * dy;
      const contribution = result.value * area;
      cells.push({
        index: cells.length,
        x0,
        x1,
        y0,
        y1,
        sample: [result.sample[0], result.sample[1], result.value],
        samplePoints: result.samplePoints.map(([x, y]) => [x, y, example.fn(x, y)]),
        value: result.value,
        area,
        contribution,
        corners: [
          [x0, y0, example.fn(x0, y0)],
          [x1, y0, example.fn(x1, y0)],
          [x1, y1, example.fn(x1, y1)],
          [x0, y1, example.fn(x0, y1)],
        ],
        sampleCount: result.samplePoints.length,
      });
    }
  }

  return {
    cells,
    numericValue: cells.reduce((sum, cell) => sum + cell.contribution, 0),
    sampleCount: cells.reduce((sum, cell) => sum + cell.sampleCount, 0),
  };
}

function buildVolumeFromSampler(
  example: VolumeIntegralExampleSpec,
  resolution: number,
  sampler: (cell: {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
    height: VolumeIntegralExampleSpec["height"];
  }) => {
    value: number;
    samplePoints: Array<[number, number]>;
  },
): VolumeIntegralTraceDraft {
  const [xMin, xMax] = example.xRange;
  const [yMin, yMax] = example.yRange;
  const dx = (xMax - xMin) / resolution;
  const dy = (yMax - yMin) / resolution;
  const area = dx * dy;
  const voxels: VoxelTrace[] = [];

  for (let iy = 0; iy < resolution; iy += 1) {
    for (let ix = 0; ix < resolution; ix += 1) {
      const x0 = xMin + ix * dx;
      const x1 = x0 + dx;
      const y0 = yMin + iy * dy;
      const y1 = y0 + dy;
      const result = sampler({ x0, x1, y0, y1, height: example.height });
      const value = Math.max(0, result.value);
      const contribution = value * area;
      const centerX = (x0 + x1) / 2;
      const centerY = (y0 + y1) / 2;
      voxels.push({
        index: voxels.length,
        center: [centerX, centerY, value / 2],
        size: [dx, dy, value],
        value,
        contribution,
        samplePoints: result.samplePoints.map(([x, y]) => [x, y, Math.max(0, example.height(x, y))]),
        sampleCount: result.samplePoints.length,
      });
    }
  }

  return {
    voxels,
    numericValue: voxels.reduce((sum, voxel) => sum + voxel.contribution, 0),
    sampleCount: voxels.reduce((sum, voxel) => sum + voxel.sampleCount, 0),
  };
}

function collectPanelSamples(panels: IntegrationPanelTrace[]): IntegrationSampleTrace[] {
  const samples: IntegrationSampleTrace[] = [];

  panels.forEach((panel, panelIndex) => {
    const weight = (panel.x1 - panel.x0) / Math.max(panel.nodes.length, 1);
    panel.nodes.forEach(([x, y], nodeIndex) => {
      samples.push({
        index: samples.length,
        x,
        y,
        exactY: y,
        weight,
        contribution: y * weight,
        role: panel.nodes.length === 1 ? "node" : panel.nodes.length === 2 ? "gauss" : "adaptive",
      });
    });

    if (panel.nodes.length === 0) {
      samples.push({
        index: samples.length,
        x: panel.sampleX,
        y: panel.sampleY,
        exactY: panel.sampleY,
        weight: panel.x1 - panel.x0,
        contribution: panel.area,
        role: "node",
      });
    }

    samples[samples.length - 1]!.index = samples.length - 1 + panelIndex * 0 + nodeIndexHack();
  });

  return samples.map((sample, index) => ({ ...sample, index }));
}

function nodeIndexHack() {
  return 0;
}

function buildPanelProgress(
  example: IntegrationExampleSpec,
  panels: IntegrationPanelTrace[],
): IntegrationProgressSample[] {
  const progress: IntegrationProgressSample[] = [];
  let numeric = 0;
  let exact = 0;

  panels.forEach((panel, index) => {
    numeric += panel.area;
    exact += panel.exactArea;
    progress.push({
      index,
      t: (panel.x1 - example.a) / Math.max(example.b - example.a, 1e-9),
      numeric,
      exact,
      error: numeric - exact,
      label: `x=${panel.x1.toFixed(3)}`,
    });
  });

  return progress;
}

function buildSensitivity(
  method: IntegrationMethodSpec,
  example: IntegrationExampleSpec,
  panelCount: number,
  numericValue: number,
): number {
  const nextPanels = Math.min(
    example.maxPanels,
    method.prefersPowerOfTwoPanels ? panelCount * 2 : panelCount + 1,
  );

  if (nextPanels === panelCount) return 0;

  const nextTrace = buildIntegrationTrace(method, example, nextPanels, {
    computeSensitivity: false,
  });
  return Math.abs(nextTrace.numericValue - numericValue);
}

function buildSurfaceSensitivity(
  method: SurfaceIntegrationMethodSpec,
  example: SurfaceIntegralExampleSpec,
  resolution: number,
  numericValue: number,
): number {
  const nextResolution = Math.min(example.maxResolution, resolution + 1);
  if (nextResolution === resolution) return 0;
  const nextTrace = buildSurfaceIntegralTrace(method, example, nextResolution, {
    computeSensitivity: false,
  });
  return Math.abs(nextTrace.numericValue - numericValue);
}

function buildVolumeSensitivity(
  method: VolumeIntegrationMethodSpec,
  example: VolumeIntegralExampleSpec,
  resolution: number,
  numericValue: number,
): number {
  const nextResolution = Math.min(example.maxResolution, resolution + 1);
  if (nextResolution === resolution) return 0;
  const nextTrace = buildVolumeIntegralTrace(method, example, nextResolution, {
    computeSensitivity: false,
  });
  return Math.abs(nextTrace.numericValue - numericValue);
}

type AdaptiveLeaf = {
  a: number;
  b: number;
  area: number;
  errorEstimate: number;
  y0: number;
  ym: number;
  y1: number;
  depth: number;
};

function makeAdaptiveLeaf(
  example: IntegrationExampleSpec,
  a: number,
  b: number,
  depth = 0,
): AdaptiveLeaf {
  const m = (a + b) / 2;
  const y0 = example.fn(a);
  const ym = example.fn(m);
  const y1 = example.fn(b);
  const whole = ((b - a) / 6) * (y0 + 4 * ym + y1);
  const left = simpson(example.fn, a, m);
  const right = simpson(example.fn, m, b);
  const delta = left + right - whole;

  return {
    a,
    b,
    area: left + right + delta / 15,
    errorEstimate: Math.abs(delta) / 15,
    y0,
    ym,
    y1,
    depth,
  };
}

function splitAdaptiveLeaf(
  example: IntegrationExampleSpec,
  leaf: AdaptiveLeaf,
): [AdaptiveLeaf, AdaptiveLeaf] {
  const mid = (leaf.a + leaf.b) / 2;
  return [
    makeAdaptiveLeaf(example, leaf.a, mid, leaf.depth + 1),
    makeAdaptiveLeaf(example, mid, leaf.b, leaf.depth + 1),
  ];
}

function adaptiveLeafToPanel(
  example: IntegrationExampleSpec,
  leaf: AdaptiveLeaf,
  index: number,
): IntegrationPanelTrace {
  const exactArea = exactPanelArea(example, leaf.a, leaf.b);
  const xm = (leaf.a + leaf.b) / 2;
  return {
    index,
    x0: leaf.a,
    x1: leaf.b,
    sampleX: xm,
    sampleY: leaf.ym,
    area: leaf.area,
    exactArea,
    error: leaf.area - exactArea,
    polygon: [
      [leaf.a, 0],
      [leaf.a, leaf.y0],
      [xm, leaf.ym],
      [leaf.b, leaf.y1],
      [leaf.b, 0],
    ],
    nodes: [
      [leaf.a, leaf.y0],
      [xm, leaf.ym],
      [leaf.b, leaf.y1],
    ],
    sampleCount: 3,
  };
}

function nearestSupportedPowerOfTwo(value: number, min: number, max: number) {
  let power = 1;
  while (power * 2 <= value) power *= 2;
  power = Math.max(power, 2);
  return Math.max(min, Math.min(max, power));
}

function normalizeResolution(
  minResolution: number,
  maxResolution: number,
  requestedResolution: number,
) {
  return Math.max(
    minResolution,
    Math.min(maxResolution, Math.round(requestedResolution)),
  );
}

function adaptiveSimpson(
  fn: IntegrationFunction,
  a: number,
  b: number,
  epsilon: number,
  depth: number,
): number {
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

function hashSeed(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createDeterministicRandom(seed: number) {
  let state = seed || 1;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}
