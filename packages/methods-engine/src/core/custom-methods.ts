import { addScaled } from "./math";
import { analyzeCustomFormula, compileScalarExpression, includesKeyword, lookupAssignment, lookupAssignmentSource } from "./expression";
import { methods as odeMethods } from "../presets/ode";
import {
  integrationMethods,
  surfaceIntegrationMethods,
  volumeIntegrationMethods,
} from "../presets/integration";
import {
  buildCornerAverageSurfaceTraceDraft,
  buildCornerAverageVolumeTraceDraft,
  buildMidpointSurfaceTraceDraft,
  buildMidpointVolumeTraceDraft,
  buildTensorGaussSurfaceTraceDraft,
  buildTensorGaussVolumeTraceDraft,
} from "./integration";
import type {
  IntegrationMethodSpec,
  SurfaceIntegrationMethodSpec,
  VolumeIntegrationMethodSpec,
} from "./integration";
import { interpolationMethods } from "./interpolation";
import { matrixMethods } from "./matrix";
import { optimizationMethods } from "./optimization";
import { createCustomThetaPdeMethod } from "./pde";
import { probabilityMethods } from "./probability";
import { rootFindingMethods } from "./root-finding";
import type {
  InterpolationMethodSpec,
  MatrixMethodSpec,
  MethodSpec,
  OptimizationMethodSpec,
  PdeMethodSpec,
  ProbabilityMethodSpec,
  RootFindingMethodSpec,
} from "./types";

type CustomCompileResult<T> = {
  method: T;
  baseMethodId: string;
  confidence: number;
  notes: string[];
  parsed: Record<string, number | string | boolean>;
  execution: "matched" | "parametric-executable" | "formula-executable";
};

const stageColors = ["#f0e442", "#009e73", "#cc79a7", "#d55e00"];

export function compileCustomOdeMethod(input: string): CustomCompileResult<MethodSpec> {
  const analysis = analyzeCustomFormula(input);
  const rk2 = buildGenericRk2Method(input, analysis);
  const base = rk2?.method
    ?? (includesKeyword(analysis, "heun") || includesKeyword(analysis, "improvedeuler")
      ? createHeunMethod(input)
      : includesKeyword(analysis, "ralston")
        ? createRalstonMethod(input)
        : includesKeyword(analysis, "leapfrog") || includesKeyword(analysis, "verlet")
          ? createLeapfrogMethod(input)
          : cloneOdeMethod(matchByKeywords(analysis, odeMethods, [
              ["rk4", "rk4"],
              ["runge kutta 4", "rk4"],
              ["rungekutta4", "rk4"],
              ["midpoint", "midpoint"],
              ["rk2", "midpoint"],
              ["symplectic", "symplectic"],
              ["euler", "euler"],
            ]) ?? odeMethods[0]!, input, "Custom ODE"));
  const notes = [
    "Formula bajariladigan ODE stepper'ga compile qilindi.",
    rk2
      ? `Butcher-parametrli RK2 qurildi: a2=${rk2.meta.a2.toFixed(3)}, b1=${rk2.meta.b1.toFixed(3)}, b2=${rk2.meta.b2.toFixed(3)}, c2=${rk2.meta.c2.toFixed(3)}`
      : includesKeyword(analysis, "heun") || includesKeyword(analysis, "ralston")
        ? "Keyword bo'yicha yangi RK2 varianti qurildi."
        : "Eng yaqin ODE stepper oilasi tanlandi.",
  ];
  return {
    method: base,
    baseMethodId: base.id.replace(/^custom-/, ""),
    confidence: scoreConfidence(analysis, ["rk4", "euler", "midpoint", "rk2", "symplectic", "heun", "ralston", "leapfrog", "a2", "b1", "b2", "c2"]),
    notes,
    parsed: rk2 ? rk2.meta : analysis.assignments,
    execution: rk2 ? "parametric-executable" : "matched",
  };
}

