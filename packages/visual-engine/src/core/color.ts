import type { VisualRgb } from "./types";

export function scalarColor(value: number, range: [number, number]): VisualRgb {
  const t = normalize(value, range);
  return hslToRgb(0.53 - t * 0.4, 0.86, 0.5 + t * 0.18);
}

export function shade(color: VisualRgb, amount: number): VisualRgb {
  return color.map((channel) => Math.max(0, Math.min(1, channel * amount))) as VisualRgb;
}

export function pushColor(colors: number[], color: VisualRgb, count: number) {
  for (let index = 0; index < count; index += 1) {
    colors.push(color[0], color[1], color[2]);
  }
}

export function normalize(value: number, range: [number, number]) {
  return Math.max(0, Math.min(1, (value - range[0]) / Math.max(range[1] - range[0], 1e-12)));
}

function hslToRgb(h: number, s: number, l: number): VisualRgb {
  const hue = ((h % 1) + 1) % 1;
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hueToRgb(p, q, hue + 1 / 3), hueToRgb(p, q, hue), hueToRgb(p, q, hue - 1 / 3)];
}

function hueToRgb(p: number, q: number, t: number) {
  let value = t;
  if (value < 0) value += 1;
  if (value > 1) value -= 1;
  if (value < 1 / 6) return p + (q - p) * 6 * value;
  if (value < 1 / 2) return q;
  if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
  return p;
}
