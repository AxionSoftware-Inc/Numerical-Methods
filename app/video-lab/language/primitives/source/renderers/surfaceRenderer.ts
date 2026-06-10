import type { VisualColor, VisualSceneSpec, VisualVec3 } from "@methodslab/visual-engine/core";
import type { CompiledMathExpression } from "../../math/expression";

export type SurfaceRenderMode = "lines" | "mesh" | "dots";

export type SurfaceRenderOptions = {
  id: string;
  expression: CompiledMathExpression;
  mode: SurfaceRenderMode;

  range: number;
  rows: number;
  cols: number;

  scale: number;
  height: number;
  baseY: number;
  baseZ: number;
  time: number;

  color: string;
  opacity: number;
  palette: string;
  shade: number;
  contrast: number;
  brightness: number;

  meshOpacity: number;
  lineOpacity: number;

  wireframe: boolean;
  wireOpacity: number;

  guides: number;
  guideOpacity: number;
  edgeFade: number;

  pointSize: number;
  pointOpacity: number;
};

export type SurfaceRenderResult = {
  scene: VisualSceneSpec;
  lineRows: Array<{
    id: string;
    objectId: string;
    points: VisualVec3[];
    color: VisualColor;
    opacity: number;
  }>;
  guideRows: Array<{
    id: string;
    objectId: string;
    points: VisualVec3[];
    color: VisualColor;
    opacity: number;
  }>;
};

export function renderSampledSurface(options: SurfaceRenderOptions): SurfaceRenderResult {
  const grid = createSurfaceGrid(options);

  return {
    scene: createSurfaceVisualScene(options, grid),
    lineRows: options.mode === "dots" ? [] : createSurfaceLineRows(options, grid),
    guideRows: options.mode === "dots" ? [] : createSurfaceGuideRows(options, grid),
  };
}

function createSurfaceGrid(options: SurfaceRenderOptions): VisualVec3[][] {
  const rowStep = options.rows <= 1 ? 0 : (options.range * 2) / (options.rows - 1);
  const colStep = options.cols <= 1 ? 0 : (options.range * 2) / (options.cols - 1);

  const grid: VisualVec3[][] = [];

  for (let row = 0; row < options.rows; row += 1) {
    const sourceY = -options.range + row * rowStep;
    const rowPoints: VisualVec3[] = [];

    for (let col = 0; col < options.cols; col += 1) {
      const sourceX = -options.range + col * colStep;

      const value = options.expression.evaluate({
        x: sourceX,
        y: sourceY,
        t: options.time,
      });

      if (!Number.isFinite(value)) {
        rowPoints.push([
          sourceX * options.scale,
          options.baseY,
          options.baseZ + sourceY * options.scale,
        ]);
        continue;
      }

      rowPoints.push([
        sourceX * options.scale,
        options.baseY + value * options.height,
        options.baseZ + sourceY * options.scale,
      ]);
    }

    grid.push(rowPoints);
  }

  return grid;
}

function createSurfaceVisualScene(
  options: SurfaceRenderOptions,
  grid: VisualVec3[][],
): VisualSceneSpec {
  return {
    id: `${options.id}-surface-scene`,
    style: {
      background: "#050b0f",
      fogNear: 9,
      fogFar: 30,
    },
    camera: {
      position: [3.8, 3.2, 4.8],
      target: [0, -0.1, 0],
      fov: 42,
      minDistance: 1.8,
      maxDistance: 14,
    },
    layers: createSurfaceLayers(options, grid),
  };
}

