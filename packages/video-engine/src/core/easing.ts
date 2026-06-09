import type { EasingId } from "./types";

export function ease(value: number, easing: EasingId = "linear"): number {
  const t = clamp01(value);

  switch (easing) {
    case "smoothstep":
      return t * t * (3 - 2 * t);

    case "ease-in":
      return t * t;

    case "ease-out":
      return 1 - (1 - t) * (1 - t);

    case "ease-in-out":
      return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

    case "ease-in-cubic":
      return t * t * t;

    case "ease-out-cubic":
      return 1 - (1 - t) ** 3;

    case "ease-in-out-cubic":
      return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

    case "linear":
      return t;
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function normalizeTime(time: number, start: number, end: number): number {
  return clamp01((time - start) / Math.max(end - start, 1e-9));
}

export function sampleEasedTime(
  time: number,
  start: number,
  end: number,
  easing: EasingId = "linear",
): number {
  return ease(normalizeTime(time, start, end), easing);
}