import type { MatrixExampleSpec, MatrixMethodSpec, MatrixTrace, MatrixStepTrace } from "./types";

export const matrixMethods: MatrixMethodSpec[] = [
  {
    id: "jacobi",
    name: "Jacobi",
    formula: "x^(k+1)=D^(-1)(b-(L+U)x^(k))",
    color: "#60a5fa",
    order: "Linear convergence under diagonal dominance",
    stability: "Diagonal dominance kuchli bo'lsa aniq ishlaydi, bo'shashsa tez sekinlashadi yoki yiqiladi.",
    geometry: "Har koordinata eski nuqtadan alohida yangilanadi, shu sabab orbit zinapoya uslubida yuradi.",
    mode: "linear-system",
    family: "stationary",
  },
  {
    id: "gauss-seidel",
    name: "Gauss-Seidel",
    formula: "(D+L)x^(k+1)=b-Ux^(k)",
    color: "#34d399",
    order: "Linear, odatda Jacobi'dan tezroq",
    stability: "Yangi komponentlarni darhol ishlatgani uchun ko'p SPD misollarda Jacobi'dan tezroq yopishadi.",
    geometry: "Path koordinata bo'yicha navbat bilan yangilanib, yechimga silliqroq qisqaradi.",
    mode: "linear-system",
    family: "stationary",
  },
  {
    id: "sor",
    name: "SOR",
    formula: "x^(k+1)=(1-omega)x^(k)+omega(D+L)^(-1)(b-Ux^(k))",
    color: "#c084fc",
    order: "Accelerated stationary method",
    stability: "Omega yaxshi tanlansa juda tez, noto'g'ri tanlansa overshoot va divergence beradi.",
    geometry: "Gauss-Seidel yo'lini tezlashtirib, ba'zan esa haddan oshirib yuboradi.",
    mode: "linear-system",
    family: "stationary",
    relaxation: 1.18,
  },
  {
    id: "richardson",
    name: "Richardson",
    formula: "x^(k+1)=x^(k)+omega(b-Ax^(k))",
    color: "#f97316",
    order: "Linear with tuned relaxation",
    stability: "Spektrni hisobga olmasa juda sezgir: ba'zi misolda yaxshi, ba'zisida darhol portlaydi.",
    geometry: "Residual vektori bevosita qadamga aylanadi, shu sabab yaxshi va yomon holatlar juda yaqqol ko'rinadi.",
    mode: "linear-system",
    family: "stationary",
    relaxation: 0.22,
  },
  {
    id: "conjugate-gradient",
    name: "Conjugate Gradient",
    formula: "p_k-r_k A-konjugate, x_(k+1)=x_k+alpha_k p_k",
    color: "#ef4444",
    order: "Fast on SPD systems",
    stability: "SPD uchun juda kuchli, indefinite sistemada esa nazariy kafolat yo'q.",
    geometry: "Residuallar A-konjugate bo'lgani uchun orbit kam burilish bilan to'g'ri yechimga kiradi.",
    mode: "linear-system",
    family: "krylov",
  },
  {
    id: "landweber-least-squares",
    name: "Landweber LS",
    formula: "x^(k+1)=x^(k)+omega A^T(b-Ax^(k))",
    color: "#8b5cf6",
    order: "Gradient descent on least-squares loss",
    stability: "Normal equation conditioning yomon bo'lsa sekinlashadi, lekin rectangular data uchun tushunarli va robust.",
    geometry: "Orbit parametrlar fazosida yuradi; residual esa ma'lumotga mos tushish sifatini ko'rsatadi.",
    mode: "linear-system",
    family: "least-squares",
    relaxation: 0.11,
  },
  {
    id: "power-iteration",
    name: "Power Iteration",
    formula: "v^(k+1)=A v^(k) / ||A v^(k)||",
    color: "#f59e0b",
    order: "Linear toward dominant eigendirection",
    stability: "Dominant eigenvalue ajralgan bo'lsa yaxshi, gap kichik bo'lsa sekinlashadi.",
    geometry: "Har qadam vectorni dominant eigenvector tomonga buradi va spektral ustun yo'nalishni ochadi.",
    mode: "eigen",
    family: "eigen",
  },
  {
    id: "inverse-iteration",
    name: "Inverse Iteration",
    formula: "v^(k+1)=A^(-1) v^(k) / ||A^(-1) v^(k)||",
    color: "#14b8a6",
    order: "Linear toward smallest-mode eigendirection",
    stability: "Kichik eigenvalue'ni kuchaytiradi; yaqin singular holatda juda sezgir bo'lishi mumkin.",
    geometry: "Power iteration'ning teskarisi bo'lib, eng sust modal yo'nalishni sahnaga chiqaradi.",
    mode: "eigen",
    family: "eigen",
  },
  {
    id: "qr-iteration",
    name: "QR Iteration",
    formula: "A_(k+1)=R_k Q_k, A_k=Q_k R_k",
    color: "#06b6d4",
    order: "Eigenvalue iteration",
    stability: "Simmetrik matritsalarda juda foydali; diagonalga yaqinlashgani sayin eigen tuzilma ochiladi.",
    geometry: "Matritsa ichki ravishda diagonal tomonga oqadi, orbit esa birinchi eigen yo'nalishni kuzatadi.",
    mode: "eigen",
    family: "factorization",
  },
  {
    id: "pca-svd",
    name: "PCA / SVD",
    formula: "principal axis via dominant eigendirection of covariance / A^T A",
    color: "#ec4899",
    order: "Principal component extraction",
    stability: "Covariance aniq bo'lsa principal yo'nalish juda tushunarli chiqadi, cluster bo'lsa sekinlashadi.",
    geometry: "Data ellipsining eng uzun o'qi topilib, variance qayerda yashiringanini ko'rsatadi.",
    mode: "eigen",
    family: "factorization",
  },
];

