import type {
  ProbabilityConvergenceSample,
  ProbabilityExampleSpec,
  ProbabilityHistogramBin,
  ProbabilityMethodSpec,
  ProbabilityMomentSample,
  ProbabilityPathSample,
  ProbabilityPathTrace,
  ProbabilityTrace,
} from "./types";

export const probabilityMethods: ProbabilityMethodSpec[] = [
  {
    id: "euler-maruyama",
    name: "Euler-Maruyama",
    formula: "X_{n+1}=X_n+mu(X_n,t_n)dt+sigma(X_n,t_n)sqrt(dt)xi_n",
    color: "#60a5fa",
    order: "Strong order 1/2",
    stability: "dt va sigma kattalashsa path spread tez ochiladi",
    geometry: "Har qadam drift yo'nalishi va noise impulse yig'indisi sifatida ko'rinadi.",
    noiseCorrection: 0,
    sampler: "euler",
  },
  {
    id: "milstein",
    name: "Milstein",
    formula: "X_{n+1}=X_n+mu dt+sigma dW+1/2 sigma sigma_x((dW)^2-dt)",
    color: "#c084fc",
    order: "Strong order 1",
    stability: "Multiplicative noise uchun Euler-Maruyama'dan aniqroq",
    geometry: "Noise curvature correction kuchli diffusion joyida pathni tuzatadi.",
    noiseCorrection: 0.5,
    sampler: "milstein",
  },
  {
    id: "monte-carlo",
    name: "Exact-transition Monte Carlo",
    formula: "X_{t+dt} sampled from exact transition; E[f(X)] approx (1/N) sum_i f(X_i)",
    color: "#34d399",
    order: "No time-discretization bias for supported models",
    stability: "Path count oshsa confidence interval torayadi",
    geometry: "Exact transition cloud time-step biasni ajratib, faqat sampling uncertainty'ni ko'rsatadi.",
    noiseCorrection: 0.15,
    sampler: "exact-transition",
  },
];

export const probabilityExamples: ProbabilityExampleSpec[] = [
  {
    id: "geometric-brownian",
    name: "Geometric Brownian Motion",
    shortName: "GBM",
    equation: "dX_t = mu X_t dt + sigma X_t dW_t",
    initial: 1,
    endTime: 1,
    defaultSteps: 80,
    minSteps: 12,
    maxSteps: 180,
    defaultPaths: 64,
    minPaths: 12,
    maxPaths: 220,
    drift: 0.18,
    volatility: 0.38,
    payoffLevel: 1.12,
    exactMean: (t, options) => options.initial * Math.exp(options.drift * t),
    exactVariance: (t, options) => {
      const meanSquare = options.initial ** 2 * Math.exp(2 * options.drift * t);
      return meanSquare * (Math.exp(options.volatility ** 2 * t) - 1);
    },
    interpretation: "Pathlar multiplicative noise sabab fan shaklida tarqaladi; terminal cloud risk va uncertainty'ni beradi.",
  },
  {
    id: "ornstein-uhlenbeck",
    name: "Ornstein-Uhlenbeck Mean Reversion",
    shortName: "OU",
    equation: "dX_t = theta(mu-X_t)dt + sigma dW_t",
    initial: 1.3,
    endTime: 2,
    defaultSteps: 100,
    minSteps: 16,
    maxSteps: 220,
    defaultPaths: 72,
    minPaths: 12,
    maxPaths: 240,
    drift: 0,
    volatility: 0.28,
    meanReversion: 1.35,
    longRunMean: 0.45,
    payoffLevel: 0.7,
    exactMean: (t, options) => {
      const theta = options.meanReversion ?? 1;
      const mean = options.longRunMean ?? 0;
      return mean + (options.initial - mean) * Math.exp(-theta * t);
    },
    exactVariance: (t, options) => {
      const theta = options.meanReversion ?? 1;
      return (options.volatility ** 2 / (2 * theta)) * (1 - Math.exp(-2 * theta * t));
    },
    interpretation: "Drift pathlarni long-run mean tomonga tortadi; variance esa stationar qiymatga yaqinlashadi.",
  },
];

