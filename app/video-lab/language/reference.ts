import { listVideoLabPrimitiveReferences } from "./primitives";

export type VideoLabReferenceItem = {
  id: string;
  title: string;
  category: "setup" | "objects" | "animation" | "variables" | "layout";
  description: string;
  examples: string[];
};

export const VIDEO_LAB_REFERENCE: VideoLabReferenceItem[] = [
  {
    id: "variables",
    title: "Variables",
    category: "variables",
    description: "Koordinata, rang, son va matnlarni tepada saqlab, keyin ishlatish.",
    examples: [
      `origin = [0, 0, 0]`,
      `peak_pos = [0, 0.54, 0]`,
      `main = cyan`,
      `n = 7`,
    ],
  },
  {
    id: "scene",
    title: "Scene setup",
    category: "setup",
    description: "Sahna nomi, duration, fps va kamera harakati.",
    examples: [
      `scene "Volume Integral Demo"`,
      `duration = 8`,
      `fps = 30`,
      `camera orbit radius 5.5 height 3.05 turns 0.62`,
    ],
  },
  {
    id: "camera-presets",
    title: "Camera presets",
    category: "setup",
    description: "Ready-made camera setups for common scientific scenes.",
    examples: [
      "camera preset 2d",
      "camera preset surface",
      "camera preset graph",
      "camera preset field",
      "camera preset top",
      "camera preset close",
    ],
  },
  {
    id: "positions",
    title: "Named positions",
    category: "layout",
    description: "Koordinata o‘rniga tayyor joy nomlarini ishlatish mumkin.",
    examples: [
      `formula f = "x^2" at formula`,
      `text note = "Area" at bottom-left`,
      `box cube at center size 1`,
      `point p at origin`,
    ],
  },
  {
    id: "title-subtitle",
    title: "Title / subtitle",
    category: "objects",
    description: "Sahna sarlavhasi va izoh matni.",
    examples: [
      `title "Derivative"`,
      `subtitle "Limit definition of slope"`,
      `title "Vector Addition" at top color cyan`,
    ],
  },
  {
    id: "formula",
    title: "Formula",
    category: "objects",
    description: "LaTeX formula obyekt yaratish. Hozircha text fallback, keyin real KaTeX/SVG bo‘ladi.",
    examples: [
      `formula f = "\\int_a^b f(x) dx"`,
      `formula eq = "a + b = c" at top color yellow`,
      `write eq in 1s`,
    ],
  },
  {
    id: "text",
    title: "Text",
    category: "objects",
    description: "Oddiy matn obyekt yaratish.",
    examples: [
      `text note = "Area under curve" at bottom-left`,
      `text label_a = "a" at [0.55, 0.58, 0.18] color sky`,
      `show note in 0.8s`,
    ],
  },
  {
    id: "grid-axes",
    title: "Grid / axes",
    category: "objects",
    description: "Koordinata maydoni va o‘qlar.",
    examples: [
      `grid`,
      `grid size 3.2 divisions 18 color teal opacity 0.3`,
      `axes`,
      `axes origin [-1.55, -0.82, -1.35] size 1.55 ylabel "h"`,
    ],
  },
  {
    id: "box-plane",
    title: "Box / plane",
    category: "objects",
    description: "3D box va tekislik obyektlari.",
    examples: [
      `box cube at center size 1 color sky`,
      `box cube at [0, 0, 0] size [1, 1.4, 1] opacity 0.8`,
      `plane base at grid size 2.4 2.4 color teal opacity 0.18`,
    ],
  },
  {
    id: "point-arrow-path",
    title: "Point / arrow / path",
    category: "objects",
    description: "Nuqta, vektor/o‘q va chiziqli yo‘l.",
    examples: [
      `point peak at [0, 0.54, 0] label "max contribution"`,
      `arrow v from origin to [1, 0.5, 0] color cyan`,
      `path motion points start [0, -0.05, 0.35] end color yellow`,
    ],
  },
  {
    id: "riemann",
    title: "Riemann columns",
    category: "objects",
    description: "Integral demo uchun tayyor ustunlar generatori.",
    examples: [
      `riemann columns count 7`,
      `show columns from 0.18 in 1.2s`,
      `spin columns y 0.72 turns in 2.5s`,
    ],
  },
  {
    id: "graph",
    title: "Graph",
    category: "objects",
    description: "Function graph yaratadi. Expression sample qilinib path obyektga aylantiriladi.",
    examples: [
      `graph g = sin(x) from -pi to pi color cyan`,
      `graph p = x^2 from -2 to 2 color yellow`,
      `graph line = 0.5*x + 1 from -3 to 3 color red`,
      `write g in 1s`,
    ],
  },
  {
    id: "write-show-hide",
    title: "Write / show / hide",
    category: "animation",
    description: "Obyektni sahnaga chiqarish yoki yashirish.",
    examples: [
      `write title in 0.8s`,
      `show cube from 0 in 0.6s`,
      `fade formula in 0.8s`,
      `hide note in 0.4s`,
      `fadeout formula in 0.6s`,
    ],
  },
  {
    id: "move-scale-rotate",
    title: "Move / scale / rotate",
    category: "animation",
    description: "Obyekt transformatsiyalari. Direction yoki target position ishlatish mumkin.",
    examples: [
      `move cube up 0.4 in 1s`,
      `move cube to center in 0.8s`,
      `scale cube 1.35 in 0.8s`,
      `rotate cube y 180deg in 1.1s`,
    ],
  },
  {
    id: "highlight-spin-wait",
    title: "Highlight / spin / wait",
    category: "animation",
    description: "E’tibor qaratish, aylantirish va pauza.",
    examples: [
      `highlight result in 0.8s`,
      `highlight eq color yellow scale 1.12 in 0.75s`,
      `spin columns y 0.72 turns in 2.5s`,
      `wait 0.4s`,
    ],
  },
  ...listVideoLabPrimitiveReferences().map((reference) => ({
    ...reference,
    category: "objects" as const,
  })),
];

export const VIDEO_LAB_REFERENCE_CATEGORIES: Array<{
  id: VideoLabReferenceItem["category"];
  title: string;
}> = [
    { id: "setup", title: "Setup" },
    { id: "variables", title: "Variables" },
    { id: "layout", title: "Layout" },
    { id: "objects", title: "Objects" },
    { id: "animation", title: "Animation" },
  ];

export function referenceByCategory(category: VideoLabReferenceItem["category"]) {
  return VIDEO_LAB_REFERENCE.filter((item) => item.category === category);
}