export const matrixExamples: MatrixExampleSpec[] = [
  defineMatrixExample({
    id: "spd-balance",
    name: "Balanced SPD System",
    shortName: "SPD",
    matrix: [
      [4, 1],
      [1, 3],
    ],
    rhs: [1, 2],
    initial: [2.4, -1.2],
    defaultIterations: 14,
    minIterations: 3,
    maxIterations: 40,
    interpretation: "SPD sistema residual, error va basis deformation orasidagi bog'lanishni juda toza ko'rsatadi.",
    tags: ["SPD", "well-conditioned", "baseline"],
  }),
  defineMatrixExample({
    id: "anisotropic-coupling",
    name: "Anisotropic Coupling",
    shortName: "Aniso",
    matrix: [
      [5, 2],
      [2, 2.5],
    ],
    rhs: [2, 1],
    initial: [-1.8, 2.1],
    defaultIterations: 16,
    minIterations: 3,
    maxIterations: 44,
    interpretation: "Koordinatalar turlicha masshtablanganda stationary metodlar bilan Krylov metodlari orasidagi farq yaqqol ko'rinadi.",
    tags: ["SPD", "anisotropic", "coupled"],
  }),
  defineMatrixExample({
    id: "weak-diagonal",
    name: "Weak Diagonal Dominance",
    shortName: "Weak DD",
    matrix: [
      [1.04, 1],
      [1, 1.04],
    ],
    rhs: [2.04, 2.04],
    initial: [2.5, -1.5],
    defaultIterations: 28,
    minIterations: 4,
    maxIterations: 64,
    interpretation: "Diagonal dominance juda zaif bo'lsa Jacobi va Richardson sekinlashadi, yaxshi metod tanlash muhim bo'ladi.",
    tags: ["SPD", "slow stationary", "ill-conditioned"],
  }),
  defineMatrixExample({
    id: "indefinite-coupled",
    name: "Indefinite Coupled System",
    shortName: "Indef",
    matrix: [
      [1, 2],
      [2, -0.2],
    ],
    rhs: [1, 0.4],
    initial: [1.4, -1.1],
    defaultIterations: 18,
    minIterations: 4,
    maxIterations: 48,
    interpretation: "Indefinite sistema ba'zi stationary va SPD-assumption metodlarini sindiradi; yiqilish ham bilim beradi.",
    tags: ["indefinite", "failure case", "non-SPD"],
  }),
  defineMatrixExample({
    id: "clustered-spectrum",
    name: "Clustered Spectrum",
    shortName: "Cluster",
    matrix: [
      [2.02, 0.04],
      [0.04, 2.0],
    ],
    rhs: [1.1, 0.9],
    initial: [-1.2, 1.7],
    defaultIterations: 26,
    minIterations: 4,
    maxIterations: 70,
    interpretation: "Eigen gap juda kichik bo'lganda power iteration yoki PCA yo'nalishi sekinlashadi; QR esa eigenvalue tuzilmani ko'rsatadi.",
    tags: ["clustered eigenvalues", "slow power", "spectrum"],
  }),
  defineMatrixExample({
    id: "least-squares-fit",
    name: "Least Squares Line Fit",
    shortName: "LS Fit",
    matrix: [
      [1, 0],
      [0, 1],
    ],
    rhs: [0, 0],
    sourceMatrix: [
      [-1, 1],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    observations: [0.1, 1.0, 2.15, 2.85],
    sourceLabel: "y = m x + c line fit",
    initial: [-0.8, 0.2],
    defaultIterations: 34,
    minIterations: 4,
    maxIterations: 90,
    interpretation: "Bu misolda orbit slope/intercept parametrlarini qidiradi; residual esa chiziq nuqtalarga qanchalik mos tushayotganini ko'rsatadi.",
    tags: ["least squares", "rectangular", "data fit"],
  }),
  defineMatrixExample({
    id: "covariance-cloud",
    name: "Covariance Ellipse",
    shortName: "PCA",
    matrix: [
      [4.4, 2.4],
      [2.4, 1.7],
    ],
    rhs: [1, 0.5],
    initial: [0.6, 1.4],
    sourceLabel: "principal variance directions",
    defaultIterations: 24,
    minIterations: 4,
    maxIterations: 70,
    interpretation: "Covariance matritsa asosiy yo'nalishlarni yashiradi; PCA/SVD va power/QR shu ellipsning o'qlarini ochadi.",
    tags: ["covariance", "PCA", "SVD"],
  }),
];

export function buildMatrixTrace(
  method: MatrixMethodSpec,
  example: MatrixExampleSpec,
  options: { iterations: number },
): MatrixTrace {
  const iterations = clampInt(options.iterations, example.minIterations, example.maxIterations);
  const steps: MatrixStepTrace[] = [];
  const targetVector = resolveTargetVector(method, example);
  const targetLabel = resolveTargetLabel(method, example);
  let current = method.mode === "eigen" ? normalize2(example.initial) : ([...example.initial] as [number, number]);
  let previousResidual = Number.NaN;
  let previousVector: [number, number] | null = null;
  let previousRayleigh = rayleigh(example.matrix, current);
  let state: MatrixState | null = createInitialMatrixState(method, example, current);

  for (let index = 0; index <= iterations; index += 1) {
    const residualVector = computeResidualVector(method, example, current);
    const residual = computeResidual(method, example, current, state, residualVector);
    const error = computeError(method, example, current, targetVector);
    const spectralEstimate = rayleigh(example.matrix, current);
    const angleToTarget = targetAngle(method, current, targetVector);
    const nextResult = index < iterations ? advanceMatrixMethod(method, example, current, state) : { next: current, state };
    const stepNorm = index < iterations ? norm2(sub2(nextResult.next, current)) : 0;
    const turnAngle =
      previousVector && stepNorm > 1e-12
        ? Math.acos(clamp(dot2(normalize2(sub2(current, previousVector)), normalize2(sub2(nextResult.next, current))), -1, 1))
        : 0;
    const rayleighStepDrift = Math.abs(spectralEstimate - previousRayleigh);

    steps.push({
      index,
      vector: current,
      residualVector,
      residual,
      error,
      stepNorm,
      spectralEstimate,
      angleToTarget,
      contraction: Number.isFinite(previousResidual) && previousResidual > 1e-12 ? residual / previousResidual : 1,
      turnAngle,
      rayleighDrift: index === 0 ? 0 : rayleighStepDrift,
    });

    previousResidual = residual;
    previousVector = current;
    previousRayleigh = spectralEstimate;
    current = nextResult.next;
    state = nextResult.state;
  }

  const eigenvalues = eigenvalues2x2(example.matrix);
  const initialResidual = steps[0]?.residual ?? 0;
  const finalResidual = steps.at(-1)?.residual ?? initialResidual;
  const iterationRadius = estimateIterationRadius(method, example);
  const eigenGap = Math.abs(example.smallestEigenvalue / safeScalar(example.dominantEigenvalue));
  const convergence = classifyConvergence(steps, iterationRadius, method, example);
  const averageContraction = steps.slice(1).reduce((sum, step) => sum + step.contraction, 0) / Math.max(steps.length - 1, 1);
  const turnCount = steps.filter((step) => step.turnAngle > Math.PI / 3).length;
  const residualAxisSkew =
    steps.reduce((sum, step) => sum + Math.abs(Math.abs(step.residualVector[0]) - Math.abs(step.residualVector[1])), 0) /
    Math.max(steps.length, 1);
  const rayleighDrift = steps.reduce((sum, step) => sum + step.rayleighDrift, 0);
  const finalRayleighError = Math.abs((steps.at(-1)?.spectralEstimate ?? 0) - targetEigenvalue(method, example));

  return {
    steps,
    matrix: example.matrix,
    rhs: example.rhs,
    sourceMatrix: example.sourceMatrix,
    observations: example.observations,
    transformedBasis: [
      matVec(example.matrix, [1, 0]),
      matVec(example.matrix, [0, 1]),
    ],
    exactSolution: example.exactSolution,
    targetVector,
    dominantEigenvalue: example.dominantEigenvalue,
    smallestEigenvalue: example.smallestEigenvalue,
    spectralRadius: Math.max(Math.abs(eigenvalues[0]), Math.abs(eigenvalues[1])),
    conditionNumber:
      Math.abs(eigenvalues[0]) < 1e-9 || Math.abs(eigenvalues[1]) < 1e-9
        ? Number.POSITIVE_INFINITY
        : Math.max(Math.abs(eigenvalues[0]), Math.abs(eigenvalues[1])) / Math.min(Math.abs(eigenvalues[0]), Math.abs(eigenvalues[1])),
    iterations,
    mode: method.mode,
    targetLabel,
    iterationRadius,
    eigenGap,
    initialResidual,
    improvementFactor: finalResidual > 0 ? initialResidual / finalResidual : Number.POSITIVE_INFINITY,
    averageContraction,
    turnCount,
    residualAxisSkew,
    rayleighDrift,
    finalRayleighError,
    convergenceKind: convergence.kind,
    convergenceReason: convergence.reason,
    diagonalDominance: diagonalDominanceMargin(example.matrix),
    isSpd: isSpd2x2(example.matrix),
    problemKind: example.sourceMatrix ? "least-squares" : (example.tags?.includes("covariance") ? "covariance" : "square-system"),
    fitResidual: example.sourceMatrix && example.observations ? leastSquaresResidual(example.sourceMatrix, example.observations, current) : 0,
    metadata: {
      methodId: method.id,
      methodName: method.name,
      exampleId: example.id,
      exampleName: example.name,
    },
  };
}

type MatrixState =
  | {
      kind: "cg";
      residual: [number, number];
      direction: [number, number];
    }
  | {
      kind: "qr";
      iterate: [[number, number], [number, number]];
      qAccum: [[number, number], [number, number]];
    }
  | null;

function createInitialMatrixState(method: MatrixMethodSpec, example: MatrixExampleSpec, current: [number, number]): MatrixState {
  if (method.id === "conjugate-gradient") {
    const residual = sub2(example.rhs, matVec(example.matrix, current));
    return {
      kind: "cg",
      residual,
      direction: residual,
    };
  }

  if (method.id === "qr-iteration") {
    return {
      kind: "qr",
      iterate: cloneMatrix(example.matrix),
      qAccum: identity2(),
    };
  }

  return null;
}

function advanceMatrixMethod(
  method: MatrixMethodSpec,
  example: MatrixExampleSpec,
  current: [number, number],
  state: MatrixState,
): { next: [number, number]; state: MatrixState } {
  const [[a11, a12], [a21, a22]] = example.matrix;
  const [b1, b2] = example.rhs;

  if (method.id === "gauss-seidel") {
    const x1 = (b1 - a12 * current[1]) / safeScalar(a11);
    const x2 = (b2 - a21 * x1) / safeScalar(a22);
    return { next: capVector([x1, x2]), state };
  }

  if (method.id === "sor") {
    const omega = method.relaxation ?? 1.18;
    const gs1 = (b1 - a12 * current[1]) / safeScalar(a11);
    const x1 = (1 - omega) * current[0] + omega * gs1;
    const gs2 = (b2 - a21 * x1) / safeScalar(a22);
    const x2 = (1 - omega) * current[1] + omega * gs2;
    return { next: capVector([x1, x2]), state };
  }

  if (method.id === "richardson") {
    const residual = sub2(example.rhs, matVec(example.matrix, current));
    const omega = chooseRichardsonOmega(example, method);
    return { next: capVector(add2(current, scale2(residual, omega))), state };
  }

  if (method.id === "landweber-least-squares") {
    const omega = chooseLandweberOmega(example, method);
    const source = example.sourceMatrix ?? [[example.matrix[0][0], example.matrix[0][1]], [example.matrix[1][0], example.matrix[1][1]]];
    const obs = example.observations ?? [example.rhs[0], example.rhs[1]];
    const gradient = normalGradient(source, obs, current);
    return { next: capVector(add2(current, scale2(gradient, omega))), state };
  }

  if (method.id === "conjugate-gradient") {
    const cg = state?.kind === "cg" ? state : createInitialMatrixState(method, example, current);
    if (!cg || cg.kind !== "cg") return { next: current, state };
    const ap = matVec(example.matrix, cg.direction);
    const numerator = dot2(cg.residual, cg.residual);
    const denominator = dot2(cg.direction, ap);
    const alpha = numerator / safeScalar(denominator);
    const next = add2(current, scale2(cg.direction, alpha));
    const residualNext = sub2(cg.residual, scale2(ap, alpha));
    const beta = dot2(residualNext, residualNext) / safeScalar(numerator);
    return {
      next: capVector(next),
      state: {
        kind: "cg",
        residual: capVector(residualNext),
        direction: capVector(add2(residualNext, scale2(cg.direction, beta))),
      },
    };
  }

  if (method.id === "power-iteration" || method.id === "pca-svd") {
    return { next: normalize2(matVec(example.matrix, current)), state };
  }

  if (method.id === "inverse-iteration") {
    return { next: normalize2(solve2x2(example.matrix, current)), state };
  }

  if (method.id === "qr-iteration") {
    const qr = state?.kind === "qr" ? state : createInitialMatrixState(method, example, current);
    if (!qr || qr.kind !== "qr") return { next: current, state };
    const factor = qrDecomposition2x2(qr.iterate);
    const iterate = multiplyMatrix(factor.r, factor.q);
    const qAccum = multiplyMatrix(qr.qAccum, factor.q);
    const next = normalize2([qAccum[0][0], qAccum[1][0]]);
    return {
      next,
      state: {
        kind: "qr",
        iterate,
        qAccum,
      },
    };
  }

  const x1 = (b1 - a12 * current[1]) / safeScalar(a11);
  const x2 = (b2 - a21 * current[0]) / safeScalar(a22);
  return { next: capVector([x1, x2]), state };
}

function resolveTargetVector(method: MatrixMethodSpec, example: MatrixExampleSpec): [number, number] {
  if (method.id === "inverse-iteration") return normalize2(example.smallestEigenvector);
  if (method.mode === "eigen") return normalize2(example.dominantEigenvector);
  return example.exactSolution;
}

function resolveTargetLabel(method: MatrixMethodSpec, example: MatrixExampleSpec) {
  if (method.id === "inverse-iteration") return "smallest eigenvector";
  if (method.id === "pca-svd") return example.sourceLabel ?? "principal component";
  if (method.id === "qr-iteration") return "eigenbasis direction";
  if (method.mode === "eigen") return "dominant eigenvector";
  if (example.sourceMatrix) return example.sourceLabel ?? "least-squares optimum";
  return "exact solution";
}

function computeResidual(method: MatrixMethodSpec, example: MatrixExampleSpec, vector: [number, number], state: MatrixState, residualVector?: [number, number]) {
  if (method.id === "landweber-least-squares" && example.sourceMatrix && example.observations) {
    return leastSquaresResidual(example.sourceMatrix, example.observations, vector);
  }

  if (method.id === "qr-iteration" && state?.kind === "qr") {
    return Math.abs(state.iterate[0][1]) + Math.abs(state.iterate[1][0]);
  }

  if (method.mode === "eigen") {
    const unit = normalize2(vector);
    const lambda = rayleigh(example.matrix, unit);
    return norm2(sub2(matVec(example.matrix, unit), scale2(unit, lambda)));
  }

  return norm2(residualVector ?? sub2(matVec(example.matrix, vector), example.rhs));
}

function computeResidualVector(method: MatrixMethodSpec, example: MatrixExampleSpec, vector: [number, number]) {
  if (method.mode === "eigen") {
    const unit = normalize2(vector);
    const lambda = rayleigh(example.matrix, unit);
    return sub2(matVec(example.matrix, unit), scale2(unit, lambda));
  }

  return sub2(matVec(example.matrix, vector), example.rhs);
}

function computeError(method: MatrixMethodSpec, example: MatrixExampleSpec, vector: [number, number], targetVector: [number, number]) {
  if (method.mode === "eigen") {
    return targetAngle(method, vector, targetVector);
  }
  return norm2(sub2(vector, example.exactSolution));
}

function estimateIterationRadius(method: MatrixMethodSpec, example: MatrixExampleSpec) {
  const A = example.matrix;
  if (method.id === "jacobi") {
    return spectralRadius2x2([
      [0, -A[0][1] / safeScalar(A[0][0])],
      [-A[1][0] / safeScalar(A[1][1]), 0],
    ]);
  }

  if (method.id === "gauss-seidel") {
    return spectralRadius2x2([
      [0, -A[0][1] / safeScalar(A[0][0])],
      [0, (A[1][0] * A[0][1]) / safeScalar(A[0][0] * A[1][1])],
    ]);
  }

  if (method.id === "sor") {
    const omega = method.relaxation ?? 1.18;
    const t11 = 1 - omega;
    const t12 = -(omega * A[0][1]) / safeScalar(A[0][0]);
    const t21 = -(omega * A[1][0] * (1 - omega)) / safeScalar(A[0][0] * A[1][1]);
    const t22 = 1 - omega + (omega * omega * A[1][0] * A[0][1]) / safeScalar(A[0][0] * A[1][1]);
    return spectralRadius2x2([
      [t11, t12],
      [t21, t22],
    ]);
  }

  if (method.id === "richardson") {
    const omega = chooseRichardsonOmega(example, method);
    return spectralRadius2x2(subtractMatrix(identity2(), scaleMatrix(A, omega)));
  }

  if (method.id === "landweber-least-squares") {
    const omega = chooseLandweberOmega(example, method);
    const normalMatrix = effectiveNormalMatrix(example);
    return spectralRadius2x2(subtractMatrix(identity2(), scaleMatrix(normalMatrix, omega)));
  }

  if (method.id === "conjugate-gradient") {
    const kappa = Math.max(1, conditionNumber2x2(A));
    return (Math.sqrt(kappa) - 1) / (Math.sqrt(kappa) + 1);
  }

  if (method.id === "qr-iteration") {
    return Math.abs(example.smallestEigenvalue / safeScalar(example.dominantEigenvalue));
  }

  return Math.abs(example.smallestEigenvalue / safeScalar(example.dominantEigenvalue));
}

function classifyConvergence(
  steps: MatrixStepTrace[],
  iterationRadius: number,
  method: MatrixMethodSpec,
  example: MatrixExampleSpec,
) {
  const initial = steps[0]?.residual ?? 0;
  const final = steps.at(-1)?.residual ?? initial;
  const increases = steps.slice(1).filter((step, index) => step.residual > steps[index]!.residual * 1.02).length;
  const maxResidual = Math.max(...steps.map((step) => step.residual));
  const ratio = final / safeScalar(initial);

  if (final < Math.max(1e-8, initial * 1e-4)) {
    return {
      kind: "converging" as const,
      reason: "Residual bir necha tartibga kamaydi, metod bu misolda ishonchli ishlayapti.",
    };
  }

  if (ratio < 0.1 && iterationRadius < 1) {
    return {
      kind: "converging" as const,
      reason: "Boshlanishda qisqa overshoot bo'ldi, lekin residual tezda pasayib, metod baribir yo'nalishni topdi.",
    };
  }

  if (method.mode === "eigen" && iterationRadius < 0.999 && ratio < 2.5 && final > initial * 0.55) {
    return {
      kind: "stalling" as const,
      reason: "Spektral gap kichik, shuning uchun eigen yo'nalish topilmoqda, lekin juda sust.",
    };
  }

  if (ratio > 1.15 || maxResidual > initial * 2.4 || iterationRadius > 1.02) {
    return {
      kind: "diverging" as const,
      reason:
        method.mode === "linear-system"
          ? "Iteration radius 1 dan katta yoki residual o'sib boryapti, bu metod shu matritsa uchun beqaror."
          : "Spektral ajralish yetarli emas yoki modal yo'nalish almashib ketyapti, shu sabab eigen iteratsiya qochyapti.",
    };
  }

  if (increases >= 2) {
    return {
      kind: "oscillating" as const,
      reason: "Residual bir pasayib, bir ko'tarilib turibdi. Metod silkinish bilan ishlayapti.",
    };
  }

  if (ratio > 0.45 || iterationRadius > 0.9 || (!isSpd2x2(example.matrix) && method.id === "conjugate-gradient")) {
    return {
      kind: "stalling" as const,
      reason:
        method.id === "conjugate-gradient" && !isSpd2x2(example.matrix)
          ? "CG SPD faraziga tayanadi; bu misolda nazariy tayanch yo'q, shuning uchun orbit sust yoki notekis."
          : "Residual kamaymoqda, lekin juda sekin. Conditioning yoki spektr bu metodni ushlab turibdi.",
    };
  }

  return {
    kind: "converging" as const,
    reason: "Metod yo'nalishni topdi va residual muntazam kamaymoqda.",
  };
}

function defineMatrixExample(input: Omit<MatrixExampleSpec, "exactSolution" | "dominantEigenvector" | "dominantEigenvalue" | "smallestEigenvector" | "smallestEigenvalue">): MatrixExampleSpec {
  const effective = input.sourceMatrix && input.observations ? normalEquationFromSamples(input.sourceMatrix, input.observations) : { matrix: input.matrix, rhs: input.rhs };
  const eig = eigenDecomposition2x2(effective.matrix);
  return {
    ...input,
    matrix: effective.matrix,
    rhs: effective.rhs,
    exactSolution: solve2x2(effective.matrix, effective.rhs),
    dominantEigenvector: eig.dominant.vector,
    dominantEigenvalue: eig.dominant.value,
    smallestEigenvector: eig.small.vector,
    smallestEigenvalue: eig.small.value,
  };
}

function normalEquationFromSamples(sourceMatrix: Array<[number, number]>, observations: number[]) {
  let a11 = 0;
  let a12 = 0;
  let a22 = 0;
  let b1 = 0;
  let b2 = 0;
  sourceMatrix.forEach((row, index) => {
    a11 += row[0] * row[0];
    a12 += row[0] * row[1];
    a22 += row[1] * row[1];
    b1 += row[0] * observations[index]!;
    b2 += row[1] * observations[index]!;
  });
  return {
    matrix: [
      [a11, a12],
      [a12, a22],
    ] as [[number, number], [number, number]],
    rhs: [b1, b2] as [number, number],
  };
}

function effectiveNormalMatrix(example: MatrixExampleSpec): [[number, number], [number, number]] {
  if (example.sourceMatrix && example.observations) {
    return example.matrix;
  }

  const [[a11, a12], [a21, a22]] = example.matrix;
  return [
    [a11 * a11 + a21 * a21, a11 * a12 + a21 * a22],
    [a11 * a12 + a21 * a22, a12 * a12 + a22 * a22],
  ];
}

function normalGradient(sourceMatrix: Array<[number, number]>, observations: number[], vector: [number, number]): [number, number] {
  let g1 = 0;
  let g2 = 0;
  sourceMatrix.forEach((row, index) => {
    const residual = observations[index]! - (row[0] * vector[0] + row[1] * vector[1]);
    g1 += row[0] * residual;
    g2 += row[1] * residual;
  });
  return [g1, g2];
}

function leastSquaresResidual(sourceMatrix: Array<[number, number]>, observations: number[], vector: [number, number]) {
  let sum = 0;
  sourceMatrix.forEach((row, index) => {
    const residual = observations[index]! - (row[0] * vector[0] + row[1] * vector[1]);
    sum += residual * residual;
  });
  return Math.sqrt(sum);
}

function qrDecomposition2x2(matrix: [[number, number], [number, number]]) {
  const a1: [number, number] = [matrix[0][0], matrix[1][0]];
  const a2: [number, number] = [matrix[0][1], matrix[1][1]];
  const q1 = normalize2(a1);
  const r11 = norm2(a1);
  const r12 = dot2(q1, a2);
  const u2 = sub2(a2, scale2(q1, r12));
  const q2 = norm2(u2) < 1e-9 ? [-q1[1], q1[0]] as [number, number] : normalize2(u2);
  const r22 = dot2(q2, a2);
  return {
    q: [
      [q1[0], q2[0]],
      [q1[1], q2[1]],
    ] as [[number, number], [number, number]],
    r: [
      [r11, r12],
      [0, r22],
    ] as [[number, number], [number, number]],
  };
}

function eigenDecomposition2x2(matrix: [[number, number], [number, number]]) {
  const [lambda1, lambda2] = eigenvalues2x2(matrix);
  const v1 = eigenvector2x2(matrix, lambda1);
  const v2 = eigenvector2x2(matrix, lambda2);
  const dominant = Math.abs(lambda1) >= Math.abs(lambda2) ? { value: lambda1, vector: v1 } : { value: lambda2, vector: v2 };
  const small = Math.abs(lambda1) < Math.abs(lambda2) ? { value: lambda1, vector: v1 } : { value: lambda2, vector: v2 };
  return { dominant, small };
}

function eigenvector2x2(matrix: [[number, number], [number, number]], eigenvalue: number): [number, number] {
  const [a, b] = matrix[0];
  const [c, d] = matrix[1];
  if (Math.abs(b) > 1e-9) return normalize2([b, eigenvalue - a]);
  if (Math.abs(c) > 1e-9) return normalize2([eigenvalue - d, c]);
  return Math.abs(a - eigenvalue) < Math.abs(d - eigenvalue) ? [1, 0] : [0, 1];
}

function matVec(matrix: [[number, number], [number, number]], vector: [number, number]): [number, number] {
  return [
    matrix[0][0] * vector[0] + matrix[0][1] * vector[1],
    matrix[1][0] * vector[0] + matrix[1][1] * vector[1],
  ];
}

function multiplyMatrix(left: [[number, number], [number, number]], right: [[number, number], [number, number]]): [[number, number], [number, number]] {
  return [
    [left[0][0] * right[0][0] + left[0][1] * right[1][0], left[0][0] * right[0][1] + left[0][1] * right[1][1]],
    [left[1][0] * right[0][0] + left[1][1] * right[1][0], left[1][0] * right[0][1] + left[1][1] * right[1][1]],
  ];
}

function solve2x2(matrix: [[number, number], [number, number]], vector: [number, number]): [number, number] {
  const [[a, b], [c, d]] = matrix;
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-10) return [vector[0], vector[1]];
  return [(d * vector[0] - b * vector[1]) / det, (-c * vector[0] + a * vector[1]) / det];
}

