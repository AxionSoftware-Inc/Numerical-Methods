import {
  compileCustomAreaIntegralMethod,
  compileCustomInterpolationMethod,
  compileCustomMatrixMethod,
  compileCustomOdeMethod,
  compileCustomOptimizationMethod,
  compileCustomPdeMethod,
  compileCustomProbabilityMethod,
  compileCustomRootFindingMethod,
  compileCustomSurfaceIntegralMethod,
  compileCustomVolumeIntegralMethod,
  buildIntegrationTrace,
  buildInterpolationTrace,
  buildMatrixTrace,
  buildOptimizationTrace,
  buildPdeTrace,
  buildProbabilityTrace,
  buildRootFindingTrace,
  buildSurfaceIntegralTrace,
  buildTrace,
  buildVolumeIntegralTrace,
  createCustomThetaPdeMethod,
  oscillatorEnergy,
} from "@methodslab/methods-engine/core";
import {
  examples,
  integrationExamples,
  integrationMethods,
  interpolationExamples,
  interpolationMethods,
  matrixExamples,
  matrixMethods,
  methods,
  optimizationExamples,
  optimizationMethods,
  pdeExamples,
  pdeMethods,
  probabilityExamples,
  probabilityMethods,
  rootFindingExamples,
  rootFindingMethods,
  surfaceIntegralExamples,
  surfaceIntegrationMethods,
  volumeIntegralExamples,
  volumeIntegrationMethods,
} from "@methodslab/methods-engine/presets";

export type BenchmarkRow = {
  label: string;
  selected: string;
  best: string;
  worst: string;
  selectedMethod: string;
  bestMethod: string;
  worstMethod: string;
  interpretation: string;
};

export type BenchmarkReport = {
  title: string;
  subtitle: string;
  rows: BenchmarkRow[];
  wins: number;
  losses: number;
  methodName: string;
  exampleName: string;
  summary: string;
};

export type BenchmarkScoreDimension = {
  label: string;
  score: number;
  interpretation: string;
};

export type BenchmarkFamilyId =
  | "ode"
  | "pde"
  | "integral"
  | "matrix"
  | "root-finding"
  | "interpolation"
  | "optimization"
  | "probability";

export function buildBenchmarkReport(query: { [key: string]: string | string[] | undefined }): BenchmarkReport {
  const family = takeValue(query.family) as BenchmarkFamilyId | undefined;
  if (family === "ode") return buildOdeReport(query);
  if (family === "pde") return buildPdeReport(query);
  if (family === "integral") return buildIntegralReport(query);
  if (family === "root-finding") return buildRootReport(query);
  if (family === "interpolation") return buildInterpolationReport(query);
  if (family === "optimization") return buildOptimizationReport(query);
  if (family === "probability") return buildProbabilityReport(query);
  return buildMatrixReport(query);
}

export function buildOdeBenchmarkRows(
  selectedTrace: ReturnType<typeof buildTrace>,
  comparisonTraces: ReturnType<typeof buildTrace>[],
  example: (typeof examples)[number],
) {
  const traces = [selectedTrace, ...comparisonTraces];
  const finalError = (trace: ReturnType<typeof buildTrace>) => trace.metrics.finalError;
  const maxError = (trace: ReturnType<typeof buildTrace>) => trace.metrics.maxError;
  const invariantDrift = (trace: ReturnType<typeof buildTrace>) => {
    const finalNumeric = trace.points.at(-1) ?? trace.points[0]!;
    const finalExact = trace.exactAtStep.at(-1) ?? trace.exactAtStep[0]!;
    return Math.abs(example.metric(finalNumeric) - example.metric(finalExact));
  };
  const meanError = (trace: ReturnType<typeof buildTrace>) =>
    trace.errors.reduce((sum, item) => sum + item.magnitude, 0) / Math.max(trace.errors.length, 1);
  const stageCost = (trace: ReturnType<typeof buildTrace>) => trace.stages.length / Math.max(trace.steps.length, 1);
  const energyDrift = (trace: ReturnType<typeof buildTrace>) => {
    const exact = oscillatorEnergy(trace.exactAtStep.at(-1) ?? trace.exactAtStep[0]!);
    const numeric = oscillatorEnergy(trace.points.at(-1) ?? trace.points[0]!);
    return Math.abs(numeric - exact);
  };

  return [
    pickBenchmarkRow(traces, selectedTrace, "Final error", (trace) => finalError(trace).toExponential(2), finalError, false, "Oxirgi nuqtadagi xato trajectory qanchalik to'g'ri yetib borganini ko'rsatadi."),
    pickBenchmarkRow(traces, selectedTrace, "Max error", (trace) => maxError(trace).toExponential(2), maxError, false, "Butun vaqt oralig'idagi eng yomon og'ish stability muammosini tez ko'rsatadi."),
    pickBenchmarkRow(traces, selectedTrace, "Invariant drift", (trace) => invariantDrift(trace).toExponential(2), invariantDrift, false, "Energiya yoki boshqa invariant qanchalik buzilganini ko'rsatadi."),
    pickBenchmarkRow(traces, selectedTrace, "Mean path error", (trace) => meanError(trace).toExponential(2), meanError, false, "Butun orbitadagi o'rtacha xato metodning umumiy sifatini ochadi."),
    pickBenchmarkRow(traces, selectedTrace, "Stage cost", (trace) => stageCost(trace).toFixed(1), stageCost, false, "Ko'proq stage odatda qimmatroq, lekin ko'pincha aniqlikni oshiradi."),
    pickBenchmarkRow(traces, selectedTrace, "Energy drift", (trace) => energyDrift(trace).toExponential(2), energyDrift, false, "Oscillator misolida orbitaning fizik ma'noda qanchalik toza qolganini ko'rsatadi."),
  ];
}

