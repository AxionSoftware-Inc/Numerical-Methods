import { addScaled, distance } from "./math";
import type {
  CriticalMarkerTrace,
  EngineStyle,
  ExampleSpec,
  JacobianDeformationTrace,
  LayerSpec,
  LocalErrorSurfaceTrace,
  MethodSpec,
  Point,
  StabilityRegionTrace,
  StepTrace,
} from "./types";

export const defaultLayerSpec: LayerSpec = {
  field: true,
  stages: true,
  comparison: true,
  errors: true,
  stability: true,
  jacobian: true,
  localError: true,
  critical: true,
  errorGain: 3,
  stepIndex: 0,
};

export const defaultEngineStyle: EngineStyle = {
  background: "#061316",
  exact: "#56b4e9",
  error: "#ff5a7a",
  field: "#9aa7b2",
  stability: "#00c2a8",
  jacobianSource: "#f2f4f8",
  jacobianMapped: "#f0b429",
  localErrorLow: "#277da1",
  localErrorHigh: "#ff5a5f",
  critical: "#f97316",
  gridMajor: "#31434b",
  gridMinor: "#17272d",
};

export function mergeLayerSpec(overrides: Partial<LayerSpec>): LayerSpec {
  return { ...defaultLayerSpec, ...overrides };
}

export function buildStabilityRegion(method: MethodSpec, example: ExampleSpec): StabilityRegionTrace {
  if (!method.stabilityPolynomial) return null;

  const points: Point[] = [];
  const samples = 150;
  const maxRadius = 4;
  const planeZ = example.gridZ + 3.25;
  const radiusScale = 0.34;

  for (let i = 0; i <= samples; i++) {
    const theta = (Math.PI * 2 * i) / samples;
    let low = 0;
    let high = maxRadius;
    for (let j = 0; j < 30; j++) {
      const radius = (low + high) / 2;
      const re = radius * Math.cos(theta);
      const im = radius * Math.sin(theta);
      const magnitude = complexPolynomialMagnitude(method.stabilityPolynomial, re, im);
      if (magnitude <= 1) low = radius;
      else high = radius;
    }
    points.push([low * Math.cos(theta) * radiusScale - 1.65, low * Math.sin(theta) * radiusScale + 1.45, planeZ]);
  }

  return { points, planeZ, radiusScale };
}

export function buildJacobianDeformation(method: MethodSpec, example: ExampleSpec, step: StepTrace | undefined): JacobianDeformationTrace {
  if (!step) return null;

  const radius = 0.22;
  const segments = 32;
  const sourceLoop: Point[] = [];
  const mappedLoop: Point[] = [];
  const anchors: Array<[Point, Point]> = [];

  for (let i = 0; i <= segments; i++) {
    const theta = (Math.PI * 2 * i) / segments;
    const source: Point = [
      step.start[0] + Math.cos(theta) * radius,
      step.start[1] + Math.sin(theta) * radius,
      step.start[2],
    ];
    const mapped = method.computeStep(source, step.tStart, step.h, example.field).next;
    sourceLoop.push(source);
    mappedLoop.push(mapped);
    if (i % 8 === 0) anchors.push([source, mapped]);
  }

  return { sourceLoop, mappedLoop, anchors };
}

export function buildLocalErrorSurface(method: MethodSpec, example: ExampleSpec, step: StepTrace | undefined): LocalErrorSurfaceTrace {
  if (!step || !example.exactFlow) return null;

  const size = 13;
  const radius = 0.42;
  const points: Point[] = [];
  let maxMagnitude = 0;

  for (let iy = 0; iy < size; iy++) {
    for (let ix = 0; ix < size; ix++) {
      const u = (ix / (size - 1) - 0.5) * 2;
      const v = (iy / (size - 1) - 0.5) * 2;
      const start: Point = [
        step.start[0] + u * radius,
        step.start[1] + v * radius,
        step.start[2],
      ];
      const numeric = method.computeStep(start, step.tStart, step.h, example.field).next;
      const exact = example.exactFlow(start, step.tStart, step.h);
      const magnitude = distance(numeric, exact);
      maxMagnitude = Math.max(maxMagnitude, magnitude);
      points.push([start[0], start[1], step.start[2] - 0.42 + magnitude * 1.75]);
    }
  }

  return { points, size, maxMagnitude };
}

export function buildCriticalMarkers(example: ExampleSpec): CriticalMarkerTrace[] {
  const manual = example.criticalMarkers ?? [];
  const search = example.criticalSearch;
  if (!search?.enabled) return manual;

  let bestPoint: Point | null = null;
  let bestNorm = Number.POSITIVE_INFINITY;
  const samples = Math.max(3, search.samples);
  const zWeight = search.zWeight ?? 1;

  for (let iy = 0; iy < samples; iy++) {
    const y = search.yRange[0] + ((search.yRange[1] - search.yRange[0]) * iy) / (samples - 1);
    for (let ix = 0; ix < samples; ix++) {
      const x = search.xRange[0] + ((search.xRange[1] - search.xRange[0]) * ix) / (samples - 1);
      const point: Point = [x, y, search.z];
      const vector = example.field(point, 0);
      const norm = Math.hypot(vector[0], vector[1], vector[2] * zWeight);
      if (norm < bestNorm) {
        bestNorm = norm;
        bestPoint = point;
      }
    }
  }

  if (!bestPoint || bestNorm > search.threshold) return manual;
  const isDuplicate = manual.some((marker) => distance(marker.point, bestPoint!) < 0.08);
  if (isDuplicate) return manual;

  return [
    ...manual,
    {
      label: "detected equilibrium",
      point: bestPoint,
      kind: "equilibrium",
      severity: Math.max(0.2, 1 - bestNorm / search.threshold),
      description: `numeric scan: |f| ~= ${bestNorm.toPrecision(3)}`,
    },
  ];
}

function complexPolynomialMagnitude(coefficients: number[], re: number, im: number) {
  let powerRe = 1;
  let powerIm = 0;
  let sumRe = 0;
  let sumIm = 0;

  for (const coefficient of coefficients) {
    sumRe += coefficient * powerRe;
    sumIm += coefficient * powerIm;
    const nextPowerRe = powerRe * re - powerIm * im;
    const nextPowerIm = powerRe * im + powerIm * re;
    powerRe = nextPowerRe;
    powerIm = nextPowerIm;
  }

  return Math.hypot(sumRe, sumIm);
}

export function fieldSamples(example: ExampleSpec) {
  const samples: Point[] = [];
  for (let z = example.gridZ + 0.2; z <= example.gridZ + 3; z += 0.75) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      samples.push([Math.cos(a) * 1.25, Math.sin(a) * 1.25, z]);
    }
  }
  return samples;
}

export function fieldSegment(example: ExampleSpec, point: Point): [Point, Point] {
  return [point, addScaled(point, example.field(point, 0), example.fieldScale)];
}
