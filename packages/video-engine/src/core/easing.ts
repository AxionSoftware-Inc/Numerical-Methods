import type { EasingId } from "./types";

export function ease(value: number, easing: EasingId = "linear") {
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
    case "linear":
      return t;
  }
}

export function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}
