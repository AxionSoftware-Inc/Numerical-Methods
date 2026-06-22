export type Point = [number, number, number];
export type MethodId = string;
export type ExampleId = string;

export type VectorField = (point: Point, t: number) => Point;

export type StageTrace = {
  label: string;
  sample: Point;
  vectorEnd: Point;
  color: string;
};

export type StepTrace = {
  index: number;
  tStart: number;
  tEnd: number;
  h: number;
  start: Point;
  end: Point;
  exactEnd: Point;
  stages: StageTrace[];
};

export type StageLayerTrace = StageTrace & {
  stepIndex: number;
  tStart: number;
  tEnd: number;
};

export type TraceError = {
  index: number;
  t: number;
  exact: Point;
  numeric: Point;
  magnitude: number;
};

export type TraceMetrics = {
  finalError: number;
  maxError: number;
  metricLabel: string;
  metricValue: number;
};

export type StabilityRegionTrace = {
  points: Point[];
  planeZ: number;
  radiusScale: number;
} | null;

export type JacobianDeformationTrace = {
  sourceLoop: Point[];
  mappedLoop: Point[];
  anchors: Array<[Point, Point]>;
} | null;

export type LocalErrorSurfaceTrace = {
  points: Point[];
  size: number;
  maxMagnitude: number;
} | null;

export type CriticalMarkerTrace = {
  label: string;
  point: Point;
  kind: "singularity" | "equilibrium" | "turning-point" | "stiff-zone" | "custom";
  severity: number;
  description?: string;
};

export type CriticalSearchSpec = {
  enabled: boolean;
  xRange: [number, number];
  yRange: [number, number];
  z: number;
  samples: number;
  threshold: number;
  zWeight?: number;
};

export type ProjectionSegmentTrace = {
  index: number;
  from: Point;
  to: Point;
  label: string;
  magnitude: number;
};

export type EnergySample = {
  index: number;
  t: number;
  value: number;
};

export type StabilitySample = {
  h: number;
  growth: number;
  stable: boolean;
};

export type StabilityScanTrace = {
  methodId: string;
  methodName: string;
  color: string;
  samples: StabilitySample[];
};

export type TraceMetadata = {
  methodId: string;
  methodName: string;
  exampleId: string;
  exampleName: string;
  step: number;
  stepCount: number;
};

export type TraceResult = {
  points: Point[];
  exactPath: Point[];
  exactAtStep: Point[];
  steps: StepTrace[];
  stages: StageLayerTrace[];
  errors: TraceError[];
  stabilityRegion: StabilityRegionTrace;
  jacobianDeformation: JacobianDeformationTrace;
  localErrorSurface: LocalErrorSurfaceTrace;
  criticalMarkers: CriticalMarkerTrace[];
  energySeries: EnergySample[];
  metrics: TraceMetrics;
  metadata: TraceMetadata;
};

export type ExampleSpec = {
  id: ExampleId;
  name: string;
  shortName: string;
  equation: string;
  initial: Point;
  endTime: number;
  defaultStep: number;
  minStep: number;
  maxStep: number;
  exact: (t: number) => Point;
  exactFlow?: (point: Point, t: number, h: number) => Point;
  field: VectorField;
  metricLabel: string;
  metric: (point: Point) => number;
  criticalMarkers?: CriticalMarkerTrace[];
  criticalSearch?: CriticalSearchSpec;
  interpretation: string;
  fieldScale: number;
  gridZ: number;
};

export type MethodComputation = {
  next: Point;
  stages: StageTrace[];
};

export type MethodSpec = {
  id: MethodId;
  name: string;
  formula: string;
  stability: string;
  stabilityPolynomial?: number[];
  color: string;
  geometry: string;
  computeStep: (point: Point, t: number, h: number, field: VectorField) => MethodComputation;
};

export type LayerId =
  | "field"
  | "stages"
  | "comparison"
  | "errors"
  | "stability"
  | "jacobian"
  | "localError"
  | "critical"
  | "projection";

