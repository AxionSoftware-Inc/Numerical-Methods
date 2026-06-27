import type {
  InterpolationExampleSpec,
  InterpolationMethodSpec,
  InterpolationNode,
  InterpolationSample,
  InterpolationTrace,
} from "./types";

export const interpolationMethods: InterpolationMethodSpec[] = [
  {
    id: "lagrange",
    name: "Lagrange Polynomial",
    formula: "p_n(x)=sum_i y_i L_i(x)",
    color: "#fb7185",
    order: "Global polynomial exact on nodes",
    stability: "Ko'p node bo'lsa chetlarda Runge effekti paydo bo'lishi mumkin",
    geometry: "Har node global egri chiziqqa ta'sir qiladi, shu sabab oscillation darhol ko'rinadi.",
    support: "global",
    nodeLayout: "uniform",
  },
  {
    id: "chebyshev-barycentric",
    name: "Chebyshev Barycentric",
    formula: "p_n(x)=\\frac{\\sum_j w_j y_j/(x-x_j)}{\\sum_j w_j/(x-x_j)},\\; x_j\\sim \\cos\\frac{(2j+1)\\pi}{2n+2}",
    color: "#8b5cf6",
    order: "Global polynomial with Chebyshev nodes",
    stability: "Chegaradagi Runge tebranishini sezilarli kamaytiradi va global polynomialni amaliyotga yaqinlashtiradi",
    geometry: "Node'lar chetlarda zichlashadi, shuning uchun aynan chekka xatolik va overshoot sahnada nazorat ostiga olinadi.",
    support: "global",
    nodeLayout: "chebyshev",
  },
  {
    id: "newton-divided-difference",
    name: "Newton Divided Difference",
    formula: "p_n(x)=a_0+a_1(x-x_0)+...+a_n prod_{j<n}(x-x_j)",
    color: "#38bdf8",
    order: "Global polynomial, incremental form",
    stability: "Node tartibini saqlab yangi nuqta qo'shish oson",
    geometry: "Polynomial bosqichma-bosqich yig'ilgani uchun qaysi node qayerni buzayotganini kuzatish oson.",
    support: "global",
    nodeLayout: "uniform",
  },
  {
    id: "cubic-spline",
    name: "Cubic Spline",
    formula: "S_i(x)=a_i+b_i(x-x_i)+c_i(x-x_i)^2+d_i(x-x_i)^3",
    color: "#34d399",
    order: "Piecewise cubic, C^2 smooth",
    stability: "Amaliyotda juda sokin va ishonchli",
    geometry: "Lokal segmentlar silliq ulanadi, shu sabab egri chiziq tabiatga yaqin turadi.",
    support: "local",
    nodeLayout: "uniform",
  },
  {
    id: "piecewise-linear",
    name: "Piecewise Linear",
    formula: "I(x)=y_i+(y_(i+1)-y_i)(x-x_i)/(x_(i+1)-x_i)",
    color: "#f59e0b",
    order: "First-order local interpolation",
    stability: "Eng sodda va robust local usul",
    geometry: "Har segment alohida ko'rinadi; qayerda node yetarli emasligi darhol bilinadi.",
    support: "local",
    nodeLayout: "uniform",
  },
];

export const interpolationExamples: InterpolationExampleSpec[] = [
  {
    id: "smooth-sine",
    name: "Smooth Harmonic Curve",
    shortName: "Sine",
    formula: "f(x)=sin(1.4x)+0.18x",
    xRange: [-2.8, 2.8],
    yRange: [-1.6, 1.6],
    defaultNodes: 9,
    minNodes: 4,
    maxNodes: 16,
    evaluate: (x) => Math.sin(1.4 * x) + 0.18 * x,
    interpretation: "Silliq funksiya uchun spline va global polynomiallar yaxshi ishlaydi; farq ko'proq error xaritasida ko'rinadi.",
  },
  {
    id: "runge-window",
    name: "Runge Window",
    shortName: "Runge",
    formula: "f(x)=1/(1+25x^2)",
    xRange: [-1, 1],
    yRange: [-0.1, 1.15],
    defaultNodes: 11,
    minNodes: 4,
    maxNodes: 18,
    evaluate: (x) => 1 / (1 + 25 * x * x),
    interpretation: "Chegaralarda global polynomialning tebranishi juda kuchli chiqadi; spline bunga nisbatan sokinroq.",
  },
  {
    id: "sharp-transition",
    name: "Sharp Transition",
    shortName: "Sharp",
    formula: "f(x)=tanh(2.8x)+0.12cos(4x)",
    xRange: [-2.2, 2.2],
    yRange: [-1.4, 1.4],
    defaultNodes: 10,
    minNodes: 4,
    maxNodes: 18,
    evaluate: (x) => Math.tanh(2.8 * x) + 0.12 * Math.cos(4 * x),
    interpretation: "Keskin o'zgarishli joylarda local support usullarining afzalligi ko'rinadi.",
  },
];