function rayleigh(matrix: [[number, number], [number, number]], vector: [number, number]) {
  const unit = normalize2(vector);
  return dot2(unit, matVec(matrix, unit));
}

function eigenvalues2x2(matrix: [[number, number], [number, number]]): [number, number] {
  const trace = matrix[0][0] + matrix[1][1];
  const det = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
  const disc = Math.sqrt(Math.max(trace * trace - 4 * det, 0));
  return [(trace + disc) / 2, (trace - disc) / 2];
}

function spectralRadius2x2(matrix: [[number, number], [number, number]]) {
  const [l1, l2] = eigenvalues2x2(matrix);
  return Math.max(Math.abs(l1), Math.abs(l2));
}

function conditionNumber2x2(matrix: [[number, number], [number, number]]) {
  const [l1, l2] = eigenvalues2x2(matrix);
  if (Math.abs(l1) < 1e-10 || Math.abs(l2) < 1e-10) return Number.POSITIVE_INFINITY;
  return Math.max(Math.abs(l1), Math.abs(l2)) / Math.min(Math.abs(l1), Math.abs(l2));
}

function diagonalDominanceMargin(matrix: [[number, number], [number, number]]) {
  return Math.min(matrix[0][0] - Math.abs(matrix[0][1]), matrix[1][1] - Math.abs(matrix[1][0]));
}