export function buildPdeBenchmarkRows(
  selectedTrace: ReturnType<typeof buildPdeTrace>,
  comparisonTraces: ReturnType<typeof buildPdeTrace>[],
  methodTheta: number,
) {
  const traces = [selectedTrace, ...comparisonTraces];
  const finalL2 = (trace: ReturnType<typeof buildPdeTrace>) => trace.errors.at(-1)?.l2 ?? Number.POSITIVE_INFINITY;
  const finalLinf = (trace: ReturnType<typeof buildPdeTrace>) => trace.errors.at(-1)?.linf ?? Number.POSITIVE_INFINITY;
  const stabilityScore = (trace: ReturnType<typeof buildPdeTrace>) => {
    const theta = trace.metadata.methodId === "custom-theta" ? methodTheta : (pdeMethods.find((item) => item.id === trace.metadata.methodId)?.theta ?? 0);
    return theta >= 0.5 ? 95 - trace.r * 8 : Math.max(0, 70 - Math.max(0, trace.r - 0.5) * 140);
  };
  const efficiency = (trace: ReturnType<typeof buildPdeTrace>) => finalL2(trace) * Math.max(trace.cells * trace.timeSteps, 1);
  const amplitudeDrift = (trace: ReturnType<typeof buildPdeTrace>) => {
    const frame = trace.frames.at(-1);
    if (!frame) return Number.POSITIVE_INFINITY;
    const numericAmp = Math.max(...frame.values.map((value) => Math.abs(value)));
    const exactAmp = Math.max(...frame.exactValues.map((value) => Math.abs(value)));
    return Math.abs(numericAmp - exactAmp);
  };
  const meanL2 = (trace: ReturnType<typeof buildPdeTrace>) =>
    trace.errors.reduce((sum, item) => sum + item.l2, 0) / Math.max(trace.errors.length, 1);

  return [
    pickBenchmarkRow(traces, selectedTrace, "Final L2", (trace) => finalL2(trace).toExponential(2), finalL2, false, "Yakuniy global maydon xatosini ko'rsatadi."),
    pickBenchmarkRow(traces, selectedTrace, "Final Linf", (trace) => finalLinf(trace).toExponential(2), finalLinf, false, "Eng yomon fazoviy nuqtadagi xato aniq ko'rinadi."),
    pickBenchmarkRow(traces, selectedTrace, "Mean L2", (trace) => meanL2(trace).toExponential(2), meanL2, false, "Vaqt bo'ylab o'rtacha xato nafaqat final frame, balki butun evolyutsiyani baholaydi."),
    pickBenchmarkRow(traces, selectedTrace, "Amplitude drift", (trace) => amplitudeDrift(trace).toExponential(2), amplitudeDrift, false, "Dissipation yoki overshoot kuchini ochib beradi."),
    pickBenchmarkRow(traces, selectedTrace, "Resolution efficiency", (trace) => efficiency(trace).toExponential(2), efficiency, false, "Bir xil grid budjetida qaysi usul yaxshiroq ishlayotganini ko'rsatadi."),
    pickBenchmarkRow(traces, selectedTrace, "Stability score", (trace) => `${stabilityScore(trace).toFixed(1)} score`, stabilityScore, true, "Theta va r ga qarab usulning nazariy-amaliy barqarorligi baholanadi."),
  ];
}

export function buildAreaIntegralBenchmarkRows(selectedTrace: ReturnType<typeof buildIntegrationTrace>, comparisonTraces: ReturnType<typeof buildIntegrationTrace>[]) {
  const traces = [selectedTrace, ...comparisonTraces];
  const absError = (trace: ReturnType<typeof buildIntegrationTrace>) => trace.absError;
  const localError = (trace: ReturnType<typeof buildIntegrationTrace>) => trace.peakPanelError;
  const sensitivity = (trace: ReturnType<typeof buildIntegrationTrace>) => trace.sensitivity;
  const efficiency = (trace: ReturnType<typeof buildIntegrationTrace>) => trace.absError * Math.max(trace.sampleCount, 1);
  const noise = (trace: ReturnType<typeof buildIntegrationTrace>) => trace.estimatorStdError;
  const bias = (trace: ReturnType<typeof buildIntegrationTrace>) => Math.abs(trace.signedBias);

  return [
    pickBenchmarkRow(traces, selectedTrace, "Abs error", (trace) => absError(trace).toExponential(2), absError, false, "Integral qiymati exact natijadan qanchalik uzoqlashganini ko'rsatadi."),
    pickBenchmarkRow(traces, selectedTrace, "Peak local error", (trace) => localError(trace).toExponential(2), localError, false, "Domain ichida qaysi metod eng xavfli lokal xatolarni qilayotganini ko'rsatadi."),
    pickBenchmarkRow(traces, selectedTrace, "Sensitivity", (trace) => sensitivity(trace).toExponential(2), sensitivity, false, "Resolution o'zgarsa natija qanchalik tebranishini bildiradi."),
    pickBenchmarkRow(traces, selectedTrace, "Sample efficiency", (trace) => efficiency(trace).toExponential(2), efficiency, false, "Kam sample bilan aniqlik bersa, metod amaliy jihatdan kuchliroq."),
    pickBenchmarkRow(traces, selectedTrace, "Noise", (trace) => noise(trace).toExponential(2), noise, false, "Monte Carlo oilasida estimator noaniqligi juda muhim benchmark."),
    pickBenchmarkRow(traces, selectedTrace, "Bias", (trace) => bias(trace).toExponential(2), bias, false, "Doimiy yuqori/past baholash tendensiyasi tadqiqot uchun muhim signal."),
  ];
}

export function buildSurfaceIntegralBenchmarkRows(selectedTrace: ReturnType<typeof buildSurfaceIntegralTrace>, comparisonTraces: ReturnType<typeof buildSurfaceIntegralTrace>[]) {
  const traces = [selectedTrace, ...comparisonTraces];
  const absError = (trace: ReturnType<typeof buildSurfaceIntegralTrace>) => trace.absError;
  const sensitivity = (trace: ReturnType<typeof buildSurfaceIntegralTrace>) => trace.sensitivity;
  const sampleEfficiency = (trace: ReturnType<typeof buildSurfaceIntegralTrace>) => trace.absError * Math.max(trace.sampleCount, 1);
  const amplitude = (trace: ReturnType<typeof buildSurfaceIntegralTrace>) => Math.abs(trace.valueRange[1] - trace.valueRange[0]);
  const resolutionUse = (trace: ReturnType<typeof buildSurfaceIntegralTrace>) => trace.absError * Math.max(trace.resolution ** 2, 1);

  return [
    pickBenchmarkRow(traces, selectedTrace, "Abs error", (trace) => absError(trace).toExponential(2), absError, false, "Yakuniy surface integral xatosini ko'rsatadi."),
    pickBenchmarkRow(traces, selectedTrace, "Sensitivity", (trace) => sensitivity(trace).toExponential(2), sensitivity, false, "Grid o'zgarsa natija qanchalik sezgir ekanini bildiradi."),
    pickBenchmarkRow(traces, selectedTrace, "Sample efficiency", (trace) => sampleEfficiency(trace).toExponential(2), sampleEfficiency, false, "Kam sample bilan yaxshi aniqlik bergan metod kuchliroq."),
    pickBenchmarkRow(traces, selectedTrace, "Resolution use", (trace) => resolutionUse(trace).toExponential(2), resolutionUse, false, "Bir xil resolution budjetida kim samaraliroq ekanini ko'rsatadi."),
    pickBenchmarkRow(traces, selectedTrace, "Value span", (trace) => amplitude(trace).toExponential(2), amplitude, false, "Sirtning vertikal tarqalishi qiyinlik darajasini oshiradi."),
    pickBenchmarkRow(traces, selectedTrace, "Absolute stability", (trace) => (1 / Math.max(absError(trace), 1e-12)).toExponential(2), (trace) => 1 / Math.max(absError(trace), 1e-12), true, "Xato juda kichik bo'lsa natija ishonchliroq deb qaraladi."),
  ];
}

