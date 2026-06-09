import type {
  VisualLayerSpec,
  VisualTransformSpec,
  VisualVec3,
} from "@methodslab/visual-engine/core";
import { ease, normalizeTime } from "./easing";
import {
  composeTransform,
  sampleTransformKeyframes,
} from "./interpolate";
import type {
  ObjectRotationAxis,
  ObjectTrackSpec,
} from "./types";

export function applyObjectTracks(
  layers: VisualLayerSpec[],
  tracks: ObjectTrackSpec[] | undefined,
  time: number,
  duration: number,
): VisualLayerSpec[] {
  if (!tracks || tracks.length === 0) return layers;

  const transformByObject = new Map<string, VisualTransformSpec>();

  tracks.forEach((track) => {
    const sampled = sampleObjectTrack(track, time, duration);
    if (!sampled) return;

    const nextTransform: VisualTransformSpec = {
      ...sampled,
      mode: sampled.mode ?? track.mode ?? "relative",
    };

    transformByObject.set(
      track.objectId,
      composeTransform(transformByObject.get(track.objectId), nextTransform),
    );
  });

  return layers.map((layer) => applyTransformToLayer(layer, transformByObject));
}

export function sampleObjectTrack(
  track: ObjectTrackSpec,
  time: number,
  duration: number,
): VisualTransformSpec | null {
  switch (track.kind) {
    case "spin":
      return sampleSpinTrack(track, time, duration);

    case "keyframes":
      return {
        ...sampleTransformKeyframes(track.keyframes, time),
        mode: track.mode,
      };

    case "fade":
      return sampleFadeTrack(track, time);
  }
}

function sampleSpinTrack(
  track: Extract<ObjectTrackSpec, { kind: "spin" }>,
  time: number,
  duration: number,
): VisualTransformSpec | null {
  const start = track.startTime ?? 0;
  const end = track.endTime ?? duration;

  if (time < start || time > end) {
    return null;
  }

  const progress = ease(normalizeTime(time, start, end), track.easing ?? "linear");
  const angle = (track.startAngle ?? 0) + progress * track.turns * Math.PI * 2;

  return {
    pivot: track.pivot ?? [0, 0, 0],
    rotation: axisRotation(track.axis, angle),
    mode: track.mode ?? "relative",
  };
}

function sampleFadeTrack(
  track: Extract<ObjectTrackSpec, { kind: "fade" }>,
  time: number,
): VisualTransformSpec | null {
  if (time < track.startTime) {
    return {
      opacity: track.from,
      mode: track.mode ?? "absolute",
    };
  }

  if (time > track.endTime) {
    return {
      opacity: track.to,
      mode: track.mode ?? "absolute",
    };
  }

  const progress = ease(normalizeTime(time, track.startTime, track.endTime), track.easing ?? "linear");

  return {
    opacity: track.from + (track.to - track.from) * progress,
    mode: track.mode ?? "absolute",
  };
}

function applyTransformToLayer(
  layer: VisualLayerSpec,
  transformByObject: Map<string, VisualTransformSpec>,
): VisualLayerSpec {
  const layerTransform = layer.objectId ? transformByObject.get(layer.objectId) : undefined;

  const nextLayer =
    layerTransform
      ? {
          ...layer,
          transform: composeTransform(layer.transform, layerTransform),
        }
      : layer;

  if (nextLayer.kind !== "group") {
    return nextLayer;
  }

  return {
    ...nextLayer,
    layers: nextLayer.layers.map((child) => applyTransformToLayer(child, transformByObject)),
  };
}

function axisRotation(axis: ObjectRotationAxis, angle: number): VisualVec3 {
  if (axis === "x") return [angle, 0, 0];
  if (axis === "z") return [0, 0, angle];
  return [0, angle, 0];
}