function isSpd2x2(matrix: [[number, number], [number, number]]) {
  const symmetric = Math.abs(matrix[0][1] - matrix[1][0]) < 1e-9;
  const det = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
  return symmetric && matrix[0][0] > 0 && det > 0;
}

function chooseRichardsonOmega(example: MatrixExampleSpec, method: MatrixMethodSpec) {
  const cond = conditionNumber2x2(example.matrix);
  if (example.id === "indefinite-coupled") return 0.34;
  return (method.relaxation ?? 0.22) * (cond > 25 ? 1.25 : 1);
}

function chooseLandweberOmega(example: MatrixExampleSpec, method: MatrixMethodSpec) {
  const normalMatrix = effectiveNormalMatrix(example);
  const rho = spectralRadius2x2(normalMatrix);
  return Math.min(method.relaxation ?? 0.11, 1 / Math.max(rho * 1.1, 1));
}

function targetEigenvalue(method: MatrixMethodSpec, example: MatrixExampleSpec) {
  if (method.id === "inverse-iteration") return example.smallestEigenvalue;
  if (method.mode === "eigen") return example.dominantEigenvalue;
  return rayleigh(example.matrix, example.exactSolution);
}

function targetAngle(method: MatrixMethodSpec, vector: [number, number], targetVector: [number, number]) {
  const alignment = dot2(normalize2(vector), normalize2(targetVector));
  const cosine = method.mode === "eigen" ? Math.abs(alignment) : alignment;
  return Math.acos(clamp(cosine, -1, 1));
}

