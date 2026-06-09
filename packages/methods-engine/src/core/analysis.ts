import { addScaled, distance } from "./math";
import { buildTrace } from "./trace";
import type {
  EnergySample,
  ExampleSpec,
  MethodSpec,
  Point,
  ProjectionSegmentTrace,
  StabilityScanTrace,
  TraceResult,
} from "./types";

export function oscillatorEnergy(point: Point) {
  return point[0] * point[0] + point[1] * point[1];
}

export function buildEnergySeries(trace: Pick<TraceResult, "points" | "errors">): EnergySample[] {
  return trace.points.map((point, index) => ({
    index,
    t: trace.errors[index]?.t ?? index,
    value: oscillatorEnergy(point),
  }));
}

export function projectToEnergy(point: Point, targetEnergy: number): Point {
  const currentRadius = Math.hypot(point[0], point[1]);
  const targetRadius = Math.sqrt(Math.max(targetEnergy, 0));
  if (currentRadius < 1e-12) return [targetRadius, 0, point[2]];
  const scale = targetRadius / currentRadius;
  return [point[0] * scale, point[1] * scale, point[2]];
}

export function createEnergyCorrectedEulerMethod(targetEnergy: number): MethodSpec {
  return {
    id: "energy-corrected-euler",
    name: "Energy-corrected Euler",
    formula: "y*=y+h f(y),  (x,v) <- sqrt(E0)/||(x*,v*)|| (x*,v*)",
    stability: "Euler qadamidan keyin invariant sirtiga proyeksiya qiladi",
    color: "#facc15",
    geometry: "Euler urinma qadamidan keyin radiusni energiya sirtiga qaytaradi. Bu demo yangi metod yaratish emas, correction rule qanday ko‘rinishini ko‘rsatadigan konstruktor.",
    computeStep: (point, t, h, field) => {
      const k1 = field(point, t);
      const eulerPoint = addScaled(point, k1, h);
      const projected = projectToEnergy(eulerPoint, targetEnergy);
      return {
        next: projected,
        stages: [
          { label: "Euler", sample: point, vectorEnd: eulerPoint, color: "#e69f00" },
          { label: "project", sample: eulerPoint, vectorEnd: projected, color: "#facc15" },
        ],
      };
    },
  };
}

export function buildEnergyProjectionSegments(eulerTrace: TraceResult, projectedTrace: TraceResult, maxSegments = 28): ProjectionSegmentTrace[] {
  const stride = Math.max(1, Math.floor(Math.min(eulerTrace.points.length, projectedTrace.points.length) / maxSegments));
  const segments: ProjectionSegmentTrace[] = [];

  for (let index = 1; index < Math.min(eulerTrace.points.length, projectedTrace.points.length); index += stride) {
    const from = eulerTrace.points[index];
    const to = projectedTrace.points[index];
    segments.push({
      index,
      from,
      to,
      label: "Euler -> projected",
      magnitude: distance(from, to),
    });
  }

  return segments;
}

export function buildStabilityScan(methods: MethodSpec[], example: ExampleSpec, hMin = 0.05, hMax = 3.2, samples = 42): StabilityScanTrace[] {
  const targetEnergy = oscillatorEnergy(example.initial);

  return methods.map((method) => ({
    methodId: method.id,
    methodName: method.name,
    color: method.color,
    samples: Array.from({ length: samples }, (_, index) => {
      const h = hMin + ((hMax - hMin) * index) / (samples - 1);
      const trace = buildTrace(method, example, h);
      const maxEnergy = Math.max(...trace.energySeries.map((sample) => sample.value));
      const growth = maxEnergy / Math.max(targetEnergy, 1e-12);
      return {
        h,
        growth,
        stable: Number.isFinite(growth) && growth < 2.5,
      };
    }),
  }));
}

export const energyCorrectedEulerCode = `function energyCorrectedEulerStep([x, v, z], h) {
  const e0 = x*x + v*v;
  const euler = [x + h*v, v - h*x, z + 0.08*h];
  const r = Math.hypot(euler[0], euler[1]);
  const scale = Math.sqrt(e0) / Math.max(r, 1e-12);
  return [euler[0] * scale, euler[1] * scale, euler[2]];
}`;