export function buildProbabilityTrace(
  method: ProbabilityMethodSpec,
  example: ProbabilityExampleSpec,
  options: {
    steps: number;
    pathCount: number;
    drift: number;
    volatility: number;
    seed: number;
  },
): ProbabilityTrace {
  const steps = clampInt(options.steps, example.minSteps, example.maxSteps);
  const pathCount = clampInt(options.pathCount, example.minPaths, example.maxPaths);
  const dt = example.endTime / steps;
  const rng = createSeededRandom(options.seed);
  const paths: ProbabilityPathTrace[] = [];
  let minValue = Number.POSITIVE_INFINITY;
  let maxValue = Number.NEGATIVE_INFINITY;

  for (let pathIndex = 0; pathIndex < pathCount; pathIndex += 1) {
    const samples: ProbabilityPathSample[] = [{ index: 0, t: 0, value: example.initial }];
    let value = example.initial;

    for (let step = 1; step <= steps; step += 1) {
      const t = (step - 1) * dt;
      const normal = randomNormal(rng);
      const dW = Math.sqrt(dt) * normal;
      value = nextProbabilityValue(method, example, value, t, dt, dW, options.drift, options.volatility);
      samples.push({ index: step, t: step * dt, value });
      minValue = Math.min(minValue, value);
      maxValue = Math.max(maxValue, value);
    }

    const terminal = samples[samples.length - 1]!.value;
    paths.push({
      id: pathIndex,
      color: probabilityPalette(pathIndex),
      samples,
      terminal,
      payoff: Math.max(terminal - example.payoffLevel, 0),
    });
  }

  const moments = buildMoments(paths, example, options.drift, options.volatility);
  const terminalValues = paths.map((path) => path.terminal);
  const payoffValues = paths.map((path) => path.payoff);
  const sortedTerminalValues = [...terminalValues].sort((left, right) => left - right);
  const terminalMean = mean(terminalValues);
  const terminalVariance = sampleVariance(terminalValues, terminalMean);
  const payoffEstimate = mean(payoffValues);
  const payoffVariance = sampleVariance(payoffValues, payoffEstimate);
  const payoffStdError = Math.sqrt(payoffVariance / Math.max(pathCount, 1));
  const exactTerminalMean = example.exactMean(example.endTime, exactOptions(example, options.drift, options.volatility));
  const exactTerminalVariance = example.exactVariance(example.endTime, exactOptions(example, options.drift, options.volatility));

  minValue = Math.min(minValue, example.initial, exactTerminalMean - Math.sqrt(Math.max(exactTerminalVariance, 0)) * 2);
  maxValue = Math.max(maxValue, example.initial, exactTerminalMean + Math.sqrt(Math.max(exactTerminalVariance, 0)) * 2);

  return {
    paths,
    moments,
    histogram: buildHistogram(terminalValues, 12),
    convergence: buildConvergence(payoffValues, payoffEstimate),
    terminalMean,
    terminalVariance,
    exactTerminalMean,
    exactTerminalVariance,
    payoffEstimate,
    payoffStdError,
    confidenceInterval: [payoffEstimate - 1.96 * payoffStdError, payoffEstimate + 1.96 * payoffStdError],
    probabilityAbovePayoff: terminalValues.filter((value) => value > example.payoffLevel).length / Math.max(pathCount, 1),
    quantile05: quantile(sortedTerminalValues, 0.05),
    quantile95: quantile(sortedTerminalValues, 0.95),
    expectedShortfall05: expectedShortfall(sortedTerminalValues, 0.05),
    meanAbsError: Math.abs(terminalMean - exactTerminalMean),
    varianceAbsError: Math.abs(terminalVariance - exactTerminalVariance),
    payoffLevel: example.payoffLevel,
    dt,
    steps,
    pathCount,
    valueRange: [minValue, maxValue],
    metadata: {
      methodId: method.id,
      methodName: method.name,
      exampleId: example.id,
      exampleName: example.name,
      drift: options.drift,
      volatility: options.volatility,
      seed: options.seed,
    },
  };
}

function nextProbabilityValue(
  method: ProbabilityMethodSpec,
  example: ProbabilityExampleSpec,
  value: number,
  t: number,
  dt: number,
  dW: number,
  drift: number,
  volatility: number,
) {
  if (method.sampler === "exact-transition") {
    return exactTransitionValue(example, value, dt, dW, drift, volatility);
  }

  if (example.id === "ornstein-uhlenbeck") {
    const theta = example.meanReversion ?? 1;
    const longRunMean = example.longRunMean ?? 0;
    if (method.sampler === "milstein") {
      return (value + theta * longRunMean * dt + volatility * dW) / (1 + theta * dt);
    }
    return value + theta * (longRunMean - value) * dt + volatility * dW;
  }

  const euler = value + drift * value * dt + volatility * value * dW;
  const correction = method.sampler === "milstein" ? method.noiseCorrection * volatility ** 2 * value * (dW ** 2 - dt) : 0;
  const next = euler + correction;
  return Math.max(next, 1e-6);
}

