import {
  buildLeftPanels,
  buildMidpointPanels,
  buildSimpsonPanels,
  buildTrapezoidPanels,
} from "../core";
import type { IntegrationExampleSpec, IntegrationMethodSpec } from "../core";
import type { SurfaceIntegralExampleSpec, VolumeIntegralExampleSpec } from "../core";

export const integrationMethods: IntegrationMethodSpec[] = [
  {
    id: "left-rectangle",
    name: "Left Rectangle",
    formula: "sum f(x_i) h",
    order: "O(h)",
    color: "#e69f00",
    geometry: "Har panelda chap nuqtadagi balandlikni butun intervalga yoyadi. Egri chiziq tez o‘zgarganda yuzani sistematik oshirib yoki kamaytirib yuboradi.",
    buildPanels: buildLeftPanels,
  },
  {
    id: "midpoint-rule",
    name: "Midpoint",
    formula: "sum f((x_i+x_{i+1})/2) h",
    order: "O(h^2)",
    color: "#009e73",
    geometry: "Panel markazidagi balandlikni oladi. Simmetriya sabab ko‘p silliq funksiyalarda left rectangle’dan ancha barqarorroq xato beradi.",
    buildPanels: buildMidpointPanels,
  },
  {
    id: "trapezoid",
    name: "Trapezoid",
    formula: "sum h(f_i+f_{i+1})/2",
    order: "O(h^2)",
    color: "#56b4e9",
    geometry: "Har panelda egri chiziqni to‘g‘ri chiziq bilan almashtiradi. Curvature qayerda katta bo‘lsa, xato ham shu joyda ko‘rinadi.",
    buildPanels: buildTrapezoidPanels,
  },
  {
    id: "simpson",
    name: "Simpson",
    formula: "h/3 sum (f_0+4f_1+f_2)",
    order: "O(h^4)",
    color: "#cc79a7",
    geometry: "Ikki panel bo‘yicha parabola geometriyasini oladi. Smooth funksiyada juda tez yaqinlashadi, lekin juft panel soni talab qiladi.",
    requiresEvenPanels: true,
    buildPanels: buildSimpsonPanels,
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
    maxPanels: 64,
    exactValue: 1.25 * Math.PI * 2,
    fn: (x) => 1.25 + 0.55 * Math.sin(x) + 0.18 * Math.cos(2 * x),
    interpretation: "Silliq periodik funksiya. Trapezoid va Simpson egri shaklini tez ushlaydi; rectangle metodlarda phase bias ko‘rinadi.",
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
    maxPanels: 80,
    exactValue: sharpPeakExact(0, 1, 0.55, 80, 0.08),
    fn: (x) => 0.08 + 1 / (1 + 80 * (x - 0.55) ** 2),
    interpretation: "Tor peak panel orasiga tushib qolsa metod uni ko‘rmaydi. Bu misol sampling geometriyasi xatoni qanday yaratishini ko‘rsatadi.",
  },
];

export const surfaceIntegralExamples: SurfaceIntegralExampleSpec[] = [
  {
    id: "surface-wave",
    name: "Wave surface integral",
    shortName: "Wave surface",
    formula: "∫∫ [1+0.35 sin(πx) sin(πy)] dA",
    xRange: [0, 1],
    yRange: [0, 1],
    defaultResolution: 12,
    minResolution: 4,
    maxResolution: 32,
    exactValue: 1 + 0.35 * (4 / (Math.PI * Math.PI)),
    fn: (x, y) => 1 + 0.35 * Math.sin(Math.PI * x) * Math.sin(Math.PI * y),
    interpretation: "Mesh sirtni kichik dA celllarga bo‘ladi. Resolution oshganda sample nuqtalar wave peakni yaxshiroq ushlaydi.",
  },
  {
    id: "saddle-sheet",
    name: "Saddle sheet integral",
    shortName: "Saddle sheet",
    formula: "∫∫ [1+x²-y²] dA, [-1,1]²",
    xRange: [-1, 1],
    yRange: [-1, 1],
    defaultResolution: 12,
    minResolution: 4,
    maxResolution: 32,
    exactValue: 4,
    fn: (x, y) => 1 + x * x - y * y,
    interpretation: "Musbat va manfiy curvature bir-birini kompensatsiya qiladi. Vizual mesh xato qayerda simmetriya bilan yo‘qolishini ko‘rsatadi.",
  },
];

export const volumeIntegralExamples: VolumeIntegralExampleSpec[] = [
  {
    id: "paraboloid-solid",
    name: "Paraboloid solid volume",
    shortName: "Paraboloid",
    formula: "V=∫∫ [1.15-0.35(x²+y²)] dA, [-1,1]²",
    xRange: [-1, 1],
    yRange: [-1, 1],
    zRange: [0, 1.15],
    defaultResolution: 10,
    minResolution: 4,
    maxResolution: 34,
    exactValue: 4.6 - 0.35 * (8 / 3),
    height: (x, y) => 1.15 - 0.35 * (x * x + y * y),
    interpretation: "Bu haqiqiy hajm misoli: har bir ustun h(x,y)dA bo‘yicha solid hajmni quradi. Resolution oshganda paraboloid ostidagi jism silliqlashadi.",
  },
  {
    id: "wave-solid",
    name: "Wave solid volume",
    shortName: "Wave solid",
    formula: "V=∫∫ [0.72+0.32 sin(πx)sin(πy)] dA",
    xRange: [0, 1],
    yRange: [0, 1],
    zRange: [0, 1.04],
    defaultResolution: 12,
    minResolution: 4,
    maxResolution: 34,
    exactValue: 0.72 + 0.32 * (4 / (Math.PI * Math.PI)),
    height: (x, y) => 0.72 + 0.32 * Math.sin(Math.PI * x) * Math.sin(Math.PI * y),
    interpretation: "Wave sirt ostidagi hajm. Ustunlarning balandligi integral ostidagi funksiya qiymati, ularning yig‘indisi esa numeric volume.",
  },
];

function sharpPeakExact(a: number, b: number, center: number, sharpness: number, baseline: number) {
  const root = Math.sqrt(sharpness);
  return baseline * (b - a) + (Math.atan(root * (b - center)) - Math.atan(root * (a - center))) / root;
}
