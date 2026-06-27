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
export type OperatorApplicationProfile = {
  id: "ai-ml" | "scientific-computing" | "finance-risk" | "simulation-control" | "signal-approximation";
  label: string;
  summary: string;
};

export type OperatorWorkbenchReadiness = "prototype" | "partial" | "ready";

export type OperatorWorkbenchCapability = {
  traceScene: boolean;
  comparison: boolean;
  benchmark: boolean;
  customMethod: boolean;
  composition: boolean;
  centralVisual: boolean;
  readiness: OperatorWorkbenchReadiness;
  nextFocus?: string;
};

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
  applications?: readonly OperatorApplicationProfile[];
  notes?: string;
  workbench?: OperatorWorkbenchCapability;
};

export type OperatorRegistry = {
  families: readonly OperatorFamilySpec[];
  familiesById: Record<OperatorFamilyId, OperatorFamilySpec>;
};

export type OperatorCompositionMode = "pipeline" | "fused" | "comparison";

export type OperatorCompositionNodeRole = "source" | "transform" | "analyzer" | "sink";

export type OperatorCompositionChannel =
  | "state"
  | "residual"
  | "spectrum"
  | "samples"
  | "geometry"
  | "control"
  | "diagnostic";

export type OperatorCompositionNodeSpec = {
  id: string;
  familyId: OperatorFamilyId;
  familyName: string;
  schemeId: string;
  schemeName: string;
  visualGrammar: OperatorGrammarId;
  color: string;
  formula: string;
  role: OperatorCompositionNodeRole;
  summary?: string;
};

export type OperatorCompositionEdgeSpec = {
  id: string;
  from: string;
  to: string;
  channel: OperatorCompositionChannel;
  label?: string;
};

export type OperatorCompositionMetricSpec = {
  id: string;
  label: string;
  value: number;
  unit?: string;
  emphasis?: "higher-better" | "lower-better" | "neutral";
  summary?: string;
};

export type OperatorCompositionComparisonSpec = {
  baselineNodeId: string;
  candidateNodeId: string;
  label: string;
  summary?: string;
  metrics?: readonly OperatorCompositionMetricSpec[];
};

export type OperatorCompositionSpec = {
  id: string;
  name: string;
  mode: OperatorCompositionMode;
  summary: string;
  visualGrammar: OperatorGrammarId;
  operators: readonly OperatorCompositionNodeSpec[];
  connections: readonly OperatorCompositionEdgeSpec[];
  focusFamilyId?: OperatorFamilyId;
  comparisons?: readonly OperatorCompositionComparisonSpec[];
};

export type OperatorCompositionValidation = {
  valid: boolean;
  issues: string[];
  warnings: string[];
  operatorCount: number;
  connectionCount: number;
  familyIds: OperatorFamilyId[];
  grammars: OperatorGrammarId[];
  isCrossFamily: boolean;
};

export type OperatorWorkbenchFamilyStatus = {
  familyId: OperatorFamilyId;
  familyName: string;
  readiness: OperatorWorkbenchReadiness;
  traceScene: boolean;
  comparison: boolean;
  benchmark: boolean;
  customMethod: boolean;
  composition: boolean;
  centralVisual: boolean;
  nextFocus?: string;
};

export type OperatorWorkbenchPreviewMode = "overlay" | "split" | "graph-only";

export type OperatorWorkbenchCompatibilityKind = "compatible" | "comparable" | "incompatible";

export type OperatorWorkbenchCompatibility = {
  kind: OperatorWorkbenchCompatibilityKind;
  previewMode: OperatorWorkbenchPreviewMode;
  reason: string;
  warnings: string[];
  sharedFamily: boolean;
  sharedGrammar: boolean;
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
  sampler: "euler" | "milstein" | "exact-transition" | "antithetic-transition";
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
  strongErrorEstimate: number;
  weakErrorEstimate: number;
  pathwiseQuantile95Error: number;
  terminalSkewness: number;
  terminalExcessKurtosis: number;
  tailBalance: number;
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
  epsilon?: number;
  customUpdate?: (context: {
    x: number;
    y: number;
    gx: number;
    gy: number;
    vx: number;
    vy: number;
    eta: number;
    beta: number;
    stepScale: number;
  }) => [number, number];
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
  oscillationCount: number;
  monotoneIncreaseCount: number;
  averageGradientAlignment: number;
  averageConditionNumber: number;
  finalConditionNumber: number;
  negativeCurvatureSteps: number;
  largestAcceptedStep: number;
  metadata: {
    methodId: string;
    methodName: string;
    exampleId: string;
    exampleName: string;
  };
};

export type MatrixMethodId = string;
export type MatrixExampleId = string;
export type MatrixMethodMode = "linear-system" | "eigen";

export type MatrixMethodSpec = {
  id: MatrixMethodId;
  name: string;
  formula: string;
  color: string;
  order: string;
  stability: string;
  geometry: string;
  mode: MatrixMethodMode;
  relaxation?: number;
  family?: "stationary" | "krylov" | "eigen" | "least-squares" | "factorization";
};

