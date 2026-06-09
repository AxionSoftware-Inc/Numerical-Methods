import type { VisualLineSegment, VisualRgb, VisualVec2, VisualVec3 } from "./types";
import { pushColor } from "./color";

export type VisualMeshBuffers = {
  positions: number[];
  indices: number[];
  colors: number[];
};

export function createMeshBuffers(): VisualMeshBuffers {
  return {
    positions: [],
    indices: [],
    colors: [],
  };
}

export function addQuad(
  positions: number[],
  colors: number[],
  indices: number[],
  a: VisualVec3,
  b: VisualVec3,
  c: VisualVec3,
  d: VisualVec3,
  color: VisualRgb,
): void {
  const base = positions.length / 3;

  positions.push(...a, ...b, ...c, ...d);
  pushColor(colors, color, 4);

  indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

export function addTriangle(
  positions: number[],
  colors: number[],
  indices: number[],
  a: VisualVec3,
  b: VisualVec3,
  c: VisualVec3,
  color: VisualRgb,
): void {
  const base = positions.length / 3;

  positions.push(...a, ...b, ...c);
  pushColor(colors, color, 3);

  indices.push(base, base + 1, base + 2);
}

export function addBox(
  positions: number[],
  colors: number[],
  indices: number[],
  center: VisualVec3,
  size: VisualVec3,
  color: VisualRgb,
): void {
  const [x, y, z] = center;
  const [w, h, d] = size;

  const x0 = x - w / 2;
  const x1 = x + w / 2;
  const y0 = y - h / 2;
  const y1 = y + h / 2;
  const z0 = z - d / 2;
  const z1 = z + d / 2;

  // Top
  addQuad(positions, colors, indices, [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], color);

  // Bottom
  addQuad(positions, colors, indices, [x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], color);

  // Front
  addQuad(positions, colors, indices, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], color);

  // Back
  addQuad(positions, colors, indices, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], color);

  // Left
  addQuad(positions, colors, indices, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], color);

  // Right
  addQuad(positions, colors, indices, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], color);
}

export function createPlaneMesh(
  center: VisualVec3,
  size: VisualVec2,
  color: VisualRgb,
  plane: "xy" | "xz" | "yz" = "xz",
): VisualMeshBuffers {
  const buffers = createMeshBuffers();
  const [width, height] = size;
  const [x, y, z] = center;

  if (plane === "xy") {
    addQuad(
      buffers.positions,
      buffers.colors,
      buffers.indices,
      [x - width / 2, y - height / 2, z],
      [x + width / 2, y - height / 2, z],
      [x + width / 2, y + height / 2, z],
      [x - width / 2, y + height / 2, z],
      color,
    );
  }

  if (plane === "xz") {
    addQuad(
      buffers.positions,
      buffers.colors,
      buffers.indices,
      [x - width / 2, y, z - height / 2],
      [x + width / 2, y, z - height / 2],
      [x + width / 2, y, z + height / 2],
      [x - width / 2, y, z + height / 2],
      color,
    );
  }

  if (plane === "yz") {
    addQuad(
      buffers.positions,
      buffers.colors,
      buffers.indices,
      [x, y - width / 2, z - height / 2],
      [x, y + width / 2, z - height / 2],
      [x, y + width / 2, z + height / 2],
      [x, y - width / 2, z + height / 2],
      color,
    );
  }

  return buffers;
}

export function boxSegments(position: VisualVec3, size: VisualVec3): VisualLineSegment[] {
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

  const edges: Array<[number, number]> = [
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

  return edges.map(([from, to]) => ({
    from: points[from],
    to: points[to],
  }));
}

export function polylineSegments(points: VisualVec3[], closed = false): VisualLineSegment[] {
  if (points.length < 2) return [];

  const segments: VisualLineSegment[] = points.slice(1).map((point, index) => ({
    from: points[index],
    to: point,
  }));

  if (closed && points.length > 2) {
    segments.push({
      from: points[points.length - 1],
      to: points[0],
    });
  }

  return segments;
}

export function addVec3(a: VisualVec3, b: VisualVec3): VisualVec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function subVec3(a: VisualVec3, b: VisualVec3): VisualVec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scaleVec3(value: VisualVec3, scale: number): VisualVec3 {
  return [value[0] * scale, value[1] * scale, value[2] * scale];
}

export function mulVec3(a: VisualVec3, b: VisualVec3): VisualVec3 {
  return [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
}

export function divVec3(a: VisualVec3, b: VisualVec3): VisualVec3 {
  return [
    a[0] / safeDivisor(b[0]),
    a[1] / safeDivisor(b[1]),
    a[2] / safeDivisor(b[2]),
  ];
}

export function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec3(a: VisualVec3, b: VisualVec3, t: number): VisualVec3 {
  return [
    lerpNumber(a[0], b[0], t),
    lerpNumber(a[1], b[1], t),
    lerpNumber(a[2], b[2], t),
  ];
}

export function dotVec3(a: VisualVec3, b: VisualVec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function crossVec3(a: VisualVec3, b: VisualVec3): VisualVec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function lengthVec3(value: VisualVec3): number {
  return Math.hypot(value[0], value[1], value[2]);
}

export function distanceVec3(a: VisualVec3, b: VisualVec3): number {
  return lengthVec3(subVec3(a, b));
}

export function normalizeVec3(value: VisualVec3): VisualVec3 {
  const length = lengthVec3(value);

  if (length < 1e-12) {
    return [0, 0, 0];
  }

  return [value[0] / length, value[1] / length, value[2] / length];
}

export function midpointVec3(a: VisualVec3, b: VisualVec3): VisualVec3 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

export function minVec3(a: VisualVec3, b: VisualVec3): VisualVec3 {
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])];
}

export function maxVec3(a: VisualVec3, b: VisualVec3): VisualVec3 {
  return [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])];
}

export function boundsFromPoints(points: VisualVec3[]): { min: VisualVec3; max: VisualVec3 } {
  if (points.length === 0) {
    return {
      min: [0, 0, 0],
      max: [0, 0, 0],
    };
  }

  return points.reduce(
    (bounds, point) => ({
      min: minVec3(bounds.min, point),
      max: maxVec3(bounds.max, point),
    }),
    {
      min: points[0],
      max: points[0],
    },
  );
}

function safeDivisor(value: number): number {
  return Math.abs(value) < 1e-12 ? 1e-12 : value;
}