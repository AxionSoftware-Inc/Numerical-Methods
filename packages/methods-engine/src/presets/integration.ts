import {
  buildAdaptiveSimpsonDraft,
  buildClenshawCurtisDraft,
  buildCornerAverageSurfaceTraceDraft,
  buildCornerAverageVolumeTraceDraft,
  buildGaussPanels,
  buildLeftPanels,
  buildMidpointPanels,
  buildMidpointSurfaceTraceDraft,
  buildMidpointVolumeTraceDraft,
  buildImportanceMonteCarloDraft,
  buildMonteCarloDraft,
  buildRombergDraft,
  buildSimpsonPanels,
  buildTensorGaussSurfaceTraceDraft,
  buildTensorGaussVolumeTraceDraft,
  buildTrapezoidPanels,
} from "../core";
import type {
  IntegrationExampleSpec,
  IntegrationMethodSpec,
  SurfaceIntegralExampleSpec,
  SurfaceIntegrationMethodSpec,
  VolumeIntegralExampleSpec,
  VolumeIntegrationMethodSpec,
} from "../core";

export const integrationMethods: IntegrationMethodSpec[] = [
  {
    id: "left-rectangle",
    name: "Left Rectangle",
    formula: "sum f(x_i) h",
    order: "O(h)",
    color: "#e69f00",
    geometry:
      "Har panelda chap nuqtadagi balandlikni butun intervalga yoyadi. Egri chiziq tez o'zgarganda sistematik bias tez ko'rinadi.",
    category: "panel",
    buildTrace: (example, panels) => ({ panels: buildLeftPanels(example, panels) }),
  },
  {
    id: "midpoint-rule",
    name: "Midpoint",
    formula: "sum f((x_i+x_{i+1})/2) h",
    order: "O(h^2)",
    color: "#009e73",
    geometry:
      "Panel markazidan sample oladi va ko'p smooth funksiyada biasni yaxshi pasaytiradi.",
    category: "panel",
    buildTrace: (example, panels) => ({ panels: buildMidpointPanels(example, panels) }),
  },
  {
    id: "trapezoid",
    name: "Trapezoid",
    formula: "sum h(f_i+f_{i+1})/2",
    order: "O(h^2)",
    color: "#56b4e9",
    geometry:
      "Har panelni chord bilan almashtiradi. Curvature katta joylarda local error devori aniq seziladi.",
    category: "panel",
    buildTrace: (example, panels) => ({ panels: buildTrapezoidPanels(example, panels) }),
  },
  {
    id: "simpson",
    name: "Simpson",
    formula: "h/3 sum (f_0+4f_1+f_2)",
    order: "O(h^4)",
    color: "#cc79a7",
    geometry:
      "Ikki panel bo'yicha parabola moslaydi. Smooth va oscillatory funksiyalarda tez yaqinlashadi.",
    category: "panel",
    requiresEvenPanels: true,
    buildTrace: (example, panels) => ({ panels: buildSimpsonPanels(example, panels) }),
  },
  {
    id: "gauss-2",
    name: "Gauss 2-point",
    formula: "sum h/2 [f(m-a/sqrt(3))+f(m+a/sqrt(3))]",
    order: "O(h^4)",
    color: "#f97316",
    geometry:
      "Har intervalda optimal 2 nuqta tanlanadi. Sample joylashuvi oddiy midpointdan ko'ra curvature'ni kuchliroq ushlaydi.",
    category: "panel",
    buildTrace: (example, panels) => ({ panels: buildGaussPanels(example, panels) }),
  },
  {
    id: "adaptive-simpson",
    name: "Adaptive Simpson",
    formula: "recursive Simpson refinement by local error",
    order: "Adaptive O(h^4)",
    color: "#a855f7",
    geometry:
      "Qiyin joylarda panelni mayda qiladi, tekis joyda yirik qoldiradi. Meshning o'zi xatoning qayerda tug'ilayotganini ko'rsatadi.",
    category: "adaptive",
    requiresEvenPanels: true,
    buildTrace: (example, panels) => buildAdaptiveSimpsonDraft(example, panels),
  },
  {
    id: "romberg",
    name: "Romberg",
    formula: "R(k,j)=R(k,j-1)+(R(k,j-1)-R(k-1,j-1))/(4^j-1)",
    order: "Richardson extrapolation",
    color: "#22c55e",
    geometry:
      "Trapezoid hierarchy ustidan extrapolation qiladi. Progress grafigida diagonal Romberg sequence tez tekislanadi.",
    category: "extrapolation",
    prefersPowerOfTwoPanels: true,
    buildTrace: (example, panels) => buildRombergDraft(example, panels),
  },
  {
    id: "clenshaw-curtis",
    name: "Clenshaw-Curtis",
    formula: "x=(a+b)/2 + (b-a) cos(theta)/2",
    order: "Chebyshev-cosine quadrature",
    color: "#06b6d4",
    geometry:
      "Cosine-distributed nodes endpointlarni zichroq sample qiladi. Oscillatory va endpoint-sensitive integralda foydali.",
    category: "extrapolation",
    buildTrace: (example, panels) => buildClenshawCurtisDraft(example, panels),
  },
  {
    id: "importance-monte-carlo",
    name: "Importance Monte Carlo",
    formula: "\\int_a^b f(x)dx = E[f(X)/p(X)]",
    order: "Variance-reduced O(N^(-1/2))",
    color: "#b91c1c",
    geometry:
      "Sample'larni qiyin joyga zichroq yuboradi. Near-singular yoki sharp peak integralda variance va confidence interval ancha yaxshilanadi.",
    category: "stochastic",
    buildTrace: (example, panels) => buildImportanceMonteCarloDraft(example, panels),
  },
  {
    id: "monte-carlo",
    name: "Monte Carlo",
    formula: "(b-a) * mean f(X_i)",
    order: "O(N^(-1/2))",
    color: "#ef4444",
    geometry:
      "Domain ichida random sample tashlaydi. Foyda curvature emas, statistik dispersiya va confidence orqali ko'rinadi.",
    category: "stochastic",
    buildTrace: (example, panels) => buildMonteCarloDraft(example, panels),
  },
];

