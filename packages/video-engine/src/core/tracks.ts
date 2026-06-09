import type { CameraTrackSpec, OrbitCameraTrackOptions } from "./types";

export function createOrbitCameraTrack(options: OrbitCameraTrackOptions): CameraTrackSpec {
  return {
    kind: "orbit",
    duration: options.duration,
    radius: options.radius ?? 5.6,
    height: options.height ?? 3.2,
    target: options.target ?? [0, 0, 0],
    startAngle: options.startAngle ?? -Math.PI * 0.72,
    turns: options.turns ?? 1,
    fov: options.fov ?? 46,
    minDistance: options.distanceLimits?.minDistance ?? 1.8,
    maxDistance: options.distanceLimits?.maxDistance ?? 12,
    easing: options.easing ?? "smoothstep",
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