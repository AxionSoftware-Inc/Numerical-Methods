import type { PdeExampleSpec, PdeMethodSpec } from "../core";

export const pdeMethods: PdeMethodSpec[] = [
  {
    id: "ftcs",
    name: "FTCS",
    formula: "u_i^(n+1)=u_i^n+r(u_(i-1)^n-2u_i^n+u_(i+1)^n)",
    order: "O(dt + dx^2)",
    color: "#38bdf8",
    stability: "r <= 1/2 da barqaror",
    geometry: "Issiqlik diffuziyasini faqat oldingi vaqt qatlamidan quradi. Katta dt bo‘lsa heatmapda tebranish va portlash darrov bilinadi.",
    theta: 0,
  },
  {
    id: "crank-nicolson",
    name: "Crank-Nicolson",
    formula: "(I-rL/2)u^(n+1)=(I+rL/2)u^n",
    order: "O(dt^2 + dx^2)",
    color: "#f472b6",
    stability: "A-stable, explicitga qaraganda ancha sokin",
    geometry: "Ikki vaqt qatlamining o‘rtacha geometriyasini oladi. Diffusion shaklini silliq ushlab, time-step kattaroq bo‘lsa ham profilni yaxshi saqlaydi.",
    theta: 0.5,
  },
];

export const pdeExamples: PdeExampleSpec[] = [
  {
    id: "heated-string",
    name: "Heated string",
    shortName: "String",
    equation: "u_t = 0.12 u_xx, u(x,0)=sin(πx), u(0,t)=u(1,t)=0",
    domain: [0, 1],
    endTime: 1.2,
    diffusivity: 0.12,
    defaultCells: 24,
    minCells: 8,
    maxCells: 96,
    defaultTimeSteps: 72,
    minTimeSteps: 12,
    maxTimeSteps: 240,
    initial: (x) => Math.sin(Math.PI * x),
    exact: (x, t) => Math.exp(-0.12 * Math.PI * Math.PI * t) * Math.sin(Math.PI * x),
    interpretation: "Bir modali issiqlik profili eksponent ravishda pasayadi. Metod diffusion amplitudasini qanchalik to‘g‘ri so‘ndirayotganini aniq ko‘rsatadi.",
  },
  {
    id: "double-bump",
    name: "Double bump diffusion",
    shortName: "Double bump",
    equation: "u_t = 0.08 u_xx, u(x,0)=sin(2πx)+0.35 sin(5πx)",
    domain: [0, 1],
    endTime: 0.9,
    diffusivity: 0.08,
    defaultCells: 28,
    minCells: 8,
    maxCells: 96,
    defaultTimeSteps: 80,
    minTimeSteps: 12,
    maxTimeSteps: 260,
    initial: (x) => Math.sin(2 * Math.PI * x) + 0.35 * Math.sin(5 * Math.PI * x),
    exact: (x, t) =>
      Math.exp(-0.08 * 4 * Math.PI * Math.PI * t) * Math.sin(2 * Math.PI * x) +
      0.35 * Math.exp(-0.08 * 25 * Math.PI * Math.PI * t) * Math.sin(5 * Math.PI * x),
    interpretation: "Yuqori chastotali komponent tezroq so‘nadi. Heatmapda metodlar spectral smoothingni qanday ushlayotgani juda yaxshi ko‘rinadi.",
  },
];