export function buildVolumeIntegralBenchmarkRows(selectedTrace: ReturnType<typeof buildVolumeIntegralTrace>, comparisonTraces: ReturnType<typeof buildVolumeIntegralTrace>[]) {
  const traces = [selectedTrace, ...comparisonTraces];
  const absError = (trace: ReturnType<typeof buildVolumeIntegralTrace>) => trace.absError;
  const sensitivity = (trace: ReturnType<typeof buildVolumeIntegralTrace>) => trace.sensitivity;
  const sampleEfficiency = (trace: ReturnType<typeof buildVolumeIntegralTrace>) => trace.absError * Math.max(trace.sampleCount, 1);
  const resolutionUse = (trace: ReturnType<typeof buildVolumeIntegralTrace>) => trace.absError * Math.max(trace.resolution ** 3, 1);
  const valueSpan = (trace: ReturnType<typeof buildVolumeIntegralTrace>) => Math.abs(trace.valueRange[1] - trace.valueRange[0]);

  return [
    pickBenchmarkRow(traces, selectedTrace, "Abs error", (trace) => absError(trace).toExponential(2), absError, false, "Volume integral uchun global xato asosiy mezondir."),
    pickBenchmarkRow(traces, selectedTrace, "Sensitivity", (trace) => sensitivity(trace).toExponential(2), sensitivity, false, "3D resolution o'zgarishi natijaga qanchalik ta'sir qilayotganini ko'rsatadi."),
    pickBenchmarkRow(traces, selectedTrace, "Sample efficiency", (trace) => sampleEfficiency(trace).toExponential(2), sampleEfficiency, false, "Ko'p voxel budjetida ham xato yuqori bo'lsa metod sust."),
    pickBenchmarkRow(traces, selectedTrace, "Resolution use", (trace) => resolutionUse(trace).toExponential(2), resolutionUse, false, "3D grid xarajati hisobga olingan benchmark."),
    pickBenchmarkRow(traces, selectedTrace, "Value span", (trace) => valueSpan(trace).toExponential(2), valueSpan, false, "Hajm ichidagi variatsiya qiyin integrandni bildiradi."),
    pickBenchmarkRow(traces, selectedTrace, "Absolute stability", (trace) => (1 / Math.max(absError(trace), 1e-12)).toExponential(2), (trace) => 1 / Math.max(absError(trace), 1e-12), true, "Kichik xato yuqori ishonchlilikni anglatadi."),
  ];
}

export function buildMatrixBenchmarkRows(selectedTrace: ReturnType<typeof buildMatrixTrace>, comparisonTraces: ReturnType<typeof buildMatrixTrace>[]) {
  const traces = [selectedTrace, ...comparisonTraces];
  const finalResidual = (trace: ReturnType<typeof buildMatrixTrace>) => trace.steps.at(-1)?.residual ?? Number.POSITIVE_INFINITY;
  const finalError = (trace: ReturnType<typeof buildMatrixTrace>) => trace.steps.at(-1)?.error ?? Number.POSITIVE_INFINITY;
  const speedScore = (trace: ReturnType<typeof buildMatrixTrace>) => {
    const firstIndex = trace.steps.findIndex((step) => step.residual <= Math.max(trace.initialResidual * 1e-2, 1e-8));
    return firstIndex === -1 ? trace.steps.length + 50 : firstIndex;
  };
  const stabilityScore = (trace: ReturnType<typeof buildMatrixTrace>) => {
    const convergenceBase =
      trace.convergenceKind === "converging" ? 4 : trace.convergenceKind === "stalling" ? 3 : trace.convergenceKind === "oscillating" ? 2 : 1;
    return convergenceBase * 100 - trace.iterationRadius * 20 - (trace.steps.at(-1)?.contraction ?? 1) * 10 - trace.turnCount * 2;
  };
  const scalingScore = (trace: ReturnType<typeof buildMatrixTrace>) => {
    const baseByMethod: Record<string, number> = {
      jacobi: 42,
      "gauss-seidel": 56,
      sor: 62,
      richardson: 34,
      "conjugate-gradient": 93,
      "landweber-least-squares": 77,
      "power-iteration": 71,
      "inverse-iteration": 68,
      "qr-iteration": 82,
      "pca-svd": 85,
    };
    return (baseByMethod[trace.metadata.methodId] ?? 50) - Math.min(trace.conditionNumber, 40) * 0.35;
  };
  const dataScore = (trace: ReturnType<typeof buildMatrixTrace>) => {
    if (trace.problemKind === "least-squares") {
      const base = trace.metadata.methodId === "landweber-least-squares" ? 95 : trace.metadata.methodId === "conjugate-gradient" ? 78 : 52;
      return base - Math.min(trace.fitResidual * 12, 20);
    }
    if (trace.problemKind === "covariance") {
      const base = trace.metadata.methodId === "pca-svd" ? 96 : trace.metadata.methodId === "qr-iteration" ? 86 : trace.metadata.methodId === "power-iteration" ? 80 : 54;
      return base - trace.eigenGap * 8;
    }
    return trace.isSpd ? (trace.metadata.methodId === "conjugate-gradient" ? 92 : 66) : 44;
  };
  const contractionQuality = (trace: ReturnType<typeof buildMatrixTrace>) => trace.averageContraction;
  const spectralFidelity = (trace: ReturnType<typeof buildMatrixTrace>) => trace.finalRayleighError;

  return [
    pickBenchmarkRow(traces, selectedTrace, "Accuracy", (trace) => finalResidual(trace).toExponential(2), finalResidual, false, "Final residual kichik bo'lsa metod haqiqiy yechim yoki targetga yaqin kelgan bo'ladi."),
    pickBenchmarkRow(traces, selectedTrace, "State error", (trace) => finalError(trace).toExponential(2), finalError, false, "Bu faqat residual emas, topilgan vektorning targetdan real siljishini ham ko'rsatadi."),
    pickBenchmarkRow(traces, selectedTrace, "Contraction quality", (trace) => contractionQuality(trace).toFixed(3), contractionQuality, false, "Iteratsiya o'rtacha nechog'lik muntazam qisqarayotganini ko'rsatadi."),
    pickBenchmarkRow(traces, selectedTrace, "Convergence speed", (trace) => `${speedScore(trace)} step`, speedScore, false, "Qancha erta residual tushsa, shuncha tez metod deb qaraladi."),
    pickBenchmarkRow(traces, selectedTrace, "Stability", (trace) => `${stabilityScore(trace).toFixed(1)} score`, stabilityScore, true, "Oscillation, contraction va radius birga olinib, metodning qanchalik ishonchli ishlaganini baholaydi."),
    pickBenchmarkRow(traces, selectedTrace, "Large-scale fit", (trace) => `${scalingScore(trace).toFixed(1)} score`, scalingScore, true, "Katta va qiyin matritsalar uchun nazariy moslik, conditioning sezgirligi va metod oilasi inobatga olinadi."),
    pickBenchmarkRow(traces, selectedTrace, "Data / spectrum match", (trace) => `${dataScore(trace).toFixed(1)} score`, dataScore, true, "Least-squares, PCA yoki oddiy sistema ekaniga qarab metodning tabiiy mosligi baholanadi."),
    pickBenchmarkRow(traces, selectedTrace, "Spectral fidelity", (trace) => spectralFidelity(trace).toExponential(2), spectralFidelity, false, "Rayleigh estimate target spektral qiymatdan qanchalik og'ishini ko'rsatadi."),
  ];
}

