import type {
  CustomSchemeDraft,
  OperatorAnalysis,
  OperatorFamilyMatch,
  OperatorFamilySpec,
  OperatorRegistry,
  OperatorSchemeSpec,
} from "./types";

export function defineOperatorScheme<T extends OperatorSchemeSpec>(scheme: T): T {
  return scheme;
}

export function defineOperatorFamily<T extends OperatorFamilySpec>(family: T): T {
  return family;
}

export function createOperatorRegistry(families: readonly OperatorFamilySpec[]): OperatorRegistry {
  return {
    families,
    familiesById: Object.fromEntries(families.map((family) => [family.id, family])) as OperatorRegistry["familiesById"],
  };
}

export function indexOperatorFamilies(families: readonly OperatorFamilySpec[]) {
  return createOperatorRegistry(families).familiesById;
}

export function analyzeOperatorInput(input: string, registry: OperatorRegistry): OperatorAnalysis {
  const normalizedInput = normalizeInput(input);
  const matches = registry.families
    .map((family) => scoreFamily(normalizedInput, family))
    .sort((left, right) => right.score - left.score);

  const winner = matches[0] ?? scoreFallback(normalizedInput, registry.families[0]);
  const family = winner.family;
  const confidence = Math.max(0.18, Math.min(0.99, winner.score / 8));
  const customSchemeName = `Custom ${family.name} scheme`;
  const customSchemeFormula = buildCustomFormulaSkeleton(family.id, normalizedInput);

  return {
    input,
    normalizedInput,
    family,
    score: winner.score,
    confidence,
    reasons: winner.reasons,
    schemeHints: family.schemes,
    customSchemeName,
    customSchemeFormula,
  };
}

export function createOperatorAnalysisLabel(analysis: OperatorAnalysis) {
  return {
    familyId: analysis.family.id,
    familyName: analysis.family.name,
    visualGrammar: analysis.family.visualGrammar,
    status: analysis.family.status,
    confidence: analysis.confidence,
  };
}

export function createCustomSchemeDraft(analysis: OperatorAnalysis): CustomSchemeDraft {
  return {
    familyId: analysis.family.id,
    familyName: analysis.family.name,
    schemeName: analysis.customSchemeName,
    formula: analysis.customSchemeFormula,
    visualGrammar: analysis.family.visualGrammar,
    status: analysis.family.status,
  };
}

function scoreFamily(input: string, family: OperatorFamilySpec): OperatorFamilyMatch {
  const keywords = familyKeywords[family.id];
  let score = 0;
  const reasons: string[] = [];

  for (const { token, weight, reason } of keywords) {
    if (!input.includes(token)) continue;
    score += weight;
    reasons.push(reason);
  }

  if (input.includes(family.name.toLowerCase())) {
    score += 3;
    reasons.push(`family name matched: ${family.name}`);
  }

  if (score === 0) {
    score = family.status === "active" ? 1.2 : 0.8;
    reasons.push("fallback visual grammar match");
  }

  return { family, score, reasons };
}

function scoreFallback(input: string, family?: OperatorFamilySpec): OperatorFamilyMatch {
  if (!family) {
    throw new Error("Operator registry is empty.");
  }
  return {
    family,
    score: 0,
    reasons: [input ? "fallback to first registered family" : "empty input fallback"],
  };
}