export function compileCustomPdeMethod(input: string): CustomCompileResult<PdeMethodSpec> {
  const analysis = analyzeCustomFormula(input);
  const theta =
    lookupAssignment(analysis, ["theta", "eta"]) ??
    (includesKeyword(analysis, "crank") ? 0.5 : includesKeyword(analysis, "backward") || includesKeyword(analysis, "implicit") ? 1 : includesKeyword(analysis, "forward") || includesKeyword(analysis, "explicit") ? 0 : 0.5);
  const method = createCustomThetaPdeMethod(theta);
  return {
    method: {
      ...method,
      name: `Custom ${method.name}`,
      formula: input.trim() || method.formula,
      geometry: `${method.geometry} Compiler explicit/implicit/theta oilasini formula ichidan ajratdi.`,
    },
    baseMethodId: "custom-theta",
    confidence: scoreConfidence(analysis, ["theta", "crank", "implicit", "explicit", "heat", "diffusion"]),
    notes: [`Theta=${theta.toFixed(2)} parse qilindi.`],
    parsed: { theta },
    execution: "parametric-executable",
  };
}

export function compileCustomAreaIntegralMethod(input: string): CustomCompileResult<IntegrationMethodSpec> {
  const analysis = analyzeCustomFormula(input);
  const matched =
    matchByKeywords(analysis, integrationMethods, [
      ["adaptive", "adaptive-simpson"],
      ["romberg", "romberg"],
      ["clenshaw", "clenshaw-curtis"],
      ["chebyshev", "clenshaw-curtis"],
      ["monte carlo", "monte-carlo"],
      ["gauss", "gauss-2"],
      ["simpson", "simpson"],
      ["trapezoid", "trapezoid"],
      ["midpoint", "midpoint-rule"],
      ["left", "left-rectangle"],
      ["oscillatory", "clenshaw-curtis"],
      ["singular", "adaptive-simpson"],
    ]) ?? integrationMethods[2]!;
  return {
    method: {
      ...matched,
      id: `custom-${matched.id}`,
      name: `Custom ${matched.name}`,
      formula: input.trim() || matched.formula,
      geometry: `${matched.geometry} Custom compiler bu formulani shu quadrature oilasiga mos deb topdi.`,
    },
    baseMethodId: matched.id,
    confidence: scoreConfidence(analysis, ["adaptive", "romberg", "clenshaw", "chebyshev", "monte carlo", "gauss", "simpson", "trapezoid", "midpoint", "importance"]),
    notes: ["Area integral custom formula eng yaqin quadrature oilasiga biriktirildi."],
    parsed: { category: matched.category ?? "panel" },
    execution: "matched",
  };
}

export function compileCustomSurfaceIntegralMethod(input: string): CustomCompileResult<SurfaceIntegrationMethodSpec> {
  const analysis = analyzeCustomFormula(input);
  const matched = matchByKeywords(analysis, surfaceIntegrationMethods, [
    ["gauss", "surface-tensor-gauss"],
    ["tensor", "surface-tensor-gauss"],
    ["corner", "surface-corner-average"],
    ["trapezoid", "surface-corner-average"],
    ["midpoint", "surface-midpoint"],
  ]) ?? surfaceIntegrationMethods[0]!;
  return {
    method: {
      ...matched,
      id: `custom-${matched.id}`,
      name: `Custom ${matched.name}`,
      formula: input.trim() || matched.formula,
      geometry: `${matched.geometry} Sirt integrali uchun custom sample pattern shu oilaga compile qilindi.`,
      buildTrace:
        matched.id === "surface-tensor-gauss"
          ? (example, resolution) => buildTensorGaussSurfaceTraceDraft(example, resolution)
          : matched.id === "surface-corner-average"
            ? (example, resolution) => buildCornerAverageSurfaceTraceDraft(example, resolution)
            : (example, resolution) => buildMidpointSurfaceTraceDraft(example, resolution),
    },
    baseMethodId: matched.id,
    confidence: scoreConfidence(analysis, ["gauss", "tensor", "corner", "midpoint", "surface"]),
    notes: ["Surface custom method sample patternga compile qilindi."],
    parsed: {},
    execution: "matched",
  };
}

