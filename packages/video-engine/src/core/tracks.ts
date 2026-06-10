import type { CameraTrackSpec, OrbitCameraTrackOptions } from "./types";

export function createOrbitCameraTrack(options: {
  duration: number;
  radius?: number;
  height?: number;
  target?: [number, number, number];
  turns?: number;
  easing?: string;
  distanceLimits?: {
    minDistance?: number;
    maxDistance?: number;
  };
}) {
  const duration = Math.max(0.001, options.duration);
  const radius = options.radius ?? 5.4;
  const height = Math.max(1.6, options.height ?? 3.0);
  const target = options.target ?? [0, -0.1, 0];
  const turns = options.turns ?? 0.55;
  const easing = options.easing ?? "ease-in-out-cubic";

  const samples = 90;

  return {
    kind: "keyframes" as const,
    keyframes: Array.from({ length: samples + 1 }, (_, index) => {
      const progress = index / samples;
      const angle = progress * Math.PI * 2 * turns + Math.PI * 0.18;

      return {
        time: progress * duration,
        position: [
          target[0] + Math.cos(angle) * radius,
          target[1] + height,
          target[2] + Math.sin(angle) * radius,
        ] as [number, number, number],
        target,
        fov: 42,
        minDistance: options.distanceLimits?.minDistance ?? 1.8,
        maxDistance: options.distanceLimits?.maxDistance ?? 14,
        easing,
      };
    }),
  };
}

export function createOrbitCameraKeyframes(options: OrbitCameraTrackOptions): Extract<CameraTrackSpec, { kind?: "keyframes" }> {
  const samples = Math.max(2, Math.floor(options.samples ?? 9));
  const radius = options.radius ?? 5.6;
  const height = options.height ?? 3.2;
  const target = options.target ?? [0, 0, 0];
  const startAngle = options.startAngle ?? -Math.PI * 0.72;
  const turns = options.turns ?? 1;
  const fov = options.fov ?? 46;
  const minDistance = options.distanceLimits?.minDistance ?? 1.8;
  const maxDistance = options.distanceLimits?.maxDistance ?? 12;

  return {
    kind: "keyframes",
    keyframes: Array.from({ length: samples }, (_, index) => {
      const progress = index / (samples - 1);
      const angle = startAngle + progress * turns * Math.PI * 2;

      return {
        time: progress * options.duration,
        position: [Math.cos(angle) * radius, Math.sin(angle) * radius, height],
        target,
        fov,
        minDistance,
        maxDistance,
        easing: options.easing ?? "smoothstep",
      };
    }),
  };
}