export function buildRootBenchmarkRows(selectedTrace: ReturnType<typeof buildRootFindingTrace>, comparisonTraces: ReturnType<typeof buildRootFindingTrace>[]) {
  const traces = [selectedTrace, ...comparisonTraces];
  const residual = (trace: ReturnType<typeof buildRootFindingTrace>) => trace.finalResidual;
  const rootError = (trace: ReturnType<typeof buildRootFindingTrace>) => trace.finalError;
  const intervalWidth = (trace: ReturnType<typeof buildRootFindingTrace>) => trace.finalIntervalWidth;
  const reduction = (trace: ReturnType<typeof buildRootFindingTrace>) => trace.residualReduction;
  const contraction = (trace: ReturnType<typeof buildRootFindingTrace>) => trace.averageContraction;
  const bracketSafety = (trace: ReturnType<typeof buildRootFindingTrace>) => trace.bracketRetentionRate;
  const stagnation = (trace: ReturnType<typeof buildRootFindingTrace>) => trace.stagnationCount;
  const speedScore = (trace: ReturnType<typeof buildRootFindingTrace>) => {
    const initial = Math.abs(trace.steps[0]?.fx ?? trace.finalResidual);
    const firstIndex = trace.steps.findIndex((step) => Math.abs(step.fx) <= Math.max(initial * 1e-4, 1e-8));
    return firstIndex === -1 ? trace.steps.length + 25 : firstIndex;
  };

  return [
    pickBenchmarkRow(traces, selectedTrace, "Residual", (trace) => residual(trace).toExponential(2), residual, false, "f(x) nolga qanchalik yaqin bo'lsa, root shunchalik sifatli topilgan bo'ladi."),
    pickBenchmarkRow(traces, selectedTrace, "Root error", (trace) => rootError(trace).toExponential(2), rootError, false, "Haqiqiy root bilan masofa kichik bo'lishi ilmiy ishonchlilik uchun eng muhim mezonlardan biri."),
    pickBenchmarkRow(traces, selectedTrace, "Bracket quality", (trace) => intervalWidth(trace).toExponential(2), intervalWidth, false, "Bracket asosli usullar uchun interval torayishi juda muhim diagnostika beradi."),
    pickBenchmarkRow(traces, selectedTrace, "Residual reduction", (trace) => `${reduction(trace).toFixed(1)}x`, reduction, true, "Boshlang'ich |f| bilan solishtirganda qancha buyruqga tushganini ko'rsatadi."),
    pickBenchmarkRow(traces, selectedTrace, "Average contraction", (trace) => contraction(trace).toFixed(3), contraction, false, "Har iteratsiyada residual o'rtacha nechaga ko'payayotganini ko'rsatadi; 1 dan ancha kichik bo'lsa yaxshi."),
    pickBenchmarkRow(traces, selectedTrace, "Convergence speed", (trace) => `${speedScore(trace)} step`, speedScore, false, "Kam iteratsiyada rootga yetib borsa, amalda tezroq metod hisoblanadi."),
    pickBenchmarkRow(traces, selectedTrace, "Bracket safety", (trace) => `${(bracketSafety(trace) * 100).toFixed(0)}%`, bracketSafety, true, "Iteratlar rootni necha foiz hollarda bracket ichida ushlab turganini bildiradi."),
    pickBenchmarkRow(traces, selectedTrace, "Stagnation risk", (trace) => `${stagnation(trace)}`, stagnation, false, "Bir joyda qotib qolish yoki residual deyarli tushmay qolish soni."),
  ];
}