function identity2(): [[number, number], [number, number]] {
  return [
    [1, 0],
    [0, 1],
  ];
}

function cloneMatrix(matrix: [[number, number], [number, number]]): [[number, number], [number, number]] {
  return [
    [matrix[0][0], matrix[0][1]],
    [matrix[1][0], matrix[1][1]],
  ];
}

function scaleMatrix(matrix: [[number, number], [number, number]], scalar: number): [[number, number], [number, number]] {
  return [
    [matrix[0][0] * scalar, matrix[0][1] * scalar],
    [matrix[1][0] * scalar, matrix[1][1] * scalar],
  ];
}

function subtractMatrix(left: [[number, number], [number, number]], right: [[number, number], [number, number]]): [[number, number], [number, number]] {
  return [
    [left[0][0] - right[0][0], left[0][1] - right[0][1]],
    [left[1][0] - right[1][0], left[1][1] - right[1][1]],
  ];
}

function add2(left: [number, number], right: [number, number]): [number, number] {
  return [left[0] + right[0], left[1] + right[1]];
}

function sub2(left: [number, number], right: [number, number]): [number, number] {
  return [left[0] - right[0], left[1] - right[1]];
}

function scale2(vector: [number, number], scalar: number): [number, number] {
  return [vector[0] * scalar, vector[1] * scalar];
}

function dot2(left: [number, number], right: [number, number]) {
  return left[0] * right[0] + left[1] * right[1];
}

function norm2(vector: [number, number]) {
  return Math.hypot(vector[0], vector[1]);
}

function normalize2(vector: [number, number]): [number, number] {
  const magnitude = norm2(vector);
  if (magnitude < 1e-10) return [1, 0];
  return [vector[0] / magnitude, vector[1] / magnitude];
}

function capVector(vector: [number, number]): [number, number] {
  const cap = 40;
  return [clamp(vector[0], -cap, cap), clamp(vector[1], -cap, cap)];
}

function safeScalar(value: number) {
  if (!Number.isFinite(value)) return 1e-9;
  if (Math.abs(value) < 1e-9) return value < 0 ? -1e-9 : 1e-9;
  return value;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