export const integrationExamples: IntegrationExampleSpec[] = [
  {
    id: "smooth-wave",
    name: "Smooth wave area",
    shortName: "Smooth wave",
    formula: "f(x)=1.25+0.55 sin(x)+0.18 cos(2x)",
    a: 0,
    b: Math.PI * 2,
    defaultPanels: 10,
    minPanels: 4,
    maxPanels: 96,
    exactValue: 1.25 * Math.PI * 2,
    fn: (x) => 1.25 + 0.55 * Math.sin(x) + 0.18 * Math.cos(2 * x),
    interpretation:
      "Silliq periodik funksiya. Simpson, Gauss va Romberg yuqori tartibli yaqinlashuvni juda toza ko'rsatadi.",
  },
  {
    id: "sharp-peak",
    name: "Sharp peak area",
    shortName: "Sharp peak",
    formula: "f(x)=0.08+1/(1+80(x-0.55)^2)",
    a: 0,
    b: 1,
    defaultPanels: 12,
    minPanels: 4,
    maxPanels: 128,
    exactValue: sharpPeakExact(0, 1, 0.55, 80, 0.08),
    fn: (x) => 0.08 + 1 / (1 + 80 * (x - 0.55) ** 2),
    interpretation:
      "Tor peak panel orasiga tushib qolsa oddiy qoidalar uni yaxshi ko'rmaydi; adaptive va Gauss shu joyda ustunroq.",
  },
  {
    id: "singular-edge",
    name: "Near singular edge",
    shortName: "Singular edge",
    formula: "f(x)=1/sqrt(x+0.002)",
    a: 0,
    b: 1,
    defaultPanels: 18,
    minPanels: 4,
    maxPanels: 128,
    exactValue: 2 * (Math.sqrt(1.002) - Math.sqrt(0.002)),
    fn: (x) => 1 / Math.sqrt(x + 0.002),
    interpretation:
      "x=0 yaqinida gradient juda katta. Adaptive refinement bu tipdagi near-singular integralda ayniqsa foydali.",
  },
  {
    id: "oscillatory",
    name: "Oscillatory wave train",
    shortName: "Oscillatory",
    formula: "f(x)=sin(28x)+0.35 cos(9x)",
    a: 0,
    b: 1,
    defaultPanels: 22,
    minPanels: 4,
    maxPanels: 128,
    exactValue: (1 - Math.cos(28)) / 28 + (0.35 * Math.sin(9)) / 9,
    fn: (x) => Math.sin(28 * x) + 0.35 * Math.cos(9 * x),
    interpretation:
      "Tez tebranadigan funksiya. High-order va adaptive metodlarning sample joylashuvi bu yerda keskin farq beradi.",
  },
];