export function buildInterpolationBenchmarkRows(selectedTrace: ReturnType<typeof buildInterpolationTrace>, comparisonTraces: ReturnType<typeof buildInterpolationTrace>[]) {
  const traces = [selectedTrace, ...comparisonTraces];
  const maxError = (trace: ReturnType<typeof buildInterpolationTrace>) => trace.maxAbsError;
  const rms = (trace: ReturnType<typeof buildInterpolationTrace>) => trace.rmsError;
  const roughness = (trace: ReturnType<typeof buildInterpolationTrace>) => trace.roughness;
  const edgeError = (trace: ReturnType<typeof buildInterpolationTrace>) => trace.edgeMaxError;
  const centerError = (trace: ReturnType<typeof buildInterpolationTrace>) => trace.centerMaxError;
  const nodeEfficiency = (trace: ReturnType<typeof buildInterpolationTrace>) => trace.rmsError * Math.max(trace.nodeCount, 1);
  const smoothnessScore = (trace: ReturnType<typeof buildInterpolationTrace>) => 90 - trace.roughness * 8 - Math.min(trace.overshootArea * 40, 30);
  const variation = (trace: ReturnType<typeof buildInterpolationTrace>) => trace.totalVariationRatio;
  const overshoot = (trace: ReturnType<typeof buildInterpolationTrace>) => trace.overshootArea;

  return [
    pickBenchmarkRow(traces, selectedTrace, "Max error", (trace) => maxError(trace).toExponential(2), maxError, false, "Eng yomon nuqtadagi xatolik global sifatni ko'rsatadi."),
    pickBenchmarkRow(traces, selectedTrace, "RMS error", (trace) => rms(trace).toExponential(2), rms, false, "Butun interval bo'ylab o'rtacha xatolik interpolation sifatining asosiy mezonidir."),
    pickBenchmarkRow(traces, selectedTrace, "Edge behavior", (trace) => edgeError(trace).toExponential(2), edgeError, false, "Chekkalarda xatolik oshib ketishi Runge yoki boundary instability belgisi bo'lishi mumkin."),
    pickBenchmarkRow(traces, selectedTrace, "Center behavior", (trace) => centerError(trace).toExponential(2), centerError, false, "Ichki intervalda xatolik kichik bo'lsa, asosiy signal rekonstruksiyasi toza."),
    pickBenchmarkRow(traces, selectedTrace, "Node efficiency", (trace) => nodeEfficiency(trace).toExponential(2), nodeEfficiency, false, "Kam node bilan yaxshi aniqlik bersa, metod amaliy jihatdan kuchliroq hisoblanadi."),
    pickBenchmarkRow(traces, selectedTrace, "Smoothness", (trace) => `${smoothnessScore(trace).toFixed(1)} score`, smoothnessScore, true, "Silliqlik va xatolik birga baholanadi; tadqiqot-grade visualization uchun bu muhim."),
    pickBenchmarkRow(traces, selectedTrace, "Variation inflation", (trace) => variation(trace).toFixed(2), variation, false, "1 dan katta bo'lsa interpolant signalni keragidan ortiq tebratib yuboryapti."),
    pickBenchmarkRow(traces, selectedTrace, "Overshoot area", (trace) => overshoot(trace).toExponential(2), overshoot, false, "Y-range tashqarisiga chiqish miqdori; premium analyzer uchun bu juda muhim diagnostika."),
    pickBenchmarkRow(traces, selectedTrace, "Roughness", (trace) => roughness(trace).toFixed(2), roughness, false, "Ortiqcha tebranish usulning yomonlashayotganidan darak beradi."),
  ];
}

export function buildOptimizationBenchmarkRows(selectedTrace: ReturnType<typeof buildOptimizationTrace>, comparisonTraces: ReturnType<typeof buildOptimizationTrace>[]) {
  const traces = [selectedTrace, ...comparisonTraces];
  const finalValue = (trace: ReturnType<typeof buildOptimizationTrace>) => trace.finalValue;
  const finalGrad = (trace: ReturnType<typeof buildOptimizationTrace>) => trace.finalGradientNorm;
  const finalDistance = (trace: ReturnType<typeof buildOptimizationTrace>) => trace.finalDistance;
  const curvature = (trace: ReturnType<typeof buildOptimizationTrace>) => trace.finalConditionNumber;
  const speedScore = (trace: ReturnType<typeof buildOptimizationTrace>) => {
    const threshold = trace.minValue + Math.abs(trace.maxValue - trace.minValue) * 0.05;
    const index = trace.steps.findIndex((step) => step.value <= threshold);
    return index === -1 ? trace.steps.length + 30 : index;
  };
  const monotonicity = (trace: ReturnType<typeof buildOptimizationTrace>) => 100 - trace.monotoneIncreaseCount * 8;
  const alignment = (trace: ReturnType<typeof buildOptimizationTrace>) => trace.averageGradientAlignment;

  return [
    pickBenchmarkRow(traces, selectedTrace, "Final value", (trace) => finalValue(trace).toExponential(2), finalValue, false, "Oxirgi objective qiymati metod qanchalik yaxshi minimumga tushganini ko'rsatadi."),
    pickBenchmarkRow(traces, selectedTrace, "Gradient norm", (trace) => finalGrad(trace).toExponential(2), finalGrad, false, "Stationary nuqtaga yaqinlashish uchun gradient norm kichik bo'lishi kerak."),
    pickBenchmarkRow(traces, selectedTrace, "Distance", (trace) => finalDistance(trace).toExponential(2), finalDistance, false, "Optimumga geometrik yaqinlik ko'rsatkichi."),
    pickBenchmarkRow(traces, selectedTrace, "Curvature handling", (trace) => (Number.isFinite(curvature(trace)) ? curvature(trace).toFixed(1) : "inf"), curvature, false, "Condition number katta bo'lsa metod valley geometriyasini boshqarishi qiyinlashadi."),
    pickBenchmarkRow(traces, selectedTrace, "Convergence speed", (trace) => `${speedScore(trace)} step`, speedScore, false, "Kam iteratsiyada foydali minimumga tushish amaliyotda katta farq qiladi."),
    pickBenchmarkRow(traces, selectedTrace, "Monotonicity", (trace) => `${monotonicity(trace).toFixed(1)} score`, monotonicity, true, "Keraksiz tebranishsiz tushayotgan metod ko'pincha ishonchliroq bo'ladi."),
    pickBenchmarkRow(traces, selectedTrace, "Gradient alignment", (trace) => alignment(trace).toFixed(2), alignment, true, "Gradientlar bir-biriga zid bo'lib qolsa zigzag kuchayadi; alignment yuqori bo'lsa yo'l ongliroq."),
  ];
}

