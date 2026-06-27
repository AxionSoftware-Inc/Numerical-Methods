import type { RootFindingExampleSpec, RootFindingMethodSpec, RootFindingTrace, RootFindingStepTrace } from "./types";

export const rootFindingMethods: RootFindingMethodSpec[] = [
  {
    id: "bisection",
    name: "Bisection",
    formula: "x_(k+1)=(a_k+b_k)/2",
    color: "#f97316",
    order: "Linear, guaranteed with valid bracket",
    stability: "Eng ishonchli usul, lekin tez emas",
    geometry: "Interval yarmiga bo'linib boradi, shuning uchun root atrofidagi siqilish juda aniq ko'rinadi.",
    usesBracket: true,
  },
  {
    id: "false-position",
    name: "False Position",
    formula: "x_(k+1)=a_k-f(a_k)(b_k-a_k)/(f(b_k)-f(a_k))",
    color: "#ec4899",
    order: "Linear, bracketed secant",
    stability: "Bracket saqlanadi, lekin bir tomoni sekin qotib qolishi mumkin",
    geometry: "Secant chizig'i bilan bracket birga yuradi, shu sabab sign structure saqlanadi.",
    usesBracket: true,
  },
  {
    id: "illinois",
    name: "Illinois",
    formula: "x_{k+1}=a_k-f(a_k)(b_k-a_k)/(f(b_k)-f(a_k)),\\; stagnant endpoint\\to f/2",
    color: "#14b8a6",
    order: "Improved false-position",
    stability: "Bracketni saqlab qoladi va false-position'dagi bir tomon qotib qolish muammosini yumshatadi",
    geometry: "Secant va bracket birga yuradi, lekin bir endpoint uzoq qotib qolsa uning og'irligi pasaytiriladi.",
    usesBracket: true,
  },
  {
    id: "secant",
    name: "Secant",
    formula: "x_(k+1)=x_k-f(x_k)(x_k-x_(k-1))/(f(x_k)-f(x_(k-1)))",
    color: "#a78bfa",
    order: "Superlinear",
    stability: "Start juftligi yomon bo'lsa chayqalishi mumkin",
    geometry: "Ikki nuqta orasidagi secant keyingi taxminni beradi va path root tomonga tez bukiladi.",
  },
  {
    id: "newton",
    name: "Newton",
    formula: "x_(k+1)=x_k-f(x_k)/f'(x_k)",
    color: "#22d3ee",
    order: "Quadratic near simple roots",
    stability: "f'(x) nolga yaqin joyda sezgir",
    geometry: "Tangent chizig'i local linearization'ni ko'rsatib, rootga keskin sakrash beradi.",
    requiresDerivative: true,
  },
];

export const rootFindingExamples: RootFindingExampleSpec[] = [
  {
    id: "cubic-balance",
    name: "Cubic Balance",
    shortName: "Cubic",
    equation: "f(x)=x^3-x-1",
    xRange: [-1.4, 1.8],
    initialBracket: [1, 1.5],
    initialPair: [1, 1.5],
    newtonStart: 1.25,
    exactRoot: 1.3247179572447458,
    defaultIterations: 9,
    minIterations: 2,
    maxIterations: 16,
    evaluate: (x) => x ** 3 - x - 1,
    derivative: (x) => 3 * x * x - 1,
    interpretation: "Oddiy, lekin nolinear root. Bracket va tangent usullarining xarakter farqi juda yaxshi ko'rinadi.",
  },
  {
    id: "cosine-fixed-point",
    name: "Cosine Crossing",
    shortName: "Cosine",
    equation: "f(x)=cos(x)-x",
    xRange: [-0.4, 1.2],
    initialBracket: [0, 1],
    initialPair: [0.2, 1],
    newtonStart: 0.8,
    exactRoot: 0.7390851332151607,
    defaultIterations: 8,
    minIterations: 2,
    maxIterations: 16,
    evaluate: (x) => Math.cos(x) - x,
    derivative: (x) => -Math.sin(x) - 1,
    interpretation: "Fixed-pointga yaqin holat bo'lib, Newton va secant usullari bu yerda tez farqlanadi.",
  },
  {
    id: "flat-multiple",
    name: "Flat Multiple Root",
    shortName: "Flat",
    equation: "f(x)=(x-1)^2(x+2)",
    xRange: [-2.4, 2.2],
    initialBracket: [0.2, 1.8],
    initialPair: [0.2, 1.8],
    newtonStart: 1.6,
    exactRoot: 1,
    defaultIterations: 10,
    minIterations: 2,
    maxIterations: 18,
    evaluate: (x) => (x - 1) ** 2 * (x + 2),
    derivative: (x) => 2 * (x - 1) * (x + 2) + (x - 1) ** 2,
    interpretation: "Ko'paytma root yonida derivative kichrayadi; shu sabab Newton ham sekinlashishi mumkin.",
  },
];