export const surfaceIntegrationMethods: SurfaceIntegrationMethodSpec[] = [
  {
    id: "surface-midpoint",
    name: "Midpoint grid",
    formula: "sum f(x_c,y_c) dA",
    order: "O(h^2)",
    color: "#38bdf8",
    geometry:
      "Har cell markazidan bitta sample oladi. Uniform mesh uchun sodda va tez.",
    buildTrace: (example, resolution) => buildMidpointSurfaceTraceDraft(example, resolution),
  },
  {
    id: "surface-corner-average",
    name: "Corner average",
    formula: "sum mean(f corners) dA",
    order: "Trapezoidal surface rule",
    color: "#f97316",
    geometry:
      "Har cellning to'rt burchagini o'rtacha qiladi. Simmetriya kuchli bo'lgan sirtlarda biasni kamaytiradi.",
    buildTrace: (example, resolution) => buildCornerAverageSurfaceTraceDraft(example, resolution),
  },
  {
    id: "surface-tensor-gauss",
    name: "Tensor Gauss",
    formula: "sum mean(f at 2x2 Gauss nodes) dA",
    order: "Higher-order tensor product",
    color: "#22c55e",
    geometry:
      "Har cell ichida 2x2 optimal sample oladi. Peak va saddle sirtlarda gradientni yaxshiroq ushlaydi.",
    buildTrace: (example, resolution) => buildTensorGaussSurfaceTraceDraft(example, resolution),
  },
];

export const volumeIntegrationMethods: VolumeIntegrationMethodSpec[] = [
  {
    id: "volume-midpoint",
    name: "Midpoint columns",
    formula: "sum h(x_c,y_c) dA",
    order: "O(h^2)",
    color: "#38bdf8",
    geometry:
      "Har ustun markazidan sample olinadi. Hajmni ko'rsatishda eng intuitiv bazaviy usul.",
    buildTrace: (example, resolution) => buildMidpointVolumeTraceDraft(example, resolution),
  },
  {
    id: "volume-corner-average",
    name: "Corner average",
    formula: "sum mean(h corners) dA",
    order: "Trapezoidal in base plane",
    color: "#f97316",
    geometry:
      "Har ustunning to'rt burchagidagi balandliklar o'rtachalashadi. Curvature bo'lganda midpoint bilan farqi ko'rinadi.",
    buildTrace: (example, resolution) => buildCornerAverageVolumeTraceDraft(example, resolution),
  },
  {
    id: "volume-tensor-gauss",
    name: "Tensor Gauss",
    formula: "sum mean(h at 2x2 Gauss nodes) dA",
    order: "Higher-order tensor product",
    color: "#22c55e",
    geometry:
      "Base cell ichida optimal 2x2 sample oladi va ustun balandligini shunga ko'ra belgilaydi.",
    buildTrace: (example, resolution) => buildTensorGaussVolumeTraceDraft(example, resolution),
  },
];

export const surfaceIntegralExamples: SurfaceIntegralExampleSpec[] = [
  {
    id: "surface-wave",
    name: "Wave surface integral",
    shortName: "Wave surface",
    formula: "∫∫ [1+0.35 sin(pi x) sin(pi y)] dA",
    xRange: [0, 1],
    yRange: [0, 1],
    defaultResolution: 12,
    minResolution: 4,
    maxResolution: 32,
    exactValue: 1 + 0.35 * (4 / (Math.PI * Math.PI)),
    fn: (x, y) => 1 + 0.35 * Math.sin(Math.PI * x) * Math.sin(Math.PI * y),
    interpretation:
      "Wave peaklarni uniform mesh bilan olish qiyinroq. Tensor Gauss sample geometriyasi shu yerda foydali.",
  },
  {
    id: "saddle-sheet",
    name: "Saddle sheet integral",
    shortName: "Saddle sheet",
    formula: "∫∫ [1+x^2-y^2] dA, [-1,1]^2",
    xRange: [-1, 1],
    yRange: [-1, 1],
    defaultResolution: 12,
    minResolution: 4,
    maxResolution: 32,
    exactValue: 4,
    fn: (x, y) => 1 + x * x - y * y,
    interpretation:
      "Musbat va manfiy curvature bir-birini kompensatsiya qiladi. Method sample patterni shu kompensatsiyani qanday ushlashi ko'rinadi.",
  },
  {
    id: "ridge-surface",
    name: "Ridge surface integral",
    shortName: "Ridge surface",
    formula: "∫∫ [0.4+exp(-18(x-0.65)^2)-0.22(y-0.35)^2] dA",
    xRange: [0, 1],
    yRange: [0, 1],
    defaultResolution: 14,
    minResolution: 4,
    maxResolution: 32,
    exactValue: 0.4 + ridgeIntegral() - 0.22 / 12,
    fn: (x, y) => 0.4 + Math.exp(-18 * (x - 0.65) ** 2) - 0.22 * (y - 0.35) ** 2,
    interpretation:
      "Cho'qqi cho'zilgan ridge bo'lib keladi. Corner-average va midpoint joylashuvi orasidagi farq kuchliroq seziladi.",
  },
];