export type MatrixExampleSpec = {
  id: MatrixExampleId;
  name: string;
  shortName: string;
  matrix: [[number, number], [number, number]];
  rhs: [number, number];
  initial: [number, number];
  sourceMatrix?: Array<[number, number]>;
  observations?: number[];
  sourceLabel?: string;
  exactSolution: [number, number];
  dominantEigenvector: [number, number];
  dominantEigenvalue: number;
  smallestEigenvector: [number, number];
  smallestEigenvalue: number;
  defaultIterations: number;
  minIterations: number;
  maxIterations: number;
  interpretation: string;
  tags?: string[];
};

export type MatrixStepTrace = {
  index: number;
  vector: [number, number];
  residualVector: [number, number];
  residual: number;
  error: number;
  stepNorm: number;
  spectralEstimate: number;
  angleToTarget: number;
  contraction: number;
  turnAngle: number;
  rayleighDrift: number;
};

export type MatrixTrace = {
  steps: MatrixStepTrace[];
  matrix: [[number, number], [number, number]];
  rhs: [number, number];
  sourceMatrix?: Array<[number, number]>;
  observations?: number[];
  transformedBasis: [[number, number], [number, number]];
  exactSolution: [number, number];
  targetVector: [number, number];
  dominantEigenvalue: number;
  smallestEigenvalue: number;
  spectralRadius: number;
  conditionNumber: number;
  iterations: number;
  mode: MatrixMethodMode;
  targetLabel: string;
  iterationRadius: number;
  eigenGap: number;
  initialResidual: number;
  improvementFactor: number;
  averageContraction: number;
  turnCount: number;
  residualAxisSkew: number;
  rayleighDrift: number;
  finalRayleighError: number;
  convergenceKind: "converging" | "stalling" | "diverging" | "oscillating";
  convergenceReason: string;
  diagonalDominance: number;
  isSpd: boolean;
  problemKind: "square-system" | "least-squares" | "covariance";
  fitResidual: number;
  metadata: {
    methodId: string;
    methodName: string;
    exampleId: string;
    exampleName: string;
  };
};

export type RootFindingMethodId = string;
export type RootFindingExampleId = string;

export type RootFindingMethodSpec = {
  id: RootFindingMethodId;
  name: string;
  formula: string;
  color: string;
  order: string;
  stability: string;
  geometry: string;
  requiresDerivative?: boolean;
  usesBracket?: boolean;
  damping?: number;
  customStep?: (context: {
    x: number;
    fx: number;
    dfx: number;
    xPrev: number;
    fPrev: number;
    a: number;
    b: number;
    fa: number;
    fb: number;
    mid: number;
  }) => number;
};

export type RootFindingExampleSpec = {
  id: RootFindingExampleId;
  name: string;
  shortName: string;
  equation: string;
  xRange: [number, number];
  initialBracket: [number, number];
  initialPair: [number, number];
  newtonStart: number;
  exactRoot: number;
  defaultIterations: number;
  minIterations: number;
  maxIterations: number;
  evaluate: (x: number) => number;
  derivative: (x: number) => number;
  interpretation: string;
};

export type RootFindingLineTrace = {
  from: [number, number];
  to: [number, number];
  kind: "secant" | "tangent" | "bracket";
};

export type RootFindingStepTrace = {
  index: number;
  x: number;
  fx: number;
  error: number;
  stepSize: number;
  bracket: [number, number];
  line?: RootFindingLineTrace;
  intervalWidth: number;
};

export type RootFindingTrace = {
  steps: RootFindingStepTrace[];
  initialResidual: number;
  finalResidual: number;
  finalError: number;
  finalIntervalWidth: number;
  iterations: number;
  residualReduction: number;
  averageContraction: number;
  bracketRetentionRate: number;
  derivativeStress: number;
  oscillationCount: number;
  stagnationCount: number;
  metadata: {
    methodId: string;
    methodName: string;
    exampleId: string;
    exampleName: string;
  };
};

export type InterpolationMethodId = string;
export type InterpolationExampleId = string;

export type InterpolationMethodSpec = {
  id: InterpolationMethodId;
  name: string;
  formula: string;
  color: string;
  order: string;
  stability: string;
  geometry: string;
  support: "global" | "local";
  nodeLayout?: "uniform" | "chebyshev";
  nodeBias?: number;
};

export type InterpolationExampleSpec = {
  id: InterpolationExampleId;
  name: string;
  shortName: string;
  formula: string;
  xRange: [number, number];
  yRange: [number, number];
  defaultNodes: number;
  minNodes: number;
  maxNodes: number;
  evaluate: (x: number) => number;
  interpretation: string;
};

export type InterpolationNode = {
  index: number;
  x: number;
  y: number;
};

export type InterpolationSample = {
  x: number;
  exact: number;
  estimate: number;
  error: number;
};

export type InterpolationTrace = {
  nodes: InterpolationNode[];
  samples: InterpolationSample[];
  maxAbsError: number;
  rmsError: number;
  roughness: number;
  edgeMaxError: number;
  centerMaxError: number;
  totalVariationRatio: number;
  overshootArea: number;
  signChangeCount: number;
  nodeCount: number;
  nodeLayout: "uniform" | "chebyshev";
  metadata: {
    methodId: string;
    methodName: string;
    exampleId: string;
    exampleName: string;
  };
};
