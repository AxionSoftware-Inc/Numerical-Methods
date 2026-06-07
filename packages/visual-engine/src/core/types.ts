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
  | "critical";

export type LayerSpec = {
  field: boolean;
  stages: boolean;
  comparison: boolean;
  errors: boolean;
  stability: boolean;
  jacobian: boolean;
  localError: boolean;
  critical: boolean;
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
  gridMajor: string;
  gridMinor: string;
};