function exactTransitionValue(
  example: ProbabilityExampleSpec,
  value: number,
  dt: number,
  dW: number,
  drift: number,
  volatility: number,
) {
  if (example.id === "ornstein-uhlenbeck") {
    const theta = example.meanReversion ?? 1;
    const longRunMean = example.longRunMean ?? 0;
    const decay = Math.exp(-theta * dt);
    const variance = (volatility ** 2 / (2 * theta)) * (1 - Math.exp(-2 * theta * dt));
    const normal = dW / Math.sqrt(dt);
    return longRunMean + (value - longRunMean) * decay + Math.sqrt(Math.max(variance, 0)) * normal;
  }

  return value * Math.exp((drift - 0.5 * volatility ** 2) * dt + volatility * dW);
}

function buildMoments(paths: ProbabilityPathTrace[], example: ProbabilityExampleSpec, drift: number, volatility: number): ProbabilityMomentSample[] {
  const steps = paths[0]?.samples.length ?? 0;
  const result: ProbabilityMomentSample[] = [];
  for (let index = 0; index < steps; index += 1) {
    const values = paths.map((path) => path.samples[index]!.value);
    const sampleMean = mean(values);
    const variance = sampleVariance(values, sampleMean);
    const t = paths[0]!.samples[index]!.t;
    result.push({
      index,
      t,
      mean: sampleMean,
      variance,
      exactMean: example.exactMean(t, exactOptions(example, drift, volatility)),
      exactVariance: example.exactVariance(t, exactOptions(example, drift, volatility)),
      standardError: Math.sqrt(variance / Math.max(paths.length, 1)),
    });
  }
  return result;
}

function buildHistogram(values: number[], binCount: number): ProbabilityHistogramBin[] {
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const width = Math.max((maxValue - minValue) / binCount, 1e-9);
  const counts = Array<number>(binCount).fill(0);

  for (const value of values) {
    const index = Math.min(binCount - 1, Math.max(0, Math.floor((value - minValue) / width)));
    counts[index] += 1;
  }

  return counts.map((count, index) => ({
    center: minValue + width * (index + 0.5),
    count,
    probability: count / Math.max(values.length, 1),
  }));
}

function buildConvergence(values: number[], target: number): ProbabilityConvergenceSample[] {
  const checkpoints = [4, 8, 16, 32, 64, 96, 128, 192, values.length].filter((item, index, source) => item <= values.length && source.indexOf(item) === index);
  return checkpoints.map((count) => {
    const prefix = values.slice(0, count);
    const estimate = mean(prefix);
    const variance = sampleVariance(prefix, estimate);
    return {
      paths: count,
      estimate,
      stderr: Math.sqrt(variance / Math.max(count, 1)),
      absError: Math.abs(estimate - target),
    };
  });
}

function exactOptions(example: ProbabilityExampleSpec, drift: number, volatility: number) {
  return {
    initial: example.initial,
    drift,
    volatility,
    meanReversion: example.meanReversion,
    longRunMean: example.longRunMean,
  };
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function sampleVariance(values: number[], center: number) {
  if (values.length < 2) return 0;
  return values.reduce((sum, value) => sum + (value - center) ** 2, 0) / (values.length - 1);
}

function quantile(sortedValues: number[], probability: number) {
  if (sortedValues.length === 0) return 0;
  const index = Math.min(sortedValues.length - 1, Math.max(0, Math.floor((sortedValues.length - 1) * probability)));
  return sortedValues[index]!;
}

function expectedShortfall(sortedValues: number[], probability: number) {
  if (sortedValues.length === 0) return 0;
  const count = Math.max(1, Math.floor(sortedValues.length * probability));
  return mean(sortedValues.slice(0, count));
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function createSeededRandom(seed: number) {
  let state = Math.max(1, Math.floor(seed) % 2147483647);
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function randomNormal(random: () => number) {
  const u1 = Math.max(random(), 1e-9);
  const u2 = random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function probabilityPalette(index: number) {
  const palette = ["#60a5fa", "#34d399", "#f472b6", "#f59e0b", "#22d3ee", "#c084fc", "#f87171", "#a3e635"];
  return palette[index % palette.length];
}
