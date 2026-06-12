import type {
  VisualCameraSpec,
  VisualTransformSpec,
  VisualVec3,
} from "@methodslab/visual-engine/core";
import { ease } from "./easing";
import type {
  CameraKeyframe,
  CameraKeyframeTrackSpec,
  CameraTrackSpec,
  ObjectTransformKeyframe,
} from "./types";

export function sampleCameraTrack(
  track: CameraTrackSpec | undefined,
  baseCamera: VisualCameraSpec,
  time: number,
  duration?: number,
): VisualCameraSpec {
  if (!track) return baseCamera;

  if (track.kind === "orbit") {
    return sampleOrbitCameraTrack(track, baseCamera, time, duration);
  }

  return sampleCameraKeyframes(track, baseCamera, time);
}

export function sampleCameraKeyframes(
  track: CameraKeyframeTrackSpec,
  baseCamera: VisualCameraSpec,
  time: number,
): VisualCameraSpec {
  if (track.keyframes.length === 0) return baseCamera;

  const keyframes = sortByTime(track.keyframes);
  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];

  if (time <= first.time) return mergeCamera(baseCamera, first);
  if (time >= last.time) return mergeCamera(baseCamera, last);

  const [from, to] = surroundingKeyframes(keyframes, time);
  const span = Math.max(to.time - from.time, 1e-9);
  const t = ease((time - from.time) / span, to.easing ?? from.easing ?? "linear");

  const fromCamera = mergeCamera(baseCamera, from);
  const toCamera = mergeCamera(baseCamera, to);

  return {
    position: lerpVec3(fromCamera.position, toCamera.position, t),
    target: lerpVec3(fromCamera.target, toCamera.target, t),
    fov: lerp(fromCamera.fov, toCamera.fov, t),
    minDistance: lerp(fromCamera.minDistance, toCamera.minDistance, t),
    maxDistance: lerp(fromCamera.maxDistance, toCamera.maxDistance, t),
    near: lerpOptionalNumber(fromCamera.near, toCamera.near, t),
    far: lerpOptionalNumber(fromCamera.far, toCamera.far, t),
    projection: toCamera.projection ?? fromCamera.projection ?? baseCamera.projection,
    orthographicSize: lerpOptionalNumber(fromCamera.orthographicSize, toCamera.orthographicSize, t),
    metadata: {
      ...baseCamera.metadata,
      ...fromCamera.metadata,
      ...toCamera.metadata,
    },
  };
}

export function sampleOrbitCameraTrack(
  track: Extract<CameraTrackSpec, { kind: "orbit" }>,
  baseCamera: VisualCameraSpec,
  time: number,
  projectDuration?: number,
): VisualCameraSpec {
  const duration = Math.max(track.duration ?? projectDuration ?? 1, 1e-9);
  const progress = ease(time / duration, track.easing ?? "linear");

  const radius = track.radius ?? distanceVec3(baseCamera.position, track.target ?? baseCamera.target) ?? 5.6;
  const height = track.height ?? baseCamera.position[2] ?? 3.2;
  const target = track.target ?? baseCamera.target;
  const startAngle = track.startAngle ?? Math.atan2(baseCamera.position[1] - target[1], baseCamera.position[0] - target[0]);
  const turns = track.turns ?? 1;
  const angle = startAngle + progress * turns * Math.PI * 2;

  return {
    position: [
      target[0] + Math.cos(angle) * radius,
      target[1] + Math.sin(angle) * radius,
      height,
    ],
    target,
    fov: track.fov ?? baseCamera.fov,
    minDistance: track.minDistance ?? baseCamera.minDistance,
    maxDistance: track.maxDistance ?? baseCamera.maxDistance,
    near: baseCamera.near,
    far: baseCamera.far,
    projection: baseCamera.projection,
    orthographicSize: baseCamera.orthographicSize,
    metadata: {
      ...baseCamera.metadata,
      ...track.metadata,
      cameraTrackKind: "orbit",
    },
  };
}

