import type { PdeErrorSample, PdeExampleSpec, PdeFrame, PdeMethodSpec, PdeTrace } from "./types";

export function createCustomThetaPdeMethod(theta: number): PdeMethodSpec {
  const normalized = Math.max(0, Math.min(1, theta));
  return {
    id: "custom-theta",
    name: `Custom theta = ${normalized.toFixed(2)}`,
    formula: `(I-θrL)u^(n+1) = (I+(1-θ)rL)u^n`,
    order: normalized === 0.5 ? "O(dt^2 + dx^2)" : "O(dt + dx^2)",
    color: "#f97316",
    stability: normalized >= 0.5 ? "A-stable tomonga yaqin" : "Explicit tomonga yaqin",
    geometry: "Theta-metod explicit va implicit oilani bitta parametr orqali birlashtiradi. Custom metod qo‘shish uchun eng sodda kirish nuqta shu.",
    theta: normalized,
  };
}

export function buildPdeTrace(method: PdeMethodSpec, example: PdeExampleSpec, requestedCells: number, requestedTimeSteps: number): PdeTrace {
  const cells = clampInt(requestedCells, example.minCells, example.maxCells);
  const timeSteps = clampInt(requestedTimeSteps, example.minTimeSteps, example.maxTimeSteps);
  const [x0, x1] = example.domain;
  const dx = (x1 - x0) / cells;
  const dt = example.endTime / timeSteps;
  const r = (example.diffusivity * dt) / (dx * dx);
  const theta = method.theta;
  const xs = Array.from({ length: cells + 1 }, (_, index) => x0 + index * dx);

  let current = xs.map((x, index) => (index === 0 || index === cells ? 0 : example.initial(x)));
  const frames: PdeFrame[] = [];
  const errors: PdeErrorSample[] = [];
  let minValue = Number.POSITIVE_INFINITY;
  let maxValue = Number.NEGATIVE_INFINITY;

  for (let step = 0; step <= timeSteps; step += 1) {
    const time = step * dt;
    const exactValues = xs.map((x, index) => (index === 0 || index === cells ? 0 : example.exact(x, time)));
    const errorVector = current.map((value, index) => value - exactValues[index]);
    const linf = errorVector.reduce((best, value) => Math.max(best, Math.abs(value)), 0);
    const l2 = Math.sqrt(errorVector.reduce((sum, value) => sum + value * value, 0) / errorVector.length);
    frames.push({
      time,
      values: [...current],
      exactValues,
      maxError: linf,
    });
    errors.push({ time, l2, linf });
    for (const value of current) {
      minValue = Math.min(minValue, value);
      maxValue = Math.max(maxValue, value);
    }
    if (step === timeSteps) break;

    const rhs = new Array(cells - 1).fill(0);
    for (let i = 1; i < cells; i += 1) {
      rhs[i - 1] =
        current[i] +
        (1 - theta) * r * (current[i - 1] - 2 * current[i] + current[i + 1]);
    }

    if (theta === 0) {
      const next = new Array(cells + 1).fill(0);
      for (let i = 1; i < cells; i += 1) next[i] = rhs[i - 1];
      current = next;
      continue;
    }

    const size = cells - 1;
    const lower = new Array(size - 1).fill(-theta * r);
    const diag = new Array(size).fill(1 + 2 * theta * r);
    const upper = new Array(size - 1).fill(-theta * r);
    const interior = solveTridiagonal(lower, diag, upper, rhs);
    const next = new Array(cells + 1).fill(0);
    for (let i = 1; i < cells; i += 1) next[i] = interior[i - 1];
    current = next;
  }

  return {
    xs,
    frames,
    errors,
    cells,
    timeSteps,
    dt,
    dx,
    r,
    valueRange: [minValue, maxValue],
    metadata: {
      methodId: method.id,
      methodName: method.name,
      exampleId: example.id,
      exampleName: example.name,
      theta,
    },
  };
}

function solveTridiagonal(lower: number[], diag: number[], upper: number[], rhs: number[]) {
  const n = diag.length;
  const cPrime = new Array(n - 1).fill(0);
  const dPrime = new Array(n).fill(0);
  cPrime[0] = upper[0] / diag[0];
  dPrime[0] = rhs[0] / diag[0];

  for (let i = 1; i < n; i += 1) {
    const denominator = diag[i] - lower[i - 1] * cPrime[i - 1];
    if (i < n - 1) cPrime[i] = upper[i] / denominator;
    dPrime[i] = (rhs[i] - lower[i - 1] * dPrime[i - 1]) / denominator;
  }

  const solution = new Array(n).fill(0);
  solution[n - 1] = dPrime[n - 1];
  for (let i = n - 2; i >= 0; i -= 1) solution[i] = dPrime[i] - cPrime[i] * solution[i + 1];
  return solution;
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