function createSurfaceLayers(options: SurfaceRenderOptions, grid: VisualVec3[][]): VisualSceneSpec["layers"] {
  if (options.mode === "dots") {
    return [
      {
        kind: "point-cloud",
        id: `${options.id}-dots`,
        objectId: options.id,
        points: grid.flat(),
        color: options.color,
        opacity: options.pointOpacity,
        size: options.pointSize,
        depthTest: false,
        sizeAttenuation: true,
      },
    ];
  }

  if (options.mode !== "mesh") {
    return [];
  }

  const { positions, indices, colors } = createSurfaceMeshGeometry(options, grid);

  return [
    {
      kind: "mesh",
      id: `${options.id}-mesh`,
      objectId: options.id,
      positions,
      indices,
      colors,
      material: {
        color: "#ffffff",
        vertexColors: true,
        opacity: options.meshOpacity,
        transparent: true,
        doubleSided: true,
        depthWrite: false,
        depthTest: false,
        shading: "basic",
      },
      wireframe: options.wireframe
        ? {
            color: options.color,
            opacity: options.wireOpacity,
            depthTest: false,
          }
        : undefined,
    },
  ];
}

function createSurfaceMeshGeometry(
  options: SurfaceRenderOptions,
  grid: VisualVec3[][],
): {
  positions: number[];
  indices: number[];
  colors: number[];
} {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  grid.forEach((row) => {
    row.forEach((point) => {
      minY = Math.min(minY, point[1]);
      maxY = Math.max(maxY, point[1]);
    });
  });

  const ySpan = Math.max(maxY - minY, 1e-9);

  grid.forEach((row) => {
    row.forEach((point) => {
      const normalizedHeight = (point[1] - minY) / ySpan;
      const adjusted = adjustSurfaceTone(
        normalizedHeight,
        options.contrast,
        options.brightness,
      );

      const rgb = surfacePaletteColor(
        options.palette,
        options.color,
        adjusted,
        options.shade,
      );

      positions.push(point[0], point[1], point[2]);
      colors.push(rgb[0], rgb[1], rgb[2]);
    });
  });

  for (let row = 0; row < options.rows - 1; row += 1) {
    for (let col = 0; col < options.cols - 1; col += 1) {
      const a = row * options.cols + col;
      const b = row * options.cols + col + 1;
      const c = (row + 1) * options.cols + col + 1;
      const d = (row + 1) * options.cols + col;

      indices.push(a, b, c);
      indices.push(a, c, d);
    }
  }

  return { positions, indices, colors };
}

function createSurfaceLineRows(
  options: SurfaceRenderOptions,
  grid: VisualVec3[][],
): SurfaceRenderResult["lineRows"] {
  const rows: SurfaceRenderResult["lineRows"] = [];

  for (let row = 0; row < options.rows; row += 1) {
    const rowProgress = options.rows <= 1 ? 0 : row / (options.rows - 1);
    const points = grid[row];

    if (points.length < 2) continue;

    const centerWeight = 1 - Math.abs(rowProgress - 0.5) * 2;
    const fadeWeight = 1 - options.edgeFade + options.edgeFade * centerWeight;
    const opacity = options.lineOpacity * fadeWeight;

    if (opacity <= 0) continue;

    rows.push({
      id: `${options.id}-row-${row}`,
      objectId: options.id,
      points,
      color: options.color,
      opacity,
    });
  }

  return rows;
}

function createSurfaceGuideRows(
  options: SurfaceRenderOptions,
  grid: VisualVec3[][],
): SurfaceRenderResult["guideRows"] {
  if (options.guides <= 0) return [];

  const rows: SurfaceRenderResult["guideRows"] = [];
  const guideEvery = Math.max(1, Math.round(options.cols / options.guides));

  for (let col = 0; col < options.cols; col += guideEvery) {
    const points: VisualVec3[] = [];

    for (let row = 0; row < options.rows; row += 1) {
      points.push(grid[row][col]);
    }

    if (points.length < 2) continue;

    const opacity = options.opacity * options.guideOpacity;

    if (opacity <= 0) continue;

    rows.push({
      id: `${options.id}-guide-${col}`,
      objectId: options.id,
      points,
      color: options.color,
      opacity,
    });
  }

  return rows;
}

function adjustSurfaceTone(
  value: number,
  contrast: number,
  brightness: number,
): number {
  const centered = (value - 0.5) * contrast + 0.5;
  return clamp01(centered * brightness);
}