export function compileCustomVolumeIntegralMethod(input: string): CustomCompileResult<VolumeIntegrationMethodSpec> {
  const analysis = analyzeCustomFormula(input);
  const matched = matchByKeywords(analysis, volumeIntegrationMethods, [
    ["gauss", "volume-tensor-gauss"],
    ["tensor", "volume-tensor-gauss"],
    ["corner", "volume-corner-average"],
    ["trapezoid", "volume-corner-average"],
    ["midpoint", "volume-midpoint"],
    ["column", "volume-midpoint"],
  ]) ?? volumeIntegrationMethods[0]!;
  return {
    method: {
      ...matched,
      id: `custom-${matched.id}`,
      name: `Custom ${matched.name}`,
      formula: input.trim() || matched.formula,
      geometry: `${matched.geometry} Hajm integrali uchun ustun/sample grammatikasi shu method bilan ishga tushirildi.`,
      buildTrace:
        matched.id === "volume-tensor-gauss"
          ? (example, resolution) => buildTensorGaussVolumeTraceDraft(example, resolution)
          : matched.id === "volume-corner-average"
            ? (example, resolution) => buildCornerAverageVolumeTraceDraft(example, resolution)
            : (example, resolution) => buildMidpointVolumeTraceDraft(example, resolution),
    },
    baseMethodId: matched.id,
    confidence: scoreConfidence(analysis, ["gauss", "tensor", "corner", "midpoint", "volume"]),
    notes: ["Volume custom method column sampler oilasiga compile qilindi."],
    parsed: {},
    execution: "matched",
  };
}

export function compileCustomMatrixMethod(input: string): CustomCompileResult<MatrixMethodSpec> {
  const analysis = analyzeCustomFormula(input);
  const matched = matchByKeywords(analysis, matrixMethods, [
    ["conjugate gradient", "conjugate-gradient"],
    ["cg", "conjugate-gradient"],
    ["jacobi", "jacobi"],
    ["gauss seidel", "gauss-seidel"],
    ["sor", "sor"],
    ["richardson", "richardson"],
    ["landweber", "landweber-least-squares"],
    ["least squares", "landweber-least-squares"],
    ["inverse iteration", "inverse-iteration"],
    ["power", "power-iteration"],
    ["qr", "qr-iteration"],
    ["pca", "pca-svd"],
    ["svd", "pca-svd"],
  ]) ?? matrixMethods[0]!;
  const relaxation = lookupAssignment(analysis, ["omega", "eta", "step", "alpha", "relaxation"]) ?? matched.relaxation;
  return {
    method: {
      ...matched,
      id: `custom-${matched.id}`,
      name: `Custom ${matched.name}`,
      formula: input.trim() || matched.formula,
      geometry: `${matched.geometry} Compiler matritsa formulangizni shu iteration oilasiga bog'ladi.`,
      relaxation,
    },
    baseMethodId: matched.id,
    confidence: scoreConfidence(analysis, ["jacobi", "gauss seidel", "sor", "richardson", "cg", "power", "qr", "svd", "residual", "rayleigh"]),
    notes: relaxation !== undefined ? [`relaxation=${Number(relaxation).toFixed(3)} parse qilindi.`] : ["Base matrix method tanlandi."],
    parsed: relaxation !== undefined ? { relaxation } : {},
    execution: relaxation !== undefined ? "parametric-executable" : "matched",
  };
}