function normalizeInput(input: string) {
  return input
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[{}[\]():;,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildCustomFormulaSkeleton(familyId: OperatorFamilySpec["id"], input: string) {
  const familySkeletons: Record<OperatorFamilySpec["id"], string> = {
    ode: "y_{n+1} = y_n + h * F(y_n, t_n)",
    integral: "\\int_a^b f(x)\\,dx \\approx \\sum_i w_i f(x_i)",
    pde: "u^{n+1}_i = \\mathcal{S}(u^n, \\Delta x, \\Delta t)",
    matrix: "x^{k+1} = \\mathcal{T}(A, x^k, b)",
    "root-finding": "x_{k+1} = x_k - \\alpha_k \\frac{f(x_k)}{f'(x_k)}",
    optimization: "x_{k+1} = x_k - \\eta_k \\nabla f(x_k)",
    probability: "X_{t+\\Delta t} = X_t + \\mu(X_t,t)\\Delta t + \\sigma(X_t,t)\\sqrt{\\Delta t}\\,\\xi_t",
    interpolation: "p_n(x) = \\sum_{i=0}^{n} y_i L_i(x)",
  };

  const skeleton = familySkeletons[familyId];
  if (input.includes("latex") || input.includes("\\")) return skeleton;
  return skeleton;
}

const familyKeywords: Record<OperatorFamilySpec["id"], Array<{ token: string; weight: number; reason: string }>> = {
  ode: [
    { token: "y'", weight: 4, reason: "first-order derivative notation detected" },
    { token: "x'", weight: 4, reason: "state evolution notation detected" },
    { token: "rk4", weight: 4, reason: "Runge-Kutta keyword detected" },
    { token: "euler", weight: 3, reason: "Euler family keyword detected" },
    { token: "vector field", weight: 3, reason: "flow field wording detected" },
    { token: "trajectory", weight: 3, reason: "trajectory wording detected" },
  ],
  integral: [
    { token: "\\int", weight: 5, reason: "integral symbol detected" },
    { token: "integral", weight: 3, reason: "integral wording detected" },
    { token: "simpson", weight: 4, reason: "Simpson quadrature keyword detected" },
    { token: "trapezoid", weight: 4, reason: "Trapezoid quadrature keyword detected" },
    { token: "panel", weight: 3, reason: "panel partition wording detected" },
    { token: "volume", weight: 2, reason: "accumulation / volume wording detected" },
  ],
  pde: [
    { token: "u_t", weight: 5, reason: "time derivative of field detected" },
    { token: "u_xx", weight: 5, reason: "spatial second derivative detected" },
    { token: "diffusion", weight: 4, reason: "diffusion wording detected" },
    { token: "heat", weight: 3, reason: "heat equation wording detected" },
    { token: "boundary", weight: 3, reason: "boundary condition wording detected" },
    { token: "crank-nicolson", weight: 4, reason: "Crank-Nicolson keyword detected" },
  ],
  matrix: [
    { token: "matrix", weight: 5, reason: "matrix wording detected" },
    { token: "jacobi", weight: 4, reason: "Jacobi iteration detected" },
    { token: "gauss-seidel", weight: 4, reason: "Gauss-Seidel iteration detected" },
    { token: "eigen", weight: 4, reason: "eigen / spectral wording detected" },
    { token: "linear system", weight: 4, reason: "linear system wording detected" },
    { token: "basis", weight: 3, reason: "basis deformation wording detected" },
  ],
  "root-finding": [
    { token: "root", weight: 4, reason: "root wording detected" },
    { token: "zero", weight: 3, reason: "zero finding wording detected" },
    { token: "newton", weight: 5, reason: "Newton method detected" },
    { token: "secant", weight: 4, reason: "Secant method detected" },
    { token: "bisection", weight: 4, reason: "Bisection method detected" },
    { token: "bracket", weight: 3, reason: "bracketing wording detected" },
  ],
  optimization: [
    { token: "minimize", weight: 4, reason: "minimization wording detected" },
    { token: "argmin", weight: 4, reason: "argmin wording detected" },
    { token: "gradient", weight: 4, reason: "gradient wording detected" },
    { token: "descent", weight: 4, reason: "descent wording detected" },
    { token: "loss", weight: 3, reason: "loss landscape wording detected" },
    { token: "hessian", weight: 4, reason: "Hessian wording detected" },
  ],
  probability: [
    { token: "probability", weight: 4, reason: "probability wording detected" },
    { token: "stochastic", weight: 5, reason: "stochastic wording detected" },
    { token: "sde", weight: 5, reason: "SDE keyword detected" },
    { token: "brownian", weight: 5, reason: "Brownian motion wording detected" },
    { token: "random walk", weight: 4, reason: "random walk wording detected" },
    { token: "noise", weight: 3, reason: "noise wording detected" },
    { token: "variance", weight: 3, reason: "variance wording detected" },
    { token: "diffusion", weight: 3, reason: "stochastic diffusion wording detected" },
  ],
  interpolation: [
    { token: "interpolation", weight: 5, reason: "interpolation wording detected" },
    { token: "approximation", weight: 4, reason: "approximation wording detected" },
    { token: "lagrange", weight: 5, reason: "Lagrange keyword detected" },
    { token: "spline", weight: 5, reason: "Spline keyword detected" },
    { token: "polynomial", weight: 4, reason: "polynomial wording detected" },
    { token: "fit", weight: 3, reason: "curve fitting wording detected" },
    { token: "nodes", weight: 3, reason: "interpolation nodes detected" },
  ],
};