export function buildProbabilityBenchmarkRows(selectedTrace: ReturnType<typeof buildProbabilityTrace>, comparisonTraces: ReturnType<typeof buildProbabilityTrace>[]) {
  const traces = [selectedTrace, ...comparisonTraces];
  const strongError = (trace: ReturnType<typeof buildProbabilityTrace>) => trace.strongErrorEstimate;
  const weakError = (trace: ReturnType<typeof buildProbabilityTrace>) => trace.weakErrorEstimate;
  const payoffStdErr = (trace: ReturnType<typeof buildProbabilityTrace>) => trace.payoffStdError;
  const confidenceWidth = (trace: ReturnType<typeof buildProbabilityTrace>) => Math.abs(trace.confidenceInterval[1] - trace.confidenceInterval[0]);
  const efficiency = (trace: ReturnType<typeof buildProbabilityTrace>) => trace.payoffStdError * Math.sqrt(Math.max(trace.pathCount, 1));
  const tailAsymmetry = (trace: ReturnType<typeof buildProbabilityTrace>) => trace.tailBalance;

  return [
    pickBenchmarkRow(traces, selectedTrace, "Strong error", (trace) => strongError(trace).toExponential(2), strongError, false, "Bir xil noise ostida yo'llarning exact transition'dan og'ishi pathwise sifatni ko'rsatadi."),
    pickBenchmarkRow(traces, selectedTrace, "Weak error", (trace) => weakError(trace).toExponential(2), weakError, false, "Moment yoki expectation nuqtai nazaridan bias qanchalik kichik ekanini ko'rsatadi."),
    pickBenchmarkRow(traces, selectedTrace, "Payoff stderr", (trace) => payoffStdErr(trace).toExponential(2), payoffStdErr, false, "Narxlash yoki payoff estimate uchun ishonchlilikni ko'rsatadi."),
    pickBenchmarkRow(traces, selectedTrace, "CI width", (trace) => confidenceWidth(trace).toExponential(2), confidenceWidth, false, "Confidence interval tor bo'lsa estimate barqarorroq."),
    pickBenchmarkRow(traces, selectedTrace, "Sampling efficiency", (trace) => efficiency(trace).toExponential(2), efficiency, false, "Ko'p yo'lga qaramay noaniqlik pasaymasa metod yoki estimator sust."),
    pickBenchmarkRow(traces, selectedTrace, "Tail asymmetry", (trace) => tailAsymmetry(trace).toExponential(2), tailAsymmetry, false, "Distribution tail'lari bir tomonga og'ib ketsa risk talqini murakkablashadi."),
  ];
}

export function summarizeBenchmark(rows: BenchmarkRow[], selectedMethodName: string) {
  return {
    wins: rows.filter((row) => row.bestMethod === selectedMethodName).length,
    losses: rows.filter((row) => row.worstMethod === selectedMethodName).length,
  };
}

export function buildScoreDimensions(rows: BenchmarkRow[]): BenchmarkScoreDimension[] {
  return rows.map((row) => {
    const selected = extractNumeric(row.selected);
    const best = extractNumeric(row.best);
    const worst = extractNumeric(row.worst);

    if (selected === null || best === null || worst === null || Math.abs(best - worst) < 1e-12) {
      return {
        label: row.label,
        score: row.bestMethod === row.selectedMethod ? 100 : row.worstMethod === row.selectedMethod ? 20 : 60,
        interpretation: row.interpretation,
      };
    }

    const lowerIsBetter = best <= worst;
    const low = Math.min(best, worst);
    const high = Math.max(best, worst);
    const normalized = lowerIsBetter ? 1 - (selected - low) / Math.max(high - low, 1e-12) : (selected - low) / Math.max(high - low, 1e-12);

    return {
      label: row.label,
      score: Math.max(0, Math.min(100, normalized * 100)),
      interpretation: row.interpretation,
    };
  });
}

function buildMatrixReport(query: { [key: string]: string | string[] | undefined }): BenchmarkReport {
  const formula = takeValue(query.formula);
  const compiled = formula ? compileCustomMatrixMethod(formula) : null;
  const method = compiled?.method ?? matrixMethods.find((item) => item.id === takeValue(query.method)) ?? matrixMethods[0]!;
  const example = matrixExamples.find((item) => item.id === takeValue(query.example)) ?? matrixExamples[0]!;
  const iterations = clampInt(Number(takeValue(query.iterations) ?? example.defaultIterations), example.minIterations, example.maxIterations);
  const trace = buildMatrixTrace(method, example, { iterations });
  const comparisonTraces = matrixMethods.filter((item) => item.id !== (compiled?.baseMethodId ?? method.id) && item.mode === method.mode).map((item) => buildMatrixTrace(item, example, { iterations }));
  const rows = buildMatrixBenchmarkRows(trace, comparisonTraces);
  return withSummary(rows, trace.metadata.methodName, {
    title: "Matrix Benchmark Report",
    subtitle: "Aniqlik, tezlik, stability va problemaga moslik bo'yicha to'liq taqqoslash.",
    methodName: trace.metadata.methodName,
    exampleName: trace.metadata.exampleName,
    summary: `Residual ${trace.steps.at(-1)?.residual.toExponential(2)}, error ${trace.steps.at(-1)?.error.toExponential(2)}, condition ${Number.isFinite(trace.conditionNumber) ? trace.conditionNumber.toFixed(2) : "inf"}.`,
  });
}

function buildRootReport(query: { [key: string]: string | string[] | undefined }): BenchmarkReport {
  const formula = takeValue(query.formula);
  const compiled = formula ? compileCustomRootFindingMethod(formula) : null;
  const method = compiled?.method ?? rootFindingMethods.find((item) => item.id === takeValue(query.method)) ?? rootFindingMethods[0]!;
  const example = rootFindingExamples.find((item) => item.id === takeValue(query.example)) ?? rootFindingExamples[0]!;
  const iterations = clampInt(Number(takeValue(query.iterations) ?? example.defaultIterations), example.minIterations, example.maxIterations);
  const trace = buildRootFindingTrace(method, example, { iterations });
  const comparisonTraces = rootFindingMethods.filter((item) => item.id !== (compiled?.baseMethodId ?? method.id)).map((item) => buildRootFindingTrace(item, example, { iterations }));
  const rows = buildRootBenchmarkRows(trace, comparisonTraces);
  return withSummary(rows, trace.metadata.methodName, {
    title: "Root-Finding Benchmark Report",
    subtitle: "Residual, root error, safety va convergence behavior bo'yicha to'liq taqqoslash.",
    methodName: trace.metadata.methodName,
    exampleName: trace.metadata.exampleName,
    summary: `Final |f| ${trace.finalResidual.toExponential(2)}, root error ${trace.finalError.toExponential(2)}, bracket ${trace.finalIntervalWidth.toExponential(2)}.`,
  });
}

function buildInterpolationReport(query: { [key: string]: string | string[] | undefined }): BenchmarkReport {
  const formula = takeValue(query.formula);
  const compiled = formula ? compileCustomInterpolationMethod(formula) : null;
  const method = compiled?.method ?? interpolationMethods.find((item) => item.id === takeValue(query.method)) ?? interpolationMethods[0]!;
  const example = interpolationExamples.find((item) => item.id === takeValue(query.example)) ?? interpolationExamples[0]!;
  const nodeCount = clampInt(Number(takeValue(query.nodes) ?? example.defaultNodes), example.minNodes, example.maxNodes);
  const trace = buildInterpolationTrace(method, example, { nodeCount });
  const comparisonTraces = interpolationMethods.filter((item) => item.id !== (compiled?.baseMethodId ?? method.id)).map((item) => buildInterpolationTrace(item, example, { nodeCount }));
  const rows = buildInterpolationBenchmarkRows(trace, comparisonTraces);
  return withSummary(rows, trace.metadata.methodName, {
    title: "Interpolation Benchmark Report",
    subtitle: "Global error, edge behavior, smoothness va node efficiency bo'yicha to'liq taqqoslash.",
    methodName: trace.metadata.methodName,
    exampleName: trace.metadata.exampleName,
    summary: `Max error ${trace.maxAbsError.toExponential(2)}, RMS ${trace.rmsError.toExponential(2)}, roughness ${trace.roughness.toFixed(2)}.`,
  });
}