export function sampleTransformKeyframes(
  keyframes: ObjectTransformKeyframe[],
  time: number,
): VisualTransformSpec {
  if (keyframes.length === 0) return {};

  const sorted = sortByTime(keyframes);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  if (time <= first.time) return first.transform;
  if (time >= last.time) return last.transform;

  const [from, to] = surroundingKeyframes(sorted, time);
  const span = Math.max(to.time - from.time, 1e-9);
  const t = ease((time - from.time) / span, to.easing ?? from.easing ?? "linear");

  return {
    position: lerpOptionalVec3(from.transform.position, to.transform.position, t),
    rotation: lerpOptionalVec3(from.transform.rotation, to.transform.rotation, t),
    scale: lerpOptionalVec3(from.transform.scale, to.transform.scale, t),
    pivot: to.transform.pivot ?? from.transform.pivot,
    opacity: lerpOptionalNumber(from.transform.opacity, to.transform.opacity, t),
    revealProgress: lerpOptionalNumber(from.transform.revealProgress, to.transform.revealProgress, t),
    mode: to.transform.mode ?? from.transform.mode,
  };
}

export function mergeCamera(baseCamera: VisualCameraSpec, keyframe: CameraKeyframe): VisualCameraSpec {
  return {
    position: keyframe.position ?? baseCamera.position,
    target: keyframe.target ?? baseCamera.target,
    fov: keyframe.fov ?? baseCamera.fov,
    minDistance: keyframe.minDistance ?? baseCamera.minDistance,
    maxDistance: keyframe.maxDistance ?? baseCamera.maxDistance,
    near: keyframe.near ?? baseCamera.near,
    far: keyframe.far ?? baseCamera.far,
    metadata: {
      ...baseCamera.metadata,
      ...keyframe.metadata,
    },
  };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec3(a: VisualVec3, b: VisualVec3, t: number): VisualVec3 {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
  ];
}

export function lerpOptionalVec3(
  a: VisualVec3 | undefined,
  b: VisualVec3 | undefined,
  t: number,
): VisualVec3 | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;
  return lerpVec3(a, b, t);
}

export function lerpOptionalNumber(
  a: number | undefined,
  b: number | undefined,
  t: number,
): number | undefined {
  if (a === undefined && b === undefined) return undefined;
  if (a === undefined) return b;
  if (b === undefined) return a;
  return lerp(a, b, t);
}

export function addOptionalVec3(
  a: VisualVec3 | undefined,
  b: VisualVec3 | undefined,
): VisualVec3 | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;

  return [
    a[0] + b[0],
    a[1] + b[1],
    a[2] + b[2],
  ];
}

export function multiplyOptionalVec3(
  a: VisualVec3 | undefined,
  b: VisualVec3 | undefined,
): VisualVec3 | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;

  return [
    a[0] * b[0],
    a[1] * b[1],
    a[2] * b[2],
  ];
}

export function composeTransform(
  base: VisualTransformSpec | undefined,
  next: VisualTransformSpec,
): VisualTransformSpec {
  const mode = next.mode ?? "relative";

  if (mode === "absolute") {
    return {
      position: next.position ?? base?.position,
      rotation: next.rotation ?? base?.rotation,
      scale: next.scale ?? base?.scale,
      pivot: next.pivot ?? base?.pivot,
      opacity: next.opacity ?? base?.opacity,
      revealProgress: next.revealProgress ?? base?.revealProgress,
      mode,
    };
  }

  return {
    position: addOptionalVec3(base?.position, next.position),
    rotation: addOptionalVec3(base?.rotation, next.rotation),
    scale: multiplyOptionalVec3(base?.scale, next.scale) ?? next.scale ?? base?.scale,
    pivot: next.pivot ?? base?.pivot,
    opacity: next.opacity ?? base?.opacity,
    revealProgress: next.revealProgress ?? base?.revealProgress,
    mode,
  };
}

function sortByTime<T extends { time: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.time - b.time);
}

function surroundingKeyframes<T extends { time: number }>(keyframes: T[], time: number): [T, T] {
  const nextIndex = keyframes.findIndex((keyframe) => keyframe.time >= time);
  const from = keyframes[Math.max(0, nextIndex - 1)];
  const to = keyframes[nextIndex];

  return [from, to];
}

function distanceVec3(a: VisualVec3, b: VisualVec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