export type LayerSpec = {
  field: boolean;
  stages: boolean;
  comparison: boolean;
  errors: boolean;
  stability: boolean;
  jacobian: boolean;
  localError: boolean;
  critical: boolean;
  projection: boolean;
  errorGain: number;
  stepIndex: number;
};

export type EngineStyle = {
  background: string;
  exact: string;
  error: string;
  field: string;
  stability: string;
  jacobianSource: string;
  jacobianMapped: string;
  localErrorLow: string;
  localErrorHigh: string;
  critical: string;
  projection: string;
  gridMajor: string;
  gridMinor: string;
};

export type PdeMethodId = string;
export type PdeExampleId = string;

export type PdeMethodSpec = {
  id: PdeMethodId;
  name: string;
  formula: string;
  order: string;
  color: string;
  stability: string;
  geometry: string;
  theta: number;
};

export type PdeExampleSpec = {
  id: PdeExampleId;
  name: string;
  shortName: string;
  equation: string;
  domain: [number, number];
  endTime: number;
  diffusivity: number;
  defaultCells: number;
  minCells: number;
  maxCells: number;
  defaultTimeSteps: number;
  minTimeSteps: number;
  maxTimeSteps: number;
  initial: (x: number) => number;
  exact: (x: number, t: number) => number;
  interpretation: string;
};

export type PdeFrame = {
  time: number;
  values: number[];
  exactValues: number[];
  maxError: number;
};

export type PdeErrorSample = {
  time: number;
  l2: number;
  linf: number;
};

export type PdeTrace = {
  xs: number[];
  frames: PdeFrame[];
  errors: PdeErrorSample[];
  cells: number;
  timeSteps: number;
  dt: number;
  dx: number;
  r: number;
  valueRange: [number, number];
  metadata: {
    methodId: string;
    methodName: string;
    exampleId: string;
    exampleName: string;
    theta: number;
  };
};

export type OperatorFamilyId =
  | "ode"
  | "integral"
  | "pde"
  | "matrix"
  | "root-finding"
  | "optimization"
  | "probability"
  | "interpolation";

export type OperatorGrammarId =
  | "trajectory-flow"
  | "partition-accumulation"
  | "field-mesh"
  | "transform-basis"
  | "convergence-path"
  | "landscape-descent"
  | "stochastic-path"
  | "curve-reconstruction";

export type OperatorFamilyStatus = "active" | "planned";
export type OperatorSchemeStatus = "implemented" | "planned";

export type OperatorSchemeSpec = {
  id: string;
  name: string;
  formula: string;
  color: string;
  geometry: string;
  status: OperatorSchemeStatus;
  order?: string;
  stability?: string;
};

export type OperatorFamilySpec = {
  id: OperatorFamilyId;
  name: string;
  summary: string;
  visualGrammar: OperatorGrammarId;
  status: OperatorFamilyStatus;
  schemes: readonly OperatorSchemeSpec[];
  exampleIds: readonly string[];
  notes?: string;
};

export type OperatorRegistry = {
  families: readonly OperatorFamilySpec[];
  familiesById: Record<OperatorFamilyId, OperatorFamilySpec>;
};

export type OperatorFamilyMatch = {
  family: OperatorFamilySpec;
  score: number;
  reasons: string[];
};

export type OperatorAnalysis = {
  input: string;
  normalizedInput: string;
  family: OperatorFamilySpec;
  score: number;
  confidence: number;
  reasons: string[];
  schemeHints: readonly OperatorSchemeSpec[];
  customSchemeName: string;
  customSchemeFormula: string;
};

export type CustomSchemeDraft = {
  familyId: OperatorFamilyId;
  familyName: string;
  schemeName: string;
  formula: string;
  visualGrammar: OperatorGrammarId;
  status: OperatorFamilyStatus;
};

export type ProbabilityMethodId = string;
export type ProbabilityExampleId = string;