export function compileCustomRootFindingMethod(input: string): CustomCompileResult<RootFindingMethodSpec> {
  const analysis = analyzeCustomFormula(input);
  const matched = matchByKeywords(analysis, rootFindingMethods, [
    ["illinois", "illinois"],
    ["false position", "false-position"],
    ["regula falsi", "false-position"],
    ["newton", "newton"],
    ["secant", "secant"],
    ["bisection", "bisection"],
  ]) ?? rootFindingMethods[0]!;
  const damping = lookupAssignment(analysis, ["lambda", "damping", "alpha", "step"]);
  const compiledStep = buildCustomRootStep(analysis);
  const execution = compiledStep ? "formula-executable" : damping !== undefined ? "parametric-executable" : "matched";
  return {
    method: {
      ...matched,
      id: `custom-${matched.id}`,
      name: `Custom ${matched.name}`,
      formula: input.trim() || matched.formula,
      geometry: `${matched.geometry} Compiler root step formulani shu oilaga yaqin deb topdi.`,
      damping,
      customStep: compiledStep ?? undefined,
    },
    baseMethodId: matched.id,
    confidence: scoreConfidence(analysis, ["newton", "secant", "bisection", "illinois", "false position", "derivative", "bracket"]),
    notes: [
      "Root-finding custom formula bracket/tangent/secant oilalaridan biriga biriktirildi.",
      compiledStep ? "x_next formulasi to'g'ridan-to'g'ri executable qadamga aylantirildi." : "family default qadam modeli ishlatiladi.",
      damping !== undefined ? `damping=${Number(damping).toFixed(3)} parse qilindi.` : "default damping",
    ],
    parsed: { ...(damping !== undefined ? { damping } : {}), ...(compiledStep ? { xnext: "custom" } : {}) },
    execution,
  };
}

export function compileCustomInterpolationMethod(input: string): CustomCompileResult<InterpolationMethodSpec> {
  const analysis = analyzeCustomFormula(input);
  const matched = matchByKeywords(analysis, interpolationMethods, [
    ["chebyshev", "chebyshev-barycentric"],
    ["barycentric", "chebyshev-barycentric"],
    ["spline", "cubic-spline"],
    ["piecewise", "piecewise-linear"],
    ["linear", "piecewise-linear"],
    ["newton", "newton-divided-difference"],
    ["lagrange", "lagrange"],
  ]) ?? interpolationMethods[0]!;
  const nodeLayout =
    includesKeyword(analysis, "chebyshev") ? "chebyshev" :
    includesKeyword(analysis, "uniform") ? "uniform" :
    matched.nodeLayout ?? "uniform";
  const nodeBias = lookupAssignment(analysis, ["nodebias", "bias", "density", "cluster"]);
  return {
    method: {
      ...matched,
      id: `custom-${matched.id}`,
      name: `Custom ${matched.name}`,
      formula: input.trim() || matched.formula,
      geometry: `${matched.geometry} Compiler reconstruction formulani shu approximation oilasiga qo'shdi.`,
      nodeLayout,
      nodeBias,
    },
    baseMethodId: matched.id,
    confidence: scoreConfidence(analysis, ["chebyshev", "barycentric", "spline", "linear", "newton", "lagrange", "nodes", "piecewise"]),
    notes: ["Interpolation custom method support va node layout bo'yicha compile qilindi."],
    parsed: { nodeLayout, ...(nodeBias !== undefined ? { nodeBias } : {}) },
    execution: nodeBias !== undefined || nodeLayout !== (matched.nodeLayout ?? "uniform") ? "parametric-executable" : "matched",
  };
}

