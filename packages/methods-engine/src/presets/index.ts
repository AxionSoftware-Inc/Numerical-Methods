import { addScaled } from "../core";
import type { ExampleSpec, MethodSpec } from "../core";
export { integrationExamples, integrationMethods, surfaceIntegralExamples, volumeIntegralExamples } from "./integration";
export { pdeExamples, pdeMethods } from "./pde";

const stageColors = ["#f0e442", "#009e73", "#cc79a7", "#d55e00"];

export const methods: MethodSpec[] = [
  {
    id: "euler",
    name: "Euler",
    formula: "y(n+1) = y(n) + h f(y(n))",
    stability: "R(z) = 1 + z",
    stabilityPolynomial: [1, 1],
    color: "#e69f00",
    geometry: "Urinma yo‘nalishida to‘g‘ri qadam tashlaydi. Egri oqimni sindirilgan chiziqqa aylantirgani uchun xato fazoda tez ko‘rinadi.",
    computeStep: (point, t, h, field) => {
      const k1 = field(point, t);
      return {
        next: addScaled(point, k1, h),
        stages: [{ label: "k1", sample: point, vectorEnd: addScaled(point, k1, h), color: stageColors[0] }],
      };
    },
  },
  {
    id: "midpoint",
    name: "Midpoint RK2",
    formula: "k1=f(y), k2=f(y+h k1/2), y+=h k2",
    stability: "R(z) = 1 + z + z^2/2",
    stabilityPolynomial: [1, 1, 1 / 2],
    color: "#009e73",
    geometry: "Avval yarim qadam bilan oqimning ichki yo‘nalishini taxmin qiladi. Endi sahnada k1 yarim-qadam va k2 correction alohida stage sifatida ko‘rinadi.",
    computeStep: (point, t, h, field) => {
      const k1 = field(point, t);
      const mid = addScaled(point, k1, h / 2);
      const k2 = field(mid, t + h / 2);
      return {
        next: addScaled(point, k2, h),
        stages: [
          { label: "k1/2", sample: point, vectorEnd: mid, color: stageColors[0] },
          { label: "k2", sample: mid, vectorEnd: addScaled(mid, k2, h / 2), color: stageColors[1] },
        ],
      };
    },
  },
  {
    id: "rk4",
    name: "Runge-Kutta 4",
    formula: "y+=h(k1+2k2+2k3+k4)/6",
    stability: "R(z) = 1+z+z^2/2+z^3/6+z^4/24",
    stabilityPolynomial: [1, 1, 1 / 2, 1 / 6, 1 / 24],
    color: "#cc79a7",
    geometry: "Bitta qadam ichida to‘rtta slope oladi. Stage lens k1, k2, k3 va k4 ichki namuna nuqtalarini ko‘rsatadi, shunda RK2/RK4 farqi pathdan oldin ham seziladi.",
    computeStep: (point, t, h, field) => {
      const k1 = field(point, t);
      const p2 = addScaled(point, k1, h / 2);
      const k2 = field(p2, t + h / 2);
      const p3 = addScaled(point, k2, h / 2);
      const k3 = field(p3, t + h / 2);
      const p4 = addScaled(point, k3, h);
      const k4 = field(p4, t + h);
      return {
        next: [
          point[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
          point[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
          point[2] + (h / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
        ],
        stages: [
          { label: "k1", sample: point, vectorEnd: addScaled(point, k1, h / 2), color: stageColors[0] },
          { label: "k2", sample: p2, vectorEnd: addScaled(p2, k2, h / 2), color: stageColors[1] },
          { label: "k3", sample: p3, vectorEnd: addScaled(p3, k3, h / 2), color: stageColors[2] },
          { label: "k4", sample: p4, vectorEnd: addScaled(p4, k4, h / 2), color: stageColors[3] },
        ],
      };
    },
  },
  {
    id: "symplectic",
    name: "Symplectic Euler",
    formula: "v(n+1)=v(n)-h x(n), x(n+1)=x(n)+h v(n+1)",
    stability: "Hamilton tizimlarda faza tuzilishini yaxshiroq tutadi",
    color: "#d55e00",
    geometry: "Oddiy Eulerga o‘xshash sodda, lekin oscillator kabi Hamilton tizimlarda orbitaning faza geometriyasini yaxshiroq saqlaydi. Stage lens avval velocity, keyin position update tartibini ajratib beradi.",
    computeStep: (point, t, h, field) => {
      const [, , dz] = field(point, t);
      const velocity = point[1] - h * point[0];
      const position = point[0] + h * velocity;
      const velocityPoint: [number, number, number] = [point[0], velocity, point[2] + (h * dz) / 2];
      const next: [number, number, number] = [position, velocity, point[2] + h * dz];
      return {
        next,
        stages: [
          { label: "v", sample: point, vectorEnd: velocityPoint, color: stageColors[0] },
          { label: "x", sample: velocityPoint, vectorEnd: next, color: stageColors[1] },
        ],
      };
    },
  },
];

export const examples: ExampleSpec[] = [
  {
    id: "helix",
    name: "Spiral oqim",
    shortName: "Spiral",
    equation: "f(x,y,z) = [-y, x, 0.18]",
    initial: [1, 0, -1.6],
    endTime: Math.PI * 2 * 2.8,
    defaultStep: 0.14,
    minStep: 0.08,
    maxStep: 0.75,
    exact: (t) => [Math.cos(t), Math.sin(t), -1.6 + 0.18 * t],
    exactFlow: ([x, y, z], _t, h) => [
      x * Math.cos(h) - y * Math.sin(h),
      x * Math.sin(h) + y * Math.cos(h),
      z + 0.18 * h,
    ],
    field: ([x, y]) => [-y, x, 0.18],
    metricLabel: "Yakuniy radius",
    metric: ([x, y]) => Math.hypot(x, y),
    criticalMarkers: [],
    criticalSearch: {
      enabled: false,
      xRange: [-1.4, 1.4],
      yRange: [-1.4, 1.4],
      z: -1.6,
      samples: 33,
      threshold: 0.04,
    },
    interpretation: "Haqiqiy oqim radiusni saqlaydi va spiral bo‘lib ko‘tariladi. Metod qadam tashlaganda oqim geometriyasini qanchalik deformatsiya qilayotgani ko‘rinadi.",
    fieldScale: 0.18,
    gridZ: -1.75,
  },
  {
    id: "oscillator",
    name: "Garmonik oscillator",
    shortName: "Oscillator",
    equation: "x' = v, v' = -x, z' = 0.08",
    initial: [1, 0, -1.25],
    endTime: Math.PI * 2 * 3.2,
    defaultStep: 0.2,
    minStep: 0.06,
    maxStep: 0.65,
    exact: (t) => [Math.cos(t), -Math.sin(t), -1.25 + 0.08 * t],
    exactFlow: ([x, v, z], _t, h) => [
      x * Math.cos(h) + v * Math.sin(h),
      v * Math.cos(h) - x * Math.sin(h),
      z + 0.08 * h,
    ],
    field: ([x, v]) => [v, -x, 0.08],
    metricLabel: "Energiya E",
    metric: ([x, v]) => x * x + v * v,
    criticalMarkers: [
      {
        label: "phase equilibrium",
        point: [0, 0, -1.25],
        kind: "equilibrium",
        severity: 0.65,
        description: "x=v=0 faza tekisligidagi tinch nuqta; z yo‘nalishi sahna uchun vaqt o‘qi sifatida siljiydi.",
      },
    ],
    criticalSearch: {
      enabled: true,
      xRange: [-1.2, 1.2],
      yRange: [-1.2, 1.2],
      z: -1.25,
      samples: 41,
      threshold: 0.055,
      zWeight: 0,
    },
    interpretation: "Bu faza fazosidagi aylanish. Yaxshi metod orbitani keraksiz shishirmaydi yoki ichkariga yemirmaydi; xato chiziqlari energiya buzilishini ko‘rsatadi.",
    fieldScale: 0.2,
    gridZ: -1.45,
  },
];