export type ProbabilityMethodSpec = {
  id: ProbabilityMethodId;
  name: string;
  formula: string;
  color: string;
  order: string;
  stability: string;
  geometry: string;
  noiseCorrection: number;
  sampler: "euler" | "milstein" | "exact-transition";
};

export type ProbabilityExampleSpec = {
  id: ProbabilityExampleId;
  name: string;
  shortName: string;
  equation: string;
  initial: number;
  endTime: number;
  defaultSteps: number;
  minSteps: number;
  maxSteps: number;
  defaultPaths: number;
  minPaths: number;
  maxPaths: number;
  drift: number;
  volatility: number;
  meanReversion?: number;
  longRunMean?: number;
  payoffLevel: number;
  exactMean: (t: number, options: { initial: number; drift: number; volatility: number; meanReversion?: number; longRunMean?: number }) => number;
  exactVariance: (t: number, options: { initial: number; drift: number; volatility: number; meanReversion?: number; longRunMean?: number }) => number;
  interpretation: string;
};

export type ProbabilityPathSample = {
  index: number;
  t: number;
  value: number;
};

export type ProbabilityPathTrace = {
  id: number;
  color: string;
  samples: ProbabilityPathSample[];
  terminal: number;
  payoff: number;
};

export type ProbabilityMomentSample = {
  index: number;
  t: number;
  mean: number;
  variance: number;
  exactMean: number;
  exactVariance: number;
  standardError: number;
};

export type ProbabilityHistogramBin = {
  center: number;
  count: number;
  probability: number;
};

export type ProbabilityConvergenceSample = {
  paths: number;
  estimate: number;
  stderr: number;
  absError: number;
};

export type ProbabilityTrace = {
  paths: ProbabilityPathTrace[];
  moments: ProbabilityMomentSample[];
  histogram: ProbabilityHistogramBin[];
  convergence: ProbabilityConvergenceSample[];
  terminalMean: number;
  terminalVariance: number;
  exactTerminalMean: number;
  exactTerminalVariance: number;
  payoffEstimate: number;
  payoffStdError: number;
  confidenceInterval: [number, number];
  probabilityAbovePayoff: number;
  quantile05: number;
  quantile95: number;
  expectedShortfall05: number;
  meanAbsError: number;
  varianceAbsError: number;
  payoffLevel: number;
  dt: number;
  steps: number;
  pathCount: number;
  valueRange: [number, number];
  metadata: {
    methodId: string;
    methodName: string;
    exampleId: string;
    exampleName: string;
    drift: number;
    volatility: number;
    seed: number;
  };
};

export type OptimizationMethodId = string;
export type OptimizationExampleId = string;

export type OptimizationMethodSpec = {
  id: OptimizationMethodId;
  name: string;
  formula: string;
  color: string;
  order: string;
  stability: string;
  geometry: string;
  stepScale: number;
  momentum?: number;
};

export type OptimizationExampleSpec = {
  id: OptimizationExampleId;
  name: string;
  shortName: string;
  formula: string;
  initial: [number, number];
  optimum: [number, number];
  defaultStep: number;
  minStep: number;
  maxStep: number;
  defaultIterations: number;
  minIterations: number;
  maxIterations: number;
  xRange: [number, number];
  yRange: [number, number];
  value: (x: number, y: number) => number;
  gradient: (x: number, y: number) => [number, number];
  hessian: (x: number, y: number) => [[number, number], [number, number]];
  interpretation: string;
};

export type OptimizationStepTrace = {
  index: number;
  point: [number, number];
  value: number;
  gradient: [number, number];
  gradientNorm: number;
  step: [number, number];
  distanceToOptimum: number;
};

export type OptimizationTrace = {
  steps: OptimizationStepTrace[];
  finalValue: number;
  finalGradientNorm: number;
  finalDistance: number;
  minValue: number;
  maxValue: number;
  stepSize: number;
  iterations: number;
  metadata: {
    methodId: string;
    methodName: string;
    exampleId: string;
    exampleName: string;
  };
};