function buildOdeReport(query: { [key: string]: string | string[] | undefined }): BenchmarkReport {
  const formula = takeValue(query.formula);
  const compiled = formula ? compileCustomOdeMethod(formula) : null;
  const method = compiled?.method ?? methods.find((item) => item.id === takeValue(query.method)) ?? methods[0]!;
  const example = examples.find((item) => item.id === takeValue(query.example)) ?? examples[0]!;
  const step = clampNumber(Number(takeValue(query.step) ?? example.defaultStep), example.minStep, example.maxStep);
  const trace = buildTrace(method, example, step);
  const comparisonTraces = methods.filter((item) => item.id !== (compiled?.baseMethodId ?? method.id)).map((item) => buildTrace(item, example, step));
  const rows = buildOdeBenchmarkRows(trace, comparisonTraces, example);
  return withSummary(rows, trace.metadata.methodName, {
    title: "ODE Benchmark Report",
    subtitle: "Final error, invariant drift va orbit fidelity bo'yicha to'liq taqqoslash.",
    methodName: trace.metadata.methodName,
    exampleName: trace.metadata.exampleName,
    summary: `Final error ${trace.metrics.finalError.toExponential(2)}, max error ${trace.metrics.maxError.toExponential(2)}, step ${step.toFixed(3)}.`,
  });
}

function buildPdeReport(query: { [key: string]: string | string[] | undefined }): BenchmarkReport {
  const example = pdeExamples.find((item) => item.id === takeValue(query.example)) ?? pdeExamples[0]!;
  const theta = clampNumber(Number(takeValue(query.theta) ?? 0.5), 0, 1);
  const methodId = takeValue(query.method) ?? pdeMethods[0]!.id;
  const formula = takeValue(query.formula);
  const compiled = formula ? compileCustomPdeMethod(formula) : null;
  const method = compiled?.method ?? (methodId === "custom-theta" ? createCustomThetaPdeMethod(theta) : pdeMethods.find((item) => item.id === methodId) ?? pdeMethods[0]!);
  const cells = clampInt(Number(takeValue(query.cells) ?? example.defaultCells), example.minCells, example.maxCells);
  const timeSteps = clampInt(Number(takeValue(query.timeSteps) ?? example.defaultTimeSteps), example.minTimeSteps, example.maxTimeSteps);
  const trace = buildPdeTrace(method, example, cells, timeSteps);
  const comparisonTraces = [
    ...pdeMethods.filter((item) => item.id !== method.id).map((item) => buildPdeTrace(item, example, cells, timeSteps)),
    ...(method.id === "custom-theta" || compiled ? [] : [buildPdeTrace(createCustomThetaPdeMethod(theta), example, cells, timeSteps)]),
  ];
  const rows = buildPdeBenchmarkRows(trace, comparisonTraces, theta);
  const final = trace.errors.at(-1);
  return withSummary(rows, trace.metadata.methodName, {
    title: "PDE Benchmark Report",
    subtitle: "Final L2/Linf, amplitude drift va resolution efficiency bo'yicha to'liq taqqoslash.",
    methodName: trace.metadata.methodName,
    exampleName: trace.metadata.exampleName,
    summary: `Final L2 ${final?.l2.toExponential(2) ?? "0"}, Final Linf ${final?.linf.toExponential(2) ?? "0"}, r=${trace.r.toFixed(3)}.`,
  });
}

function buildIntegralReport(query: { [key: string]: string | string[] | undefined }): BenchmarkReport {
  const kind = takeValue(query.kind) ?? "area";
  const formula = takeValue(query.formula);
  if (kind === "surface") {
    const compiled = formula ? compileCustomSurfaceIntegralMethod(formula) : null;
    const method = compiled?.method ?? surfaceIntegrationMethods.find((item) => item.id === takeValue(query.method)) ?? surfaceIntegrationMethods[0]!;
    const example = surfaceIntegralExamples.find((item) => item.id === takeValue(query.example)) ?? surfaceIntegralExamples[0]!;
    const resolution = clampInt(Number(takeValue(query.resolution) ?? example.defaultResolution), example.minResolution, example.maxResolution);
    const trace = buildSurfaceIntegralTrace(method, example, resolution);
    const comparisonTraces = surfaceIntegrationMethods.filter((item) => item.id !== (compiled?.baseMethodId ?? method.id)).map((item) => buildSurfaceIntegralTrace(item, example, resolution));
    const rows = buildSurfaceIntegralBenchmarkRows(trace, comparisonTraces);
    return withSummary(rows, trace.metadata.methodName, {
      title: "Integral Benchmark Report",
      subtitle: "Surface integral uchun accuracy, sensitivity va sample efficiency taqqoslanadi.",
      methodName: trace.metadata.methodName,
      exampleName: trace.metadata.exampleName,
      summary: `Surface abs error ${trace.absError.toExponential(2)}, samples ${trace.sampleCount}, resolution ${trace.resolution}.`,
    });
  }
  if (kind === "volume") {
    const compiled = formula ? compileCustomVolumeIntegralMethod(formula) : null;
    const method = compiled?.method ?? volumeIntegrationMethods.find((item) => item.id === takeValue(query.method)) ?? volumeIntegrationMethods[0]!;
    const example = volumeIntegralExamples.find((item) => item.id === takeValue(query.example)) ?? volumeIntegralExamples[0]!;
    const resolution = clampInt(Number(takeValue(query.resolution) ?? example.defaultResolution), example.minResolution, example.maxResolution);
    const trace = buildVolumeIntegralTrace(method, example, resolution);
    const comparisonTraces = volumeIntegrationMethods.filter((item) => item.id !== (compiled?.baseMethodId ?? method.id)).map((item) => buildVolumeIntegralTrace(item, example, resolution));
    const rows = buildVolumeIntegralBenchmarkRows(trace, comparisonTraces);
    return withSummary(rows, trace.metadata.methodName, {
      title: "Integral Benchmark Report",
      subtitle: "Volume integral uchun accuracy, sensitivity va voxel efficiency taqqoslanadi.",
      methodName: trace.metadata.methodName,
      exampleName: trace.metadata.exampleName,
      summary: `Volume abs error ${trace.absError.toExponential(2)}, samples ${trace.sampleCount}, resolution ${trace.resolution}.`,
    });
  }

  const compiled = formula ? compileCustomAreaIntegralMethod(formula) : null;
  const method = compiled?.method ?? integrationMethods.find((item) => item.id === takeValue(query.method)) ?? integrationMethods[0]!;
  const example = integrationExamples.find((item) => item.id === takeValue(query.example)) ?? integrationExamples[0]!;
  const panels = clampInt(Number(takeValue(query.panels) ?? example.defaultPanels), example.minPanels, example.maxPanels);
  const trace = buildIntegrationTrace(method, example, panels);
  const comparisonTraces = integrationMethods.filter((item) => item.id !== (compiled?.baseMethodId ?? method.id)).map((item) => buildIntegrationTrace(item, example, panels));
  const rows = buildAreaIntegralBenchmarkRows(trace, comparisonTraces);
  return withSummary(rows, trace.metadata.methodName, {
    title: "Integral Benchmark Report",
    subtitle: "1D integral uchun abs error, local error, sensitivity va sample efficiency taqqoslanadi.",
    methodName: trace.metadata.methodName,
    exampleName: trace.metadata.exampleName,
    summary: `Abs error ${trace.absError.toExponential(2)}, peak local ${trace.peakPanelError.toExponential(2)}, samples ${trace.sampleCount}.`,
  });
}