export const volumeIntegralExamples: VolumeIntegralExampleSpec[] = [
  {
    id: "paraboloid-solid",
    name: "Paraboloid solid volume",
    shortName: "Paraboloid",
    formula: "V=∫∫ [1.15-0.35(x^2+y^2)] dA, [-1,1]^2",
    xRange: [-1, 1],
    yRange: [-1, 1],
    zRange: [0, 1.15],
    defaultResolution: 10,
    minResolution: 4,
    maxResolution: 34,
    exactValue: 4.6 - 0.35 * (8 / 3),
    height: (x, y) => 1.15 - 0.35 * (x * x + y * y),
    interpretation:
      "Haqiqiy hajm misoli: har ustun h(x,y)dA bo'yicha solid hajmni quradi. Higher-order sample ustun tepasini sezilarli tuzatadi.",
  },
  {
    id: "wave-solid",
    name: "Wave solid volume",
    shortName: "Wave solid",
    formula: "V=∫∫ [0.72+0.32 sin(pi x)sin(pi y)] dA",
    xRange: [0, 1],
    yRange: [0, 1],
    zRange: [0, 1.04],
    defaultResolution: 12,
    minResolution: 4,
    maxResolution: 34,
    exactValue: 0.72 + 0.32 * (4 / (Math.PI * Math.PI)),
    height: (x, y) => 0.72 + 0.32 * Math.sin(Math.PI * x) * Math.sin(Math.PI * y),
    interpretation:
      "Wave sirt ostidagi hajm. Resolution va sample pattern birga ishlaydi.",
  },
  {
    id: "ridge-solid",
    name: "Ridge solid volume",
    shortName: "Ridge solid",
    formula: "V=∫∫ [0.35+exp(-14((x-0.6)^2+(y-0.45)^2))] dA",
    xRange: [0, 1],
    yRange: [0, 1],
    zRange: [0, 1.4],
    defaultResolution: 12,
    minResolution: 4,
    maxResolution: 34,
    exactValue: 0.35 + gaussianBumpIntegral(),
    height: (x, y) => 0.35 + Math.exp(-14 * ((x - 0.6) ** 2 + (y - 0.45) ** 2)),
    interpretation:
      "Markazdan siljigan sharp bump. Midpoint va tensor Gauss orasidagi farq ayniqsa peak atrofida seziladi.",
  },
];

function sharpPeakExact(
  a: number,
  b: number,
  center: number,
  sharpness: number,
  baseline: number,
) {
  const root = Math.sqrt(sharpness);
  return (
    baseline * (b - a) +
    (Math.atan(root * (b - center)) - Math.atan(root * (a - center))) / root
  );
}

function ridgeIntegral() {
  const gaussian = Math.sqrt(Math.PI / 18) * 0.5 * (erf(Math.sqrt(18) * 0.35) + erf(Math.sqrt(18) * 0.65));
  return gaussian;
}

function gaussianBumpIntegral() {
  const oneDimensional =
    Math.sqrt(Math.PI / 14) *
    0.5 *
    (erf(Math.sqrt(14) * 0.6) + erf(Math.sqrt(14) * 0.4));
  const other =
    Math.sqrt(Math.PI / 14) *
    0.5 *
    (erf(Math.sqrt(14) * 0.45) + erf(Math.sqrt(14) * 0.55));
  return oneDimensional * other;
}

function erf(x: number) {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax));
  return sign * y;
}
