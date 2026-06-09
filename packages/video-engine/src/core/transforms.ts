import type { VisualLayerSpec, VisualTransformSpec, VisualVec3 } from "@methodslab/visual-engine/core";
import { ease } from "./easing";
import { lerpVec3 } from "./interpolate";
import type { ObjectKeyframeTrackSpec, ObjectRotationAxis, ObjectTrackSpec } from "./types";

export function applyObjectTracks(
  layers: VisualLayerSpec[],
  tracks: ObjectTrackSpec[] | undefined,
  time: number,
  duration: number,
): VisualLayerSpec[] {
  if (!tracks || tracks.length === 0) return layers;
  const transformByObject = new Map<string, VisualTransformSpec>();
  tracks.forEach((track) => {
    const sampled = track.kind === "spin" ? sampleSpinTrack(track, time, duration) : sampleKeyframeTrack(track, time);
    transformByObject.set(track.objectId, mergeTransform(transformByObject.get(track.objectId), sampled));
  });

  return layers.map((layer) => {
    if (!layer.objectId) return layer;
    const transform = transformByObject.get(layer.objectId);
    if (!transform) return layer;
    return {
      ...layer,
      transform: mergeTransform(layer.transform, transform),
    } as VisualLayerSpec;
  });
}

function sampleSpinTrack(track: Extract<ObjectTrackSpec, { kind: "spin" }>, time: number, duration: number): VisualTransformSpec {
  const progress = ease(time / Math.max(duration, 1e-9), track.easing ?? "linear");
  const angle = (track.startAngle ?? 0) + progress * track.turns * Math.PI * 2;
  return {
    pivot: track.pivot ?? [0, 0, 0],
    rotation: axisRotation(track.axis, angle),
  };
}

function sampleKeyframeTrack(track: ObjectKeyframeTrackSpec, time: number): VisualTransformSpec {
  const keyframes = [...track.keyframes].sort((a, b) => a.time - b.time);
  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];
  if (!first) return {};
  if (time <= first.time) return first.transform;
  if (time >= last.time) return last.transform;

  const nextIndex = keyframes.findIndex((keyframe) => keyframe.time >= time);
  const from = keyframes[Math.max(0, nextIndex - 1)];
  const to = keyframes[nextIndex];
  const t = ease((time - from.time) / Math.max(to.time - from.time, 1e-9), to.easing ?? from.easing ?? "linear");
  return {
    position: lerpOptionalVec3(from.transform.position, to.transform.position, t),
    rotation: lerpOptionalVec3(from.transform.rotation, to.transform.rotation, t),
    scale: lerpOptionalVec3(from.transform.scale, to.transform.scale, t),
    pivot: to.transform.pivot ?? from.transform.pivot,
    opacity: lerpOptionalNumber(from.transform.opacity, to.transform.opacity, t),
  };
}

function axisRotation(axis: ObjectRotationAxis, angle: number): VisualVec3 {
  if (axis === "x") return [angle, 0, 0];
  if (axis === "z") return [0, 0, angle];
  return [0, angle, 0];
}

function lerpOptionalVec3(a: VisualVec3 | undefined, b: VisualVec3 | undefined, t: number) {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;
  return lerpVec3(a, b, t);
}

function mergeTransform(base: VisualTransformSpec | undefined, next: VisualTransformSpec): VisualTransformSpec {
  return {
    position: addOptionalVec3(base?.position, next.position),
    rotation: addOptionalVec3(base?.rotation, next.rotation),
    scale: next.scale ?? base?.scale,
    pivot: next.pivot ?? base?.pivot,
    opacity: next.opacity ?? base?.opacity,
  };
}

function addOptionalVec3(a: VisualVec3 | undefined, b: VisualVec3 | undefined) {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]] as VisualVec3;
}

function lerpOptionalNumber(a: number | undefined, b: number | undefined, t: number) {
  if (a === undefined && b === undefined) return undefined;
  if (a === undefined) return b;
  if (b === undefined) return a;
  return a + (b - a) * t;
}
