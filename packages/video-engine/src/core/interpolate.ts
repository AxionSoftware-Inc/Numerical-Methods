import type { VisualCameraSpec, VisualVec3 } from "@methodslab/visual-engine/core";
import { ease } from "./easing";
import type { CameraKeyframe, CameraTrackSpec } from "./types";

export function sampleCameraTrack(track: CameraTrackSpec | undefined, baseCamera: VisualCameraSpec, time: number): VisualCameraSpec {
  if (!track || track.keyframes.length === 0) return baseCamera;
  const keyframes = [...track.keyframes].sort((a, b) => a.time - b.time);
  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];
  if (time <= first.time) return mergeCamera(baseCamera, first);
  if (time >= last.time) return mergeCamera(baseCamera, last);

  const nextIndex = keyframes.findIndex((keyframe) => keyframe.time >= time);
  const from = keyframes[Math.max(0, nextIndex - 1)];
  const to = keyframes[nextIndex];
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
  };
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function lerpVec3(a: VisualVec3, b: VisualVec3, t: number): VisualVec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function mergeCamera(baseCamera: VisualCameraSpec, keyframe: CameraKeyframe): VisualCameraSpec {
  return {
    position: keyframe.position ?? baseCamera.position,
    target: keyframe.target ?? baseCamera.target,
    fov: keyframe.fov ?? baseCamera.fov,
    minDistance: keyframe.minDistance ?? baseCamera.minDistance,
    maxDistance: keyframe.maxDistance ?? baseCamera.maxDistance,
  };
}