export function compileCustomOptimizationMethod(input: string): CustomCompileResult<OptimizationMethodSpec> {
  const analysis = analyzeCustomFormula(input);
  const matched = matchByKeywords(analysis, optimizationMethods, [
    ["nesterov", "nesterov"],
    ["momentum", "momentum"],
    ["newton", "newton-optimization"],
    ["gradient", "gradient-descent"],
    ["descent", "gradient-descent"],
  ]) ?? optimizationMethods[0]!;
  const stepScale = lookupAssignment(analysis, ["eta", "step", "lr", "learningrate", "alpha"]) ?? matched.stepScale;
  const momentum = lookupAssignment(analysis, ["beta", "momentum"]) ?? matched.momentum;
  const customUpdate = buildCustomOptimizationUpdate(analysis);
  const execution = customUpdate ? "formula-executable" : stepScale !== matched.stepScale || momentum !== matched.momentum ? "parametric-executable" : "matched";
  return {
    method: {
      ...matched,
      id: `custom-${matched.id}`,
      name: `Custom ${matched.name}`,
      formula: input.trim() || matched.formula,
      geometry: `${matched.geometry} Compiler descent formulasidan step/momentum parametrlarini parse qildi.`,
      stepScale,
      momentum,
      customUpdate: customUpdate ?? undefined,
    },
    baseMethodId: matched.id,
    confidence: scoreConfidence(analysis, ["nesterov", "momentum", "newton", "gradient", "descent", "hessian", "lookahead"]),
    notes: [
      customUpdate ? "x_next va y_next formulalari executable update rule bo'ldi." : "family default update modeli ishlatiladi.",
      stepScale !== undefined ? `step-scale=${Number(stepScale).toFixed(3)}` : "default step-scale",
      momentum !== undefined ? `momentum=${Number(momentum).toFixed(3)}` : "default momentum",
    ],
    parsed: { stepScale, momentum: momentum ?? 0, ...(customUpdate ? { xnext: "custom", ynext: "custom" } : {}) },
    execution,
  };
}

export function compileCustomProbabilityMethod(input: string): CustomCompileResult<ProbabilityMethodSpec> {
  const analysis = analyzeCustomFormula(input);
  const matched = matchByKeywords(analysis, probabilityMethods, [
    ["antithetic", "antithetic-monte-carlo"],
    ["exact", "monte-carlo"],
    ["milstein", "milstein"],
    ["euler", "euler-maruyama"],
    ["maruyama", "euler-maruyama"],
    ["monte carlo", "monte-carlo"],
  ]) ?? probabilityMethods[0]!;
  const noiseCorrection = lookupAssignment(analysis, ["noisecorrection", "correction", "lambda", "beta"]) ?? matched.noiseCorrection;
  return {
    method: {
      ...matched,
      id: `custom-${matched.id}`,
      name: `Custom ${matched.name}`,
      formula: input.trim() || matched.formula,
      geometry: `${matched.geometry} Compiler stochastic update oilasini aniqlab, noise correction parametrini o'qidi.`,
      noiseCorrection,
    },
    baseMethodId: matched.id,
    confidence: scoreConfidence(analysis, ["antithetic", "exact", "milstein", "euler", "maruyama", "monte carlo", "dw", "sigma"]),
    notes: [noiseCorrection !== undefined ? `noise-correction=${Number(noiseCorrection).toFixed(3)}` : "default stochastic correction"],
    parsed: { noiseCorrection },
    execution: noiseCorrection !== matched.noiseCorrection ? "parametric-executable" : "matched",
  };
}

function cloneOdeMethod(base: MethodSpec, formula: string, prefix: string): MethodSpec {
  return {
    ...base,
    id: `custom-${base.id}`,
    name: `${prefix} ${base.name}`,
    formula: formula.trim() || base.formula,
    geometry: `${base.geometry} Custom compiler shu family ichida executable stepper yaratdi.`,
  };
}

