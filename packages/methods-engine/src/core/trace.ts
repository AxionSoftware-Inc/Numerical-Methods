import { distance } from "./math";
import { buildCriticalMarkers, buildJacobianDeformation, buildLocalErrorSurface, buildStabilityRegion } from "./layers";
import type { ExampleSpec, MethodSpec, Point, StageLayerTrace, TraceError, TraceResult } from "./types";

export function buildTrace(method: MethodSpec, example: ExampleSpec, step: number): TraceResult {
  const points: Point[] = [example.initial];
  const exactAtStep: Point[] = [example.initial];
  const steps: TraceResult["steps"] = [];
  const stages: StageLayerTrace[] = [];
  const errors: TraceError[] = [
    {
      index: 0,
      t: 0,
      exact: example.initial,
      numeric: example.initial,
      magnitude: 0,
    },
  ];
  let current = example.initial;
  let t = 0;
  let maxError = 0;

  while (t < example.endTime - 1e-9) {
    const h = Math.min(step, example.endTime - t);
    const tStart = t;
    const computation = method.computeStep(current, t, h, example.field);
    t += h;
    const exactEnd = example.exact(t);
    const index = steps.length;
    const stepTrace = {
      index,
      tStart,
      tEnd: t,
      h,
      start: current,
      end: computation.next,
      exactEnd,
      stages: computation.stages,
    };

    steps.push(stepTrace);
    stages.push(
      ...computation.stages.map((stage) => ({
        ...stage,
        stepIndex: index,
        tStart,
        tEnd: t,
      })),
    );

    current = computation.next;
    points.push(current);
    exactAtStep.push(exactEnd);

    const magnitude = distance(current, exactEnd);
    maxError = Math.max(maxError, magnitude);
    errors.push({
      index: points.length - 1,
      t,
      exact: exactEnd,
      numeric: current,
      magnitude,
    });
  }

  return {
    points,
    exactAtStep,
    exactPath: buildExactPath(example),
    steps,
    stages,
    errors,
    stabilityRegion: buildStabilityRegion(method, example),
    jacobianDeformation: buildJacobianDeformation(method, example, steps[Math.floor(steps.length * 0.36)]),
    localErrorSurface: buildLocalErrorSurface(method, example, steps[Math.floor(steps.length * 0.36)]),
    criticalMarkers: buildCriticalMarkers(example),
    energySeries: points.map((point, index) => ({
      index,
      t: errors[index]?.t ?? index,
      value: point[0] * point[0] + point[1] * point[1],
    })),
    metrics: {
      finalError: errors.at(-1)!.magnitude,
      maxError,
      metricLabel: example.metricLabel,
      metricValue: example.metric(points.at(-1)!),
    },
    metadata: {
      methodId: method.id,
      methodName: method.name,
      exampleId: example.id,
      exampleName: example.name,
      step,
      stepCount: steps.length,
    },
  };
}

export function buildExactPath(example: ExampleSpec, samples = 520) {
  return Array.from({ length: samples }, (_, index) => {
    const t = (example.endTime * index) / (samples - 1);
    return example.exact(t);
  });
}