export function buildRootFindingTrace(
  method: RootFindingMethodSpec,
  example: RootFindingExampleSpec,
  options: { iterations: number },
): RootFindingTrace {
  const iterations = clampInt(options.iterations, example.minIterations, example.maxIterations);
  const steps: RootFindingStepTrace[] = [];

  if (method.id === "bisection" || method.id === "false-position" || method.id === "illinois") {
    let [a, b] = example.initialBracket;
    let fa = example.evaluate(a);
    let fb = example.evaluate(b);
    let lastUpdated: "left" | "right" | null = null;

    for (let index = 0; index <= iterations; index += 1) {
      const xCandidate = method.customStep
        ? method.customStep({
            x: (a + b) / 2,
            fx: example.evaluate((a + b) / 2),
            dfx: example.derivative((a + b) / 2),
            xPrev: (a + b) / 2,
            fPrev: example.evaluate((a + b) / 2),
            a,
            b,
            fa,
            fb,
            mid: (a + b) / 2,
          })
        : method.id === "bisection"
          ? (a + b) / 2
          : a - (fa * (b - a)) / safeDifference(fb - fa);
      const damping = clamp(method.damping ?? 1, 0.05, 1.4);
      const anchor = method.id === "bisection" ? (a + b) / 2 : (a + b) / 2;
      const x = anchor + damping * (xCandidate - anchor);
      const fx = example.evaluate(x);
      const prevX = index === 0 ? x : steps[index - 1]!.x;

      steps.push({
        index,
        x,
        fx,
        error: Math.abs(x - example.exactRoot),
        stepSize: index === 0 ? 0 : Math.abs(x - prevX),
        bracket: [a, b],
        line:
          method.id === "false-position"
            ? {
                from: [a, fa],
                to: [b, fb],
                kind: "secant",
              }
            : {
                from: [a, 0],
                to: [b, 0],
                kind: "bracket",
              },
        intervalWidth: Math.abs(b - a),
      });

      if (index < iterations) {
        if (fa * fx <= 0) {
          b = x;
          fb = fx;
          if (method.id === "illinois" && lastUpdated === "right") {
            fa *= 0.5;
          }
          lastUpdated = "right";
        } else {
          a = x;
          fa = fx;
          if (method.id === "illinois" && lastUpdated === "left") {
            fb *= 0.5;
          }
          lastUpdated = "left";
        }
      }
    }
  } else if (method.id === "secant") {
    let x0 = example.initialPair[0];
    let x1 = example.initialPair[1];

    for (let index = 0; index <= iterations; index += 1) {
      const f0 = example.evaluate(x0);
      const f1 = example.evaluate(x1);
      const raw = method.customStep
        ? method.customStep({
            x: x1,
            fx: f1,
            dfx: example.derivative(x1),
            xPrev: x0,
            fPrev: f0,
            a: Math.min(x0, x1),
            b: Math.max(x0, x1),
            fa: f0,
            fb: f1,
            mid: (x0 + x1) / 2,
          })
        : index === 0
          ? x1
          : x1 - (f1 * (x1 - x0)) / safeDifference(f1 - f0);
      const damping = clamp(method.damping ?? 1, 0.1, 1.6);
      const x = index === 0 ? raw : x1 + damping * (raw - x1);
      const fx = example.evaluate(x);
      const left = Math.min(x0, x1);
      const right = Math.max(x0, x1);

      steps.push({
        index,
        x,
        fx,
        error: Math.abs(x - example.exactRoot),
        stepSize: Math.abs(x - x1),
        bracket: [left, right],
        line: {
          from: [x0, f0],
          to: [x1, f1],
          kind: "secant",
        },
        intervalWidth: Math.abs(right - left),
      });

      x0 = x1;
      x1 = x;
    }
  } else {
    let x = example.newtonStart;

    for (let index = 0; index <= iterations; index += 1) {
      const fx = example.evaluate(x);
      const dfx = example.derivative(x);
      const rawNext = method.customStep
        ? method.customStep({
            x,
            fx,
            dfx,
            xPrev: index === 0 ? x : steps[index - 1]!.x,
            fPrev: index === 0 ? fx : steps[index - 1]!.fx,
            a: Math.min(x, example.exactRoot),
            b: Math.max(x, example.exactRoot),
            fa: fx,
            fb: example.evaluate(example.exactRoot),
            mid: x,
          })
        : x - fx / safeDerivative(dfx);
      const damping = clamp(method.damping ?? 1, 0.05, 1.6);
      const next = x + damping * (rawNext - x);
      const tangentEndX = next;

      steps.push({
        index,
        x,
        fx,
        error: Math.abs(x - example.exactRoot),
        stepSize: index === 0 ? 0 : Math.abs(x - steps[index - 1]!.x),
        bracket: [Math.min(x, next), Math.max(x, next)],
        line: {
          from: [x, fx],
          to: [tangentEndX, 0],
          kind: "tangent",
        },
        intervalWidth: Math.abs(next - x),
      });

      x = next;
    }
  }

  const last = steps[steps.length - 1]!;
  const initialResidual = Math.abs(steps[0]?.fx ?? last.fx);
  const residualReduction = Math.abs(last.fx) > 0 ? initialResidual / Math.abs(last.fx) : Number.POSITIVE_INFINITY;
  const contractionSamples = steps.slice(1).map((step, index) => Math.abs(step.fx) / Math.max(Math.abs(steps[index]!.fx), 1e-12));
  const averageContraction =
    contractionSamples.length > 0
      ? contractionSamples.reduce((sum, value) => sum + value, 0) / contractionSamples.length
      : 1;
  const bracketRetentionRate =
    steps.reduce((sum, step) => {
      const [left, right] = step.bracket;
      return sum + (example.exactRoot >= Math.min(left, right) && example.exactRoot <= Math.max(left, right) ? 1 : 0);
    }, 0) / Math.max(steps.length, 1);
  const derivativeStress =
    method.id === "newton"
      ? steps.reduce((sum, step) => sum + 1 / Math.max(Math.abs(example.derivative(step.x)), 1e-6), 0) / Math.max(steps.length, 1)
      : method.id === "secant"
        ? steps.slice(1).reduce((sum, step, index) => sum + 1 / Math.max(Math.abs(step.x - steps[index]!.x), 1e-6), 0) / Math.max(steps.length - 1, 1)
        : 0;
  const oscillationCount = steps.slice(2).reduce((sum, step, index) => {
    const prev = steps[index + 1]!;
    const before = steps[index]!;
    const left = prev.x - before.x;
    const right = step.x - prev.x;
    return sum + (left * right < 0 ? 1 : 0);
  }, 0);
  const stagnationCount = steps.slice(1).filter((step, index) => Math.abs(step.x - steps[index]!.x) < 1e-5 || Math.abs(step.fx) > Math.abs(steps[index]!.fx) * 0.995).length;
  return {
    steps,
    initialResidual,
    finalResidual: Math.abs(last.fx),
    finalError: last.error,
    finalIntervalWidth: last.intervalWidth,
    iterations,
    residualReduction,
    averageContraction,
    bracketRetentionRate,
    derivativeStress,
    oscillationCount,
    stagnationCount,
    metadata: {
      methodId: method.id,
      methodName: method.name,
      exampleId: example.id,
      exampleName: example.name,
    },
  };
}

function safeDerivative(value: number) {
  return Math.abs(value) < 1e-6 ? (value < 0 ? -1e-6 : 1e-6) : value;
}

function safeDifference(value: number) {
  return Math.abs(value) < 1e-9 ? (value < 0 ? -1e-9 : 1e-9) : value;
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