function createHeunMethod(formula: string): MethodSpec {
  return {
    id: "custom-heun",
    name: "Custom Heun RK2",
    formula: formula.trim() || "y_{n+1}=y_n+\\frac{h}{2}(k_1+k_2)",
    stability: "Second-order explicit predictor-corrector",
    color: "#22c55e",
    geometry: "Avval predictor, keyin endpoint slope bilan correction qilinadi; stage'lar shu ikkita qarorni ko'rsatadi.",
    computeStep: (point, t, h, field) => {
      const k1 = field(point, t);
      const predictor = addScaled(point, k1, h);
      const k2 = field(predictor, t + h);
      return {
        next: [
          point[0] + (h * (k1[0] + k2[0])) / 2,
          point[1] + (h * (k1[1] + k2[1])) / 2,
          point[2] + (h * (k1[2] + k2[2])) / 2,
        ],
        stages: [
          { label: "k1", sample: point, vectorEnd: predictor, color: stageColors[0] },
          { label: "k2", sample: predictor, vectorEnd: addScaled(predictor, k2, h / 2), color: stageColors[1] },
        ],
      };
    },
  };
}

function createRalstonMethod(formula: string): MethodSpec {
  return {
    id: "custom-ralston",
    name: "Custom Ralston RK2",
    formula: formula.trim() || "y_{n+1}=y_n+h(\\frac14 k_1+\\frac34 k_2),\\; k_2=f(y_n+\\frac23hk_1)",
    stability: "Second-order explicit RK2",
    color: "#8b5cf6",
    geometry: "Ikkinchi stage 2/3 qadamda olinadi; bu RK2 oilasida xatoni ko'proq balanslaydi.",
    computeStep: (point, t, h, field) => {
      const k1 = field(point, t);
      const p2 = addScaled(point, k1, (2 * h) / 3);
      const k2 = field(p2, t + (2 * h) / 3);
      return {
        next: [
          point[0] + h * (0.25 * k1[0] + 0.75 * k2[0]),
          point[1] + h * (0.25 * k1[1] + 0.75 * k2[1]),
          point[2] + h * (0.25 * k1[2] + 0.75 * k2[2]),
        ],
        stages: [
          { label: "k1", sample: point, vectorEnd: addScaled(point, k1, h / 2), color: stageColors[0] },
          { label: "k2", sample: p2, vectorEnd: addScaled(p2, k2, h / 3), color: stageColors[1] },
        ],
      };
    },
  };
}

function createLeapfrogMethod(formula: string): MethodSpec {
  return {
    id: "custom-leapfrog",
    name: "Custom Leapfrog",
    formula: formula.trim() || "v_{n+1/2}=v_n-\\frac{h}{2}x_n,\\; x_{n+1}=x_n+h v_{n+1/2},\\; v_{n+1}=v_{n+1/2}-\\frac{h}{2}x_{n+1}",
    stability: "Symplectic splitting for oscillator-like systems",
    color: "#f97316",
    geometry: "Yarim-qadam velocity va to'liq-qadam position almashinadi; Hamilton orbitlarda geometriyani saqlash kuchliroq.",
    computeStep: (point, _t, h) => {
      const vHalf = point[1] - (h / 2) * point[0];
      const xNext = point[0] + h * vHalf;
      const vNext = vHalf - (h / 2) * xNext;
      const next: [number, number, number] = [xNext, vNext, point[2]];
      return {
        next,
        stages: [
          { label: "v1/2", sample: point, vectorEnd: [point[0], vHalf, point[2]], color: stageColors[0] },
          { label: "x", sample: [point[0], vHalf, point[2]], vectorEnd: [xNext, vHalf, point[2]], color: stageColors[1] },
          { label: "v", sample: [xNext, vHalf, point[2]], vectorEnd: next, color: stageColors[2] },
        ],
      };
    },
  };
}

function matchByKeywords<T extends { id: string }>(
  analysis: ReturnType<typeof analyzeCustomFormula>,
  items: readonly T[],
  rules: Array<[string, string]>,
) {
  for (const [token, id] of rules) {
    if (includesKeyword(analysis, token)) return items.find((item) => item.id === id);
  }
  return null;
}

function scoreConfidence(analysis: ReturnType<typeof analyzeCustomFormula>, tokens: string[]) {
  const hits = tokens.filter((token) => includesKeyword(analysis, token) || token in analysis.assignments).length;
  return Math.max(0.45, Math.min(0.97, 0.45 + hits * 0.08));
}

