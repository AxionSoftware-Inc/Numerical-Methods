import type { VisualColor, VisualRgb, VisualRgba } from "./types";

export function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function normalize(value: number, range: [number, number]): number {
  const [min, max] = range;
  return clamp01((value - min) / Math.max(max - min, 1e-12));
}

export function scalarColor(value: number, range: [number, number]): VisualRgb {
  const t = normalize(value, range);

  /**
   * Scientific blue → cyan → yellow/pink-ish ramp.
   * Good default for numerical surfaces and integral columns.
   */
  return hslToRgb(0.53 - t * 0.4, 0.86, 0.5 + t * 0.18);
}

export function divergingScalarColor(value: number, range: [number, number]): VisualRgb {
  const t = normalize(value, range);

  if (t < 0.5) {
    const k = t / 0.5;
    return mixRgb([0.22, 0.58, 0.95], [0.93, 0.97, 1], k);
  }

  const k = (t - 0.5) / 0.5;
  return mixRgb([0.93, 0.97, 1], [0.98, 0.32, 0.43], k);
}

export function shade(color: VisualRgb, amount: number): VisualRgb {
  return [
    clamp01(color[0] * amount),
    clamp01(color[1] * amount),
    clamp01(color[2] * amount),
  ];
}

export function tint(color: VisualRgb, amount: number): VisualRgb {
  return mixRgb(color, [1, 1, 1], clamp01(amount));
}

export function alpha(color: VisualRgb, opacity: number): VisualRgba {
  return [color[0], color[1], color[2], clamp01(opacity)];
}

export function mixRgb(a: VisualRgb, b: VisualRgb, t: number): VisualRgb {
  const k = clamp01(t);
  return [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k,
  ];
}

export function pushColor(colors: number[], color: VisualRgb | VisualRgba, count: number): void {
  for (let index = 0; index < count; index += 1) {
    colors.push(color[0], color[1], color[2]);
  }
}

export function colorToCss(color: VisualColor): string {
  if (typeof color === "string") return color;

  const [r, g, b] = color;
  const red = Math.round(clamp01(r) * 255);
  const green = Math.round(clamp01(g) * 255);
  const blue = Math.round(clamp01(b) * 255);

  if (color.length === 4) {
    return `rgba(${red}, ${green}, ${blue}, ${clamp01(color[3])})`;
  }

  return `rgb(${red}, ${green}, ${blue})`;
}

export function colorToHex(color: VisualColor): string {
  if (typeof color === "string") {
    if (color.startsWith("#")) return color;
    return color;
  }

  const [r, g, b] = color;
  return `#${toHexChannel(r)}${toHexChannel(g)}${toHexChannel(b)}`;
}

export function hexToRgb(hex: string): VisualRgb {
  const normalized = hex.trim().replace("#", "");

  if (normalized.length === 3) {
    const r = normalized[0] ?? "0";
    const g = normalized[1] ?? "0";
    const b = normalized[2] ?? "0";
    return [
      parseInt(`${r}${r}`, 16) / 255,
      parseInt(`${g}${g}`, 16) / 255,
      parseInt(`${b}${b}`, 16) / 255,
    ];
  }

  if (normalized.length >= 6) {
    return [
      parseInt(normalized.slice(0, 2), 16) / 255,
      parseInt(normalized.slice(2, 4), 16) / 255,
      parseInt(normalized.slice(4, 6), 16) / 255,
    ];
  }

  return [1, 1, 1];
}

export function rgbToHex(color: VisualRgb): string {
  return `#${toHexChannel(color[0])}${toHexChannel(color[1])}${toHexChannel(color[2])}`;
}

export function hslToRgb(h: number, s: number, l: number): VisualRgb {
  const hue = ((h % 1) + 1) % 1;
  const saturation = clamp01(s);
  const lightness = clamp01(l);

  if (saturation === 0) {
    return [lightness, lightness, lightness];
  }

  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;

  return [
    hueToRgb(p, q, hue + 1 / 3),
    hueToRgb(p, q, hue),
    hueToRgb(p, q, hue - 1 / 3),
  ];
}

function hueToRgb(p: number, q: number, t: number): number {
  let value = t;

  if (value < 0) value += 1;
  if (value > 1) value -= 1;

  if (value < 1 / 6) return p + (q - p) * 6 * value;
  if (value < 1 / 2) return q;
  if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;

  return p;
}

function toHexChannel(value: number): string {
  return Math.round(clamp01(value) * 255)
    .toString(16)
    .padStart(2, "0");
}