export function buildInterpolationTrace(
  method: InterpolationMethodSpec,
  example: InterpolationExampleSpec,
  options: { nodeCount: number },
): InterpolationTrace {
  const nodeCount = clampInt(options.nodeCount, example.minNodes, example.maxNodes);
  const nodes = buildNodes(example, nodeCount, method);
  const evaluator = createInterpolationEvaluator(method, nodes);
  const sampleCount = 220;
  const samples: InterpolationSample[] = [];
  let maxAbsError = 0;
  let errorSquareSum = 0;
  let roughness = 0;
  let previousSlope = 0;
  let edgeMaxError = 0;
  let centerMaxError = 0;
  let overshootArea = 0;
  let signChangeCount = 0;
  let previousError = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const alpha = index / (sampleCount - 1);
    const x = example.xRange[0] + alpha * (example.xRange[1] - example.xRange[0]);
    const exact = example.evaluate(x);
    const estimate = evaluator(x);
    const error = estimate - exact;
    samples.push({ x, exact, estimate, error });
    maxAbsError = Math.max(maxAbsError, Math.abs(error));
    errorSquareSum += error * error;
    if (alpha <= 0.2 || alpha >= 0.8) {
      edgeMaxError = Math.max(edgeMaxError, Math.abs(error));
    } else if (alpha >= 0.35 && alpha <= 0.65) {
      centerMaxError = Math.max(centerMaxError, Math.abs(error));
    }
    if (index > 0 && Math.sign(error) !== 0 && Math.sign(previousError) !== 0 && Math.sign(error) !== Math.sign(previousError)) {
      signChangeCount += 1;
    }
    previousError = error;
    const lower = example.yRange[0];
    const upper = example.yRange[1];
    if (estimate < lower) overshootArea += (lower - estimate) * (example.xRange[1] - example.xRange[0]) / sampleCount;
    if (estimate > upper) overshootArea += (estimate - upper) * (example.xRange[1] - example.xRange[0]) / sampleCount;

    if (index > 0) {
      const dx = x - samples[index - 1]!.x;
      const slope = (estimate - samples[index - 1]!.estimate) / Math.max(dx, 1e-9);
      if (index > 1) {
        roughness += Math.abs(slope - previousSlope);
      }
      previousSlope = slope;
    }
  }
  const exactVariation = totalVariation(samples.map((sample) => sample.exact));
  const estimateVariation = totalVariation(samples.map((sample) => sample.estimate));

  return {
    nodes,
    samples,
    maxAbsError,
    rmsError: Math.sqrt(errorSquareSum / samples.length),
    roughness,
    edgeMaxError,
    centerMaxError,
    totalVariationRatio: estimateVariation / Math.max(exactVariation, 1e-9),
    overshootArea,
    signChangeCount,
    nodeCount,
    nodeLayout: method.nodeLayout ?? "uniform",
    metadata: {
      methodId: method.id,
      methodName: method.name,
      exampleId: example.id,
      exampleName: example.name,
    },
  };
}

function buildNodes(example: InterpolationExampleSpec, nodeCount: number, method: InterpolationMethodSpec): InterpolationNode[] {
  const points =
    method.nodeLayout === "chebyshev"
      ? Array.from({ length: nodeCount }, (_, index) => {
          const theta = ((2 * index + 1) * Math.PI) / (2 * nodeCount);
          const scaled = Math.cos(theta);
          return ((example.xRange[0] + example.xRange[1]) / 2) + ((example.xRange[1] - example.xRange[0]) / 2) * scaled;
        }).sort((left, right) => left - right)
      : Array.from({ length: nodeCount }, (_, index) => {
          const alpha = nodeCount === 1 ? 0 : index / (nodeCount - 1);
          const bias = Math.max(0.35, Math.min(method.nodeBias ?? 1, 2.8));
          const shaped = alpha <= 0.5
            ? 0.5 * (2 * alpha) ** bias
            : 1 - 0.5 * (2 * (1 - alpha)) ** bias;
          return example.xRange[0] + shaped * (example.xRange[1] - example.xRange[0]);
        });

  return points.map((x, index) => {
    return {
      index,
      x,
      y: example.evaluate(x),
    };
  });
}

function createInterpolationEvaluator(method: InterpolationMethodSpec, nodes: InterpolationNode[]) {
  if (method.id === "piecewise-linear") {
    return (x: number) => evaluatePiecewiseLinear(nodes, x);
  }

  if (method.id === "cubic-spline") {
    const spline = buildNaturalSpline(nodes);
    return (x: number) => evaluateSpline(spline, x);
  }

  if (method.id === "newton-divided-difference") {
    const coeffs = buildDividedDifferences(nodes);
    return (x: number) => evaluateNewton(nodes, coeffs, x);
  }

  const weights = buildBarycentricWeights(nodes);
  return (x: number) => evaluateBarycentric(nodes, weights, x);
}