function buildOptimizationReport(query: { [key: string]: string | string[] | undefined }): BenchmarkReport {
  const formula = takeValue(query.formula);
  const compiled = formula ? compileCustomOptimizationMethod(formula) : null;
  const method = compiled?.method ?? optimizationMethods.find((item) => item.id === takeValue(query.method)) ?? optimizationMethods[0]!;
  const example = optimizationExamples.find((item) => item.id === takeValue(query.example)) ?? optimizationExamples[0]!;
  const stepSize = clampNumber(Number(takeValue(query.stepSize) ?? example.defaultStep), example.minStep, example.maxStep);
  const iterations = clampInt(Number(takeValue(query.iterations) ?? example.defaultIterations), example.minIterations, example.maxIterations);
  const trace = buildOptimizationTrace(method, example, { stepSize, iterations });
  const comparisonTraces = optimizationMethods.filter((item) => item.id !== (compiled?.baseMethodId ?? method.id)).map((item) => buildOptimizationTrace(item, example, { stepSize, iterations }));
  const rows = buildOptimizationBenchmarkRows(trace, comparisonTraces);
  return withSummary(rows, trace.metadata.methodName, {
    title: "Optimization Benchmark Report",
    subtitle: "Final objective, gradient norm, convergence speed va monotonicity bo'yicha to'liq taqqoslash.",
    methodName: trace.metadata.methodName,
    exampleName: trace.metadata.exampleName,
    summary: `Final f ${trace.finalValue.toExponential(2)}, grad ${trace.finalGradientNorm.toExponential(2)}, distance ${trace.finalDistance.toExponential(2)}.`,
  });
}

function buildProbabilityReport(query: { [key: string]: string | string[] | undefined }): BenchmarkReport {
  const formula = takeValue(query.formula);
  const compiled = formula ? compileCustomProbabilityMethod(formula) : null;
  const method = compiled?.method ?? probabilityMethods.find((item) => item.id === takeValue(query.method)) ?? probabilityMethods[0]!;
  const example = probabilityExamples.find((item) => item.id === takeValue(query.example)) ?? probabilityExamples[0]!;
  const steps = clampInt(Number(takeValue(query.steps) ?? example.defaultSteps), example.minSteps, example.maxSteps);
  const pathCount = clampInt(Number(takeValue(query.pathCount) ?? example.defaultPaths), example.minPaths, example.maxPaths);
  const drift = clampNumber(Number(takeValue(query.drift) ?? example.drift), -0.4, 0.6);
  const volatility = clampNumber(Number(takeValue(query.volatility) ?? example.volatility), 0.02, 0.9);
  const seed = clampInt(Number(takeValue(query.seed) ?? 42), 1, 999);
  const trace = buildProbabilityTrace(method, example, { steps, pathCount, drift, volatility, seed });
  const comparisonTraces = probabilityMethods.filter((item) => item.id !== (compiled?.baseMethodId ?? method.id)).map((item) => buildProbabilityTrace(item, example, { steps, pathCount, drift, volatility, seed }));
  const rows = buildProbabilityBenchmarkRows(trace, comparisonTraces);
  return withSummary(rows, trace.metadata.methodName, {
    title: "Probability Benchmark Report",
    subtitle: "Moment accuracy, payoff uncertainty va sampling efficiency bo'yicha to'liq taqqoslash.",
    methodName: trace.metadata.methodName,
    exampleName: trace.metadata.exampleName,
    summary: `Mean error ${trace.meanAbsError.toExponential(2)}, variance error ${trace.varianceAbsError.toExponential(2)}, payoff stderr ${trace.payoffStdError.toExponential(2)}.`,
  });
}

function withSummary(rows: BenchmarkRow[], selectedMethodName: string, base: Omit<BenchmarkReport, "rows" | "wins" | "losses">): BenchmarkReport {
  const { wins, losses } = summarizeBenchmark(rows, selectedMethodName);
  return { ...base, rows, wins, losses };
}

function takeValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function pickBenchmarkRow<T extends { metadata: { methodName: string } }>(
  traces: T[],
  selectedTrace: T,
  label: string,
  valueFormatter: (trace: T) => string,
  score: (trace: T) => number,
  higherIsBetter: boolean,
  interpretation: string,
): BenchmarkRow {
  const sorted = [...traces].sort((left, right) => (higherIsBetter ? score(right) - score(left) : score(left) - score(right)));
  const best = sorted[0]!;
  const worst = sorted.at(-1)!;
  return {
    label,
    selected: valueFormatter(selectedTrace),
    best: valueFormatter(best),
    worst: valueFormatter(worst),
    selectedMethod: selectedTrace.metadata.methodName,
    bestMethod: best.metadata.methodName,
    worstMethod: worst.metadata.methodName,
    interpretation,
  };
}

function extractNumeric(value: string) {
  const match = value.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i);
  if (!match) return null;
  const numeric = Number(match[0]);
  return Number.isFinite(numeric) ? numeric : null;
}