function buildGenericRk2Method(input: string, analysis: ReturnType<typeof analyzeCustomFormula>) {
  const a2 = lookupAssignment(analysis, ["a2"]);
  const b1 = lookupAssignment(analysis, ["b1"]);
  const b2 = lookupAssignment(analysis, ["b2"]);
  const c2 = lookupAssignment(analysis, ["c2"]) ?? a2;

  if ([a2, b1, b2, c2].some((value) => value === undefined)) {
    return null;
  }

  const safeA2 = Number(a2);
  const safeB1 = Number(b1);
  const safeB2 = Number(b2);
  const safeC2 = Number(c2);

  if (![safeA2, safeB1, safeB2, safeC2].every(Number.isFinite) || Math.abs(safeA2) < 1e-9) {
    return null;
  }

  const method: MethodSpec = {
    id: "custom-rk2-parametric",
    name: "Custom RK2 Tableau",
    formula: input.trim() || `a2=${safeA2}, b1=${safeB1}, b2=${safeB2}, c2=${safeC2}`,
    stability: "User-defined 2-stage explicit Runge-Kutta",
    color: "#0ea5e9",
    geometry: "Ikki stage'li RK geometriyasi user kiritgan Butcher parametrlaridan qurildi; sahnada slope sampling va weighted blend ko'rsatiladi.",
    computeStep: (point, t, h, field) => {
      const k1 = field(point, t);
      const stagePoint = addScaled(point, k1, safeA2 * h);
      const k2 = field(stagePoint, t + safeC2 * h);
      return {
        next: [
          point[0] + h * (safeB1 * k1[0] + safeB2 * k2[0]),
          point[1] + h * (safeB1 * k1[1] + safeB2 * k2[1]),
          point[2] + h * (safeB1 * k1[2] + safeB2 * k2[2]),
        ],
        stages: [
          { label: "k1", sample: point, vectorEnd: addScaled(point, k1, h / 2), color: stageColors[0] },
          { label: "k2", sample: stagePoint, vectorEnd: addScaled(stagePoint, k2, h / 2), color: stageColors[1] },
        ],
      };
    },
  };

  return {
    method,
    meta: { a2: safeA2, b1: safeB1, b2: safeB2, c2: safeC2 },
  };
}

function buildCustomOptimizationUpdate(analysis: ReturnType<typeof analyzeCustomFormula>) {
  const xNextSource = lookupAssignmentSource(analysis, ["xnext"]);
  const yNextSource = lookupAssignmentSource(analysis, ["ynext"]);
  if (!xNextSource || !yNextSource) return null;

  try {
    const xNextExpression = compileScalarExpression(xNextSource);
    const yNextExpression = compileScalarExpression(yNextSource);
    return (context: {
      x: number;
      y: number;
      gx: number;
      gy: number;
      vx: number;
      vy: number;
      eta: number;
      beta: number;
      stepScale: number;
    }): [number, number] => {
      const scope = { ...context };
      const nextX = xNextExpression.evaluate(scope);
      const nextY = yNextExpression.evaluate(scope);
      return [nextX - context.x, nextY - context.y];
    };
  } catch {
    return null;
  }
}

function buildCustomRootStep(analysis: ReturnType<typeof analyzeCustomFormula>) {
  const xNextSource = lookupAssignmentSource(analysis, ["xnext"]);
  if (!xNextSource) return null;

  try {
    const expression = compileScalarExpression(xNextSource);
    return (context: {
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
    }) => expression.evaluate({
      x: context.x,
      fx: context.fx,
      df: context.dfx,
      dfx: context.dfx,
      xprev: context.xPrev,
      fprev: context.fPrev,
      a: context.a,
      b: context.b,
      fa: context.fa,
      fb: context.fb,
      mid: context.mid,
    });
  } catch {
    return null;
  }
}
