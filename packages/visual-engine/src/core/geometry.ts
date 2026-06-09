import type { VisualRgb, VisualVec3 } from "./types";
import { pushColor } from "./color";

export function addQuad(
  positions: number[],
  colors: number[],
  indices: number[],
  a: VisualVec3,
  b: VisualVec3,
  c: VisualVec3,
  d: VisualVec3,
  color: VisualRgb,
) {
  const base = positions.length / 3;
  positions.push(...a, ...b, ...c, ...d);
  pushColor(colors, color, 4);
  indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

export function boxSegments(position: VisualVec3, size: VisualVec3) {
  const x0 = position[0] - size[0] / 2;
  const x1 = position[0] + size[0] / 2;
  const y0 = position[1] - size[1] / 2;
  const y1 = position[1] + size[1] / 2;
  const z0 = position[2] - size[2] / 2;
  const z1 = position[2] + size[2] / 2;
  const points: VisualVec3[] = [
    [x0, y0, z0],
    [x1, y0, z0],
    [x1, y0, z1],
    [x0, y0, z1],
    [x0, y1, z0],
    [x1, y1, z0],
    [x1, y1, z1],
    [x0, y1, z1],
  ];
  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];
  return edges.map(([from, to]) => ({ from: points[from], to: points[to] }));
}

export function addVec3(a: VisualVec3, b: VisualVec3): VisualVec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