function buildBarycentricWeights(nodes: InterpolationNode[]) {
  return nodes.map((node, index) => {
    let weight = 1;
    for (let inner = 0; inner < nodes.length; inner += 1) {
      if (inner === index) continue;
      weight /= node.x - nodes[inner]!.x;
    }
    return weight;
  });
}

function evaluateBarycentric(nodes: InterpolationNode[], weights: number[], x: number) {
  for (const node of nodes) {
    if (Math.abs(x - node.x) < 1e-10) return node.y;
  }

  let numerator = 0;
  let denominator = 0;
  for (let index = 0; index < nodes.length; index += 1) {
    const ratio = weights[index]! / (x - nodes[index]!.x);
    numerator += ratio * nodes[index]!.y;
    denominator += ratio;
  }
  return numerator / denominator;
}

function buildDividedDifferences(nodes: InterpolationNode[]) {
  const coeffs = nodes.map((node) => node.y);
  for (let order = 1; order < nodes.length; order += 1) {
    for (let index = nodes.length - 1; index >= order; index -= 1) {
      coeffs[index] = (coeffs[index]! - coeffs[index - 1]!) / (nodes[index]!.x - nodes[index - order]!.x);
    }
  }
  return coeffs;
}

function evaluateNewton(nodes: InterpolationNode[], coeffs: number[], x: number) {
  let value = coeffs[nodes.length - 1] ?? 0;
  for (let index = nodes.length - 2; index >= 0; index -= 1) {
    value = value * (x - nodes[index]!.x) + coeffs[index]!;
  }
  return value;
}

function evaluatePiecewiseLinear(nodes: InterpolationNode[], x: number) {
  if (x <= nodes[0]!.x) return nodes[0]!.y;
  if (x >= nodes[nodes.length - 1]!.x) return nodes[nodes.length - 1]!.y;

  for (let index = 0; index < nodes.length - 1; index += 1) {
    const left = nodes[index]!;
    const right = nodes[index + 1]!;
    if (x >= left.x && x <= right.x) {
      const alpha = (x - left.x) / Math.max(right.x - left.x, 1e-9);
      return left.y + alpha * (right.y - left.y);
    }
  }

  return nodes[nodes.length - 1]!.y;
}

type SplineSegment = {
  x0: number;
  x1: number;
  a: number;
  b: number;
  c: number;
  d: number;
};

function buildNaturalSpline(nodes: InterpolationNode[]): SplineSegment[] {
  const n = nodes.length - 1;
  const h = Array.from({ length: n }, (_, index) => nodes[index + 1]!.x - nodes[index]!.x);
  const alpha = Array.from({ length: n }, () => 0);
  for (let index = 1; index < n; index += 1) {
    alpha[index] =
      (3 / h[index]!) * (nodes[index + 1]!.y - nodes[index]!.y) -
      (3 / h[index - 1]!) * (nodes[index]!.y - nodes[index - 1]!.y);
  }

  const l = Array.from({ length: n + 1 }, () => 0);
  const mu = Array.from({ length: n + 1 }, () => 0);
  const z = Array.from({ length: n + 1 }, () => 0);
  const c = Array.from({ length: n + 1 }, () => 0);
  const b = Array.from({ length: n }, () => 0);
  const d = Array.from({ length: n }, () => 0);

  l[0] = 1;
  for (let index = 1; index < n; index += 1) {
    l[index] = 2 * (nodes[index + 1]!.x - nodes[index - 1]!.x) - h[index - 1]! * mu[index - 1]!;
    mu[index] = h[index]! / l[index]!;
    z[index] = (alpha[index]! - h[index - 1]! * z[index - 1]!) / l[index]!;
  }
  l[n] = 1;

  const segments: SplineSegment[] = [];
  for (let index = n - 1; index >= 0; index -= 1) {
    c[index] = z[index]! - mu[index]! * c[index + 1]!;
    b[index] = (nodes[index + 1]!.y - nodes[index]!.y) / h[index]! - (h[index]! * (c[index + 1]! + 2 * c[index]!)) / 3;
    d[index] = (c[index + 1]! - c[index]!) / (3 * h[index]!);
  }

  for (let index = 0; index < n; index += 1) {
    segments.push({
      x0: nodes[index]!.x,
      x1: nodes[index + 1]!.x,
      a: nodes[index]!.y,
      b: b[index]!,
      c: c[index]!,
      d: d[index]!,
    });
  }

  return segments;
}

function evaluateSpline(segments: SplineSegment[], x: number) {
  const segment = segments.find((item) => x >= item.x0 && x <= item.x1) ?? (x < segments[0]!.x0 ? segments[0]! : segments[segments.length - 1]!);
  const dx = x - segment.x0;
  return segment.a + segment.b * dx + segment.c * dx * dx + segment.d * dx * dx * dx;
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function totalVariation(values: number[]) {
  let total = 0;
  for (let index = 1; index < values.length; index += 1) {
    total += Math.abs(values[index]! - values[index - 1]!);
  }
  return total;
}
