import type { OptimizationExampleSpec, OptimizationMethodSpec, OptimizationStepTrace, OptimizationTrace } from "./types";

export const optimizationMethods: OptimizationMethodSpec[] = [
  {
    id: "gradient-descent",
    name: "Gradient Descent",
    formula: "x_{k+1}=x_k-eta grad f(x_k)",
    color: "#f43f5e",
    order: "Linear near strongly convex minima",
    stability: "Learning rate katta bo'lsa valley ichida oscillation paydo bo'ladi",
    geometry: "Gradient arrowlar surface bo'ylab eng tez pastlash yo'nalishini ko'rsatadi.",
    stepScale: 1,
  },
  {
    id: "momentum",
    name: "Momentum",
    formula: "v_{k+1}=beta v_k+grad f(x_k), x_{k+1}=x_k-eta v_{k+1}",
    color: "#14b8a6",
    order: "Accelerated on long valleys",
    stability: "Momentum juda katta bo'lsa minimum atrofida overshoot qiladi",
    geometry: "Velocity memory pathni valley bo'ylab tekislaydi va zigzagni kamaytiradi.",
    stepScale: 0.72,
    momentum: 0.76,
  },
  {
    id: "newton-optimization",
    name: "Newton",
    formula: "x_{k+1}=x_k-H(x_k)^{-1}grad f(x_k)",
    color: "#f59e0b",
    order: "Quadratic near optimum",
    stability: "Hessian indefinite bo'lsa damping kerak bo'ladi",
    geometry: "Curvature ellipselari qadamni Hessian geometriyasiga mos buradi.",
    stepScale: 1,
  },
];

export const optimizationExamples: OptimizationExampleSpec[] = [
  {
    id: "rosenbrock",
    name: "Rosenbrock Valley",
    shortName: "Rosenbrock",
    formula: "f(x,y)=(1-x)^2+100(y-x^2)^2",
    initial: [-1.15, 1.05],
    optimum: [1, 1],
    defaultStep: 0.0018,
    minStep: 0.0003,
    maxStep: 0.008,
    defaultIterations: 90,
    minIterations: 8,
    maxIterations: 180,
    xRange: [-1.6, 1.45],
    yRange: [-0.6, 1.75],
    value: (x, y) => (1 - x) ** 2 + 100 * (y - x * x) ** 2,
    gradient: (x, y) => [-2 * (1 - x) - 400 * x * (y - x * x), 200 * (y - x * x)],
    hessian: (x, y) => [
      [2 - 400 * y + 1200 * x * x, -400 * x],
      [-400 * x, 200],
    ],
    interpretation: "Tor valley sabab oddiy gradient descent sekin buriladi; momentum va Newton curvature'ni yaxshiroq ishlatadi.",
  },
  {
    id: "himmelblau",
    name: "Himmelblau Multi-Minima",
    shortName: "Himmelblau",
    formula: "f(x,y)=(x^2+y-11)^2+(x+y^2-7)^2",
    initial: [-3.2, 2.8],
    optimum: [-2.805, 3.131],
    defaultStep: 0.012,
    minStep: 0.001,
    maxStep: 0.04,
    defaultIterations: 70,
    minIterations: 8,
    maxIterations: 160,
    xRange: [-4, 4],
    yRange: [-4, 4],
    value: (x, y) => (x * x + y - 11) ** 2 + (x + y * y - 7) ** 2,
    gradient: (x, y) => [4 * x * (x * x + y - 11) + 2 * (x + y * y - 7), 2 * (x * x + y - 11) + 4 * y * (x + y * y - 7)],
    hessian: (x, y) => [
      [12 * x * x + 4 * y - 42, 4 * x + 4 * y],
      [4 * x + 4 * y, 4 * x + 12 * y * y - 26],
    ],
    interpretation: "Ko'p basin borligi sabab start point va curvature search qaysi minimumga tushishni belgilaydi.",
  },
];

export function buildOptimizationTrace(
  method: OptimizationMethodSpec,
  example: OptimizationExampleSpec,
  options: { stepSize: number; iterations: number },
): OptimizationTrace {
  const iterations = clampInt(options.iterations, example.minIterations, example.maxIterations);
  const stepSize = clamp(options.stepSize, example.minStep, example.maxStep);
  const steps: OptimizationStepTrace[] = [];
  let point: [number, number] = [...example.initial];
  let velocity: [number, number] = [0, 0];
  let minValue = Number.POSITIVE_INFINITY;
  let maxValue = Number.NEGATIVE_INFINITY;

  for (let index = 0; index <= iterations; index += 1) {
    const value = example.value(point[0], point[1]);
    const gradient = example.gradient(point[0], point[1]);
    const gradientNorm = Math.hypot(...gradient);
    const update = index < iterations ? computeOptimizationUpdate(method, example, point, gradient, velocity, stepSize) : [0, 0] as [number, number];

    steps.push({
      index,
      point,
      value,
      gradient,
      gradientNorm,
      step: update,
      distanceToOptimum: Math.hypot(point[0] - example.optimum[0], point[1] - example.optimum[1]),
    });

    minValue = Math.min(minValue, value);
    maxValue = Math.max(maxValue, value);

    if (index < iterations) {
      if (method.id === "momentum") {
        velocity = [method.momentum! * velocity[0] + gradient[0], method.momentum! * velocity[1] + gradient[1]];
      }
      point = clampPoint([point[0] + update[0], point[1] + update[1]], example);
    }
  }

  const final = steps[steps.length - 1]!;
  return {
    steps,
    finalValue: final.value,
    finalGradientNorm: final.gradientNorm,
    finalDistance: final.distanceToOptimum,
    minValue,
    maxValue,
    stepSize,
    iterations,
    metadata: {
      methodId: method.id,
      methodName: method.name,
      exampleId: example.id,
      exampleName: example.name,
    },
  };
}

function computeOptimizationUpdate(
  method: OptimizationMethodSpec,
  example: OptimizationExampleSpec,
  point: [number, number],
  gradient: [number, number],
  velocity: [number, number],
  stepSize: number,
): [number, number] {
  if (method.id === "newton-optimization") {
    const hessian = example.hessian(point[0], point[1]);
    const inverseStep = solve2x2(hessian, gradient);
    const damping = Math.min(1, Math.max(0.12, stepSize * 35));
    return [-damping * inverseStep[0], -damping * inverseStep[1]];
  }

  if (method.id === "momentum") {
    const beta = method.momentum ?? 0.75;
    return [-stepSize * method.stepScale * (beta * velocity[0] + gradient[0]), -stepSize * method.stepScale * (beta * velocity[1] + gradient[1])];
  }

  return [-stepSize * method.stepScale * gradient[0], -stepSize * method.stepScale * gradient[1]];
}

function solve2x2(matrix: [[number, number], [number, number]], vector: [number, number]): [number, number] {
  const [[a, b], [c, d]] = matrix;
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-8) return [vector[0], vector[1]];
  return [(d * vector[0] - b * vector[1]) / det, (-c * vector[0] + a * vector[1]) / det];
}

function clampPoint(point: [number, number], example: OptimizationExampleSpec): [number, number] {
  return [clamp(point[0], example.xRange[0], example.xRange[1]), clamp(point[1], example.yRange[0], example.yRange[1])];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