function surfacePaletteColor(
  palette: string,
  fallbackColor: string,
  value: number,
  shade: number,
): [number, number, number] {
  const t = clamp01(value);
  const base = colorNameToRgb(fallbackColor);

  if (palette === "white") {
    return mixRgb([0.08, 0.1, 0.13], [1, 1, 1], t, shade);
  }

  if (palette === "cyan") {
    return mixRgb([0.02, 0.16, 0.22], [0.55, 0.96, 1], t, shade);
  }

  if (palette === "blue") {
    return mixRgb([0.03, 0.08, 0.24], [0.45, 0.7, 1], t, shade);
  }

  if (palette === "violet") {
    return mixRgb([0.12, 0.06, 0.24], [0.78, 0.62, 1], t, shade);
  }

  if (palette === "green") {
    return mixRgb([0.03, 0.16, 0.12], [0.55, 0.95, 0.65], t, shade);
  }

  if (palette === "fire") {
    if (t < 0.5) {
      return lerpRgb([0.12, 0.02, 0.01], [0.95, 0.2, 0.04], t * 2);
    }

    return lerpRgb([0.95, 0.2, 0.04], [1, 0.9, 0.25], (t - 0.5) * 2);
  }

  if (palette === "plasma") {
    if (t < 0.5) {
      return lerpRgb([0.09, 0.02, 0.18], [0.75, 0.12, 0.55], t * 2);
    }

    return lerpRgb([0.75, 0.12, 0.55], [1, 0.85, 0.22], (t - 0.5) * 2);
  }

  const baseShade = 0.32 + t * 0.78 * shade;

  return [
    clamp01(base[0] * baseShade),
    clamp01(base[1] * baseShade),
    clamp01(base[2] * baseShade),
  ];
}

function mixRgb(
  low: [number, number, number],
  high: [number, number, number],
  value: number,
  strength: number,
): [number, number, number] {
  const shaded = lerpRgb(low, high, value);
  const flat = lerpRgb(low, high, 0.72);

  return lerpRgb(flat, shaded, clamp01(strength));
}

function lerpRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    clamp01(a[0] + (b[0] - a[0]) * t),
    clamp01(a[1] + (b[1] - a[1]) * t),
    clamp01(a[2] + (b[2] - a[2]) * t),
  ];
}

function colorNameToRgb(color: string): [number, number, number] {
  if (color.startsWith("#")) {
    return hexToRgb(color);
  }

  const colors: Record<string, [number, number, number]> = {
    white: [1, 1, 1],
    slate: [0.58, 0.65, 0.74],
    gray: [0.62, 0.66, 0.72],
    cyan: [0.4, 0.91, 0.98],
    sky: [0.49, 0.78, 1],
    blue: [0.38, 0.64, 1],
    teal: [0.31, 0.84, 0.78],
    green: [0.45, 0.9, 0.55],
    emerald: [0.31, 0.87, 0.58],
    yellow: [0.99, 0.88, 0.28],
    amber: [0.98, 0.75, 0.14],
    orange: [0.98, 0.45, 0.09],
    red: [0.98, 0.44, 0.52],
    rose: [0.98, 0.45, 0.58],
    pink: [0.96, 0.45, 0.75],
    purple: [0.75, 0.52, 0.96],
    violet: [0.65, 0.55, 0.98],
  };

  return colors[color] ?? colors.cyan;
}

function hexToRgb(value: string): [number, number, number] {
  const normalized = value.replace("#", "");

  if (normalized.length === 3) {
    return [
      Number.parseInt(normalized[0] + normalized[0], 16) / 255,
      Number.parseInt(normalized[1] + normalized[1], 16) / 255,
      Number.parseInt(normalized[2] + normalized[2], 16) / 255,
    ];
  }

  if (normalized.length === 6) {
    return [
      Number.parseInt(normalized.slice(0, 2), 16) / 255,
      Number.parseInt(normalized.slice(2, 4), 16) / 255,
      Number.parseInt(normalized.slice(4, 6), 16) / 255,
    ];
  }

  return [0.4, 0.91, 0.98];
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
