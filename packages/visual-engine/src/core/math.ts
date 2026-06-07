import type { Point } from "./types";

export function add(a: Point, b: Point): Point {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function addScaled(a: Point, b: Point, scale: number): Point {
  return [a[0] + b[0] * scale, a[1] + b[1] * scale, a[2] + b[2] * scale];
}

export function scale(a: Point, value: number): Point {
  return [a[0] * value, a[1] * value, a[2] * value];
}

export function distance(a: Point, b: Point) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function amplifyError(exact: Point, numeric: Point, gain: number): Point {
  return [
    exact[0] + (numeric[0] - exact[0]) * gain,
    exact[1] + (numeric[1] - exact[1]) * gain,
    exact[2] + (numeric[2] - exact[2]) * gain,
  ];
}

export function format(value: number) {
  return value.toFixed(value >= 1 ? 2 : 3);
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
