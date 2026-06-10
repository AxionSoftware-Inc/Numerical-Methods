import type {
  EasingId,
  ObjectTrackSpec,
  TimelineSpec,
  VideoProjectSpec,
} from "@methodslab/video-engine/core";
import { createOrbitCameraTrack } from "@methodslab/video-engine/core";
import type {
  VisualLayerSpec,
  VisualSceneSpec,
} from "@methodslab/visual-engine/core";
import {
  createCoordinateAxesLayers,
  createGridLayer,
} from "@methodslab/visual-engine/core";
import type {
  SceneAnimation,
  SceneAnimationTarget,
  SceneArrowObject,
  SceneAxesObject,
  SceneBoxObject,
  SceneDslSpec,
  SceneGridObject,
  SceneLabelObject,
  SceneMarkerObject,
  SceneObject,
  ScenePathObject,
  ScenePlaneObject,
  SceneTexObject,
  SceneTextObject,
} from "./types";

export type SceneCompilerOptions = {
  background?: string;
};

const EASING_IDS = new Set<EasingId>([
  "linear",
  "smoothstep",
  "ease-in",
  "ease-out",
  "ease-in-out",
  "ease-in-cubic",
  "ease-out-cubic",
  "ease-in-out-cubic",
]);

export function compileSceneToVisualScene(
  spec: SceneDslSpec,
  options: SceneCompilerOptions = {},
): VisualSceneSpec {
  return {
    id: `${spec.id}:visual`,
    style: {
      background: options.background ?? getBackground(spec) ?? "#050b0f",
      fogNear: 9,
      fogFar: 30,
      exposure: 1.25,
      ambientLight: 1.12,
    },
    camera: {
      position: spec.camera?.position ?? [3.8, 3.2, 4.8],
      target: spec.camera?.target ?? [0, -0.1, 0],
      fov: spec.camera?.fov ?? 42,
      minDistance: spec.camera?.minDistance ?? 1.8,
      maxDistance: spec.camera?.maxDistance ?? 14,
    },
    layers: spec.objects.flatMap((object) => compileObjectToLayers(object)),
    metadata: {
      kind: "scene-dsl",
      sceneId: spec.id,
      sceneName: spec.name,
      ...spec.metadata,
    },
  };
}

export function compileSceneToVideoProject(
  spec: SceneDslSpec,
  options: SceneCompilerOptions = {},
): VideoProjectSpec {
  const baseScene = compileSceneToVisualScene(spec, options);
  const duration = Math.max(spec.duration ?? inferDuration(spec), 0.001);

  const timeline: TimelineSpec = {
    duration,
    fps: spec.fps,
    camera: compileCameraAnimation(spec, duration),
    objects: compileCommandsToObjectTracks(spec),
    clips: spec.commands.map((command) => ({
      id: command.id,
      start: command.start,
      duration: command.duration,
      name: command.animations.map((animation) => animation.kind).join(" + "),
    })),
    metadata: {
      source: "scene-dsl",
    },
  };

  return {
    id: `${spec.id}:video`,
    name: spec.name,
    baseScene,
    timeline,
    metadata: {
      kind: "scene-dsl-video-project",
      sceneId: spec.id,
    },
  };
}

export function compileObjectToLayers(object: SceneObject): VisualLayerSpec[] {
  switch (object.kind) {
    case "group":
      return [
        {
          kind: "group",
          id: object.id,
          objectId: object.objectId ?? object.id,
          name: object.name,
          visible: object.visible,
          opacity: object.opacity,
          transform: object.transform,
          layers: object.children.flatMap((child) => compileObjectToLayers(child)),
          metadata: object.metadata,
        },
      ];

    case "text":
      return [compileTextObject(object)];

    case "tex":
      return [compileTexObject(object)];

    case "label":
      return [compileLabelObject(object)];

    case "axes":
      return compileAxesObject(object);

    case "grid":
      return [compileGridObject(object)];

    case "box":
      return [compileBoxObject(object)];

    case "marker":
      return [compileMarkerObject(object)];

    case "arrow":
      return [compileArrowObject(object)];

    case "path":
      return [compilePathObject(object)];

    case "plane":
      return [compilePlaneObject(object)];

    case "surface":
      return object.scene.layers.map((layer) => ({
        ...layer,
        objectId: layer.objectId ?? object.objectId ?? object.id,
      }));

    case "custom":
      return object.scene.layers.map((layer) => ({
        ...layer,
        objectId: layer.objectId ?? object.objectId ?? object.id,
      }));
  }
}

function compileTextObject(object: SceneTextObject): VisualLayerSpec {
  return {
    kind: "label",
    id: object.id,
    objectId: object.objectId ?? object.id,
    name: object.name,
    text: object.text,
    position: object.position ?? [0, 0, 0],
    color: object.color ?? "#f8fafc",
    scale: object.scale ?? 0.14,
    format: "text",
    visible: object.visible,
    opacity: object.opacity,
    transform: object.transform,
    metadata: object.metadata,
  };
}

function compileTexObject(object: SceneTexObject): VisualLayerSpec {
  return {
    kind: "label",
    id: object.id,
    objectId: object.objectId ?? object.id,
    name: object.name,
    text: object.source,
    position: object.position ?? [0, 0, 0],
    color: object.color ?? "#67e8f9",
    scale: object.scale ?? 0.14,
    format: "latex",
    visible: object.visible,
    opacity: object.opacity,
    transform: object.transform,
    metadata: object.metadata,
  };
}

function compileLabelObject(object: SceneLabelObject): VisualLayerSpec {
  return {
    kind: "label",
    id: object.id,
    objectId: object.objectId ?? object.id,
    name: object.name,
    text: object.text,
    position: object.position,
    color: object.color ?? "#f8fafc",
    scale: object.scale ?? 0.14,
    format: object.format ?? "text",
    metadata: object.metadata,
  };
}

function compileAxesObject(object: SceneAxesObject): VisualLayerSpec[] {
  return createCoordinateAxesLayers({
    idPrefix: object.id,
    objectId: object.objectId ?? object.id,
    origin: object.origin ?? [-1.55, -0.82, -1.35],
    size: object.size ?? 1.55,
    xLabel: object.xLabel ?? "x",
    yLabel: object.yLabel ?? "y",
    zLabel: object.zLabel ?? "z",
    color: typeof object.color === "string" ? object.color : undefined,
  });
}

function compileGridObject(object: SceneGridObject): VisualLayerSpec {
  return createGridLayer(object.id, {
    objectId: object.objectId ?? object.id,
    size: object.size ?? 3.2,
    divisions: object.divisions ?? 18,
    y: object.y ?? -0.86,
    color: typeof object.color === "string" ? object.color : "#164653",
    opacity: object.opacity ?? 0.34,
  });
}

function compileBoxObject(object: SceneBoxObject): VisualLayerSpec {
  return {
    kind: "box-outline",
    id: object.id,
    objectId: object.objectId ?? object.id,
    name: object.name,
    position: object.position,
    size: object.size,
    color: object.color ?? "#38bdf8",
    opacity: object.opacity,
    visible: object.visible,
    transform: object.transform,
    metadata: object.metadata,
  };
}

function compileMarkerObject(object: SceneMarkerObject): VisualLayerSpec {
  return {
    kind: "marker",
    id: object.id,
    objectId: object.objectId ?? object.id,
    name: object.name,
    position: object.position,
    radius: object.radius ?? 0.055,
    color: object.color ?? "#facc15",
    label: object.label,
    visible: object.visible,
    opacity: object.opacity,
    transform: object.transform,
    metadata: object.metadata,
  };
}

function compileArrowObject(object: SceneArrowObject): VisualLayerSpec {
  return {
    kind: "arrow",
    id: object.id,
    objectId: object.objectId ?? object.id,
    name: object.name,
    from: object.from,
    to: object.to,
    color: object.color ?? "#fb7185",
    opacity: object.opacity,
    headSize: object.headSize,
    visible: object.visible,
    transform: object.transform,
    metadata: object.metadata,
  };
}

function compilePathObject(object: ScenePathObject): VisualLayerSpec {
  return {
    kind: "path",
    id: object.id,
    objectId: object.objectId ?? object.id,
    name: object.name,
    points: object.points,
    color: object.color ?? "#67e8f9",
    opacity: object.opacity,
    closed: object.closed,
    visible: object.visible,
    transform: object.transform,
    metadata: object.metadata,
  };
}

function compilePlaneObject(object: ScenePlaneObject): VisualLayerSpec {
  return {
    kind: "plane",
    id: object.id,
    objectId: object.objectId ?? object.id,
    name: object.name,
    position: object.position,
    size: object.size,
    color: object.color ?? "#38bdf8",
    opacity: object.opacity,
    rotation: object.rotation,
    visible: object.visible,
    transform: object.transform,
    metadata: object.metadata,
  };
}

function compileCameraAnimation(spec: SceneDslSpec, duration: number): TimelineSpec["camera"] {
  const animation = spec.cameraAnimation;

  if (!animation) {
    return undefined;
  }

  if (animation.kind === "orbit") {
    const track = createOrbitCameraTrack({
      duration: animation.duration ?? duration,
      radius: animation.radius,
      height: animation.height,
      target: animation.target ?? spec.camera?.target ?? [0, -0.1, 0],
      turns: animation.turns ?? 0.6,
      easing: animation.easing ?? "ease-in-out-cubic",
      distanceLimits: {
        minDistance: spec.camera?.minDistance ?? 1.6,
        maxDistance: spec.camera?.maxDistance ?? 14,
      },
    });

    return {
      kind: "keyframes",
      keyframes: track.keyframes.map((keyframe) => ({
        ...keyframe,
        easing: toEasingId(keyframe.easing),
      })),
    };
  }

  return {
    kind: "keyframes",
    keyframes: animation.keyframes.map((keyframe) => ({
      ...keyframe,
      easing: keyframe.easing ?? "smoothstep",
    })),
  };
}

function compileCommandsToObjectTracks(spec: SceneDslSpec): ObjectTrackSpec[] {
  const tracks: ObjectTrackSpec[] = [];

  spec.commands.forEach((command) => {
    command.animations.forEach((animation) => {
      tracks.push(...compileAnimationToTracks(animation, command.start, command.duration));
    });
  });

  return tracks;
}

function compileAnimationToTracks(
  animation: SceneAnimation,
  start: number,
  fallbackDuration: number,
): ObjectTrackSpec[] {
  const duration = Math.max(animation.duration ?? fallbackDuration, 0);
  const end = start + duration;

  switch (animation.kind) {
    case "write":
    case "fade-in":
      return [
        {
          kind: "fade",
          objectId: targetId(animation.target),
          from: "from" in animation ? animation.from ?? 0 : 0,
          to: "to" in animation ? animation.to ?? 1 : 1,
          startTime: start,
          endTime: end,
          easing: animation.easing ?? "ease-out-cubic",
          mode: "absolute",
        },
      ];

    case "fade-out":
      return [
        {
          kind: "fade",
          objectId: targetId(animation.target),
          from: animation.from ?? 1,
          to: animation.to ?? 0,
          startTime: start,
          endTime: end,
          easing: animation.easing ?? "ease-in-cubic",
          mode: "absolute",
        },
      ];

    case "show":
      return [
        {
          kind: "fade",
          objectId: targetId(animation.target),
          from: 1,
          to: 1,
          startTime: start,
          endTime: Math.max(start + 0.001, end),
          easing: "linear",
          mode: "absolute",
        },
      ];

    case "hide":
      return [
        {
          kind: "fade",
          objectId: targetId(animation.target),
          from: 0,
          to: 0,
          startTime: start,
          endTime: Math.max(start + 0.001, end),
          easing: "linear",
          mode: "absolute",
        },
      ];

    case "move-to":
      return [
        {
          kind: "keyframes",
          objectId: targetId(animation.target),
          mode: "absolute",
          keyframes: [
            {
              time: start,
              transform: {},
              easing: animation.easing ?? "smoothstep",
            },
            {
              time: end,
              transform: {
                position: animation.position,
                mode: "absolute",
              },
              easing: animation.easing ?? "smoothstep",
            },
          ],
        },
      ];

    case "scale-to":
      return [
        {
          kind: "keyframes",
          objectId: targetId(animation.target),
          mode: "absolute",
          keyframes: [
            {
              time: start,
              transform: {},
              easing: animation.easing ?? "smoothstep",
            },
            {
              time: end,
              transform: {
                scale: animation.scale,
                mode: "absolute",
              },
              easing: animation.easing ?? "smoothstep",
            },
          ],
        },
      ];

    case "rotate":
      return [
        {
          kind: "keyframes",
          objectId: targetId(animation.target),
          mode: "relative",
          keyframes: [
            {
              time: start,
              transform: {
                rotation: [0, 0, 0],
                mode: "relative",
              },
              easing: animation.easing ?? "smoothstep",
            },
            {
              time: end,
              transform: {
                rotation: animation.rotation,
                mode: "relative",
              },
              easing: animation.easing ?? "smoothstep",
            },
          ],
        },
      ];

    case "spin":
      return [
        {
          kind: "spin",
          objectId: targetId(animation.target),
          axis: animation.axis,
          turns: animation.turns,
          pivot: animation.pivot,
          startTime: start,
          endTime: end,
          easing: animation.easing ?? "linear",
          mode: "relative",
        },
      ];

    case "indicate":
      return [
        {
          kind: "keyframes",
          objectId: targetId(animation.target),
          mode: "relative",
          keyframes: [
            {
              time: start,
              transform: {
                scale: [1, 1, 1],
                mode: "relative",
              },
              easing: animation.easing ?? "ease-in-out-cubic",
            },
            {
              time: start + duration / 2,
              transform: {
                scale: [animation.scale ?? 1.08, animation.scale ?? 1.08, animation.scale ?? 1.08],
                mode: "relative",
              },
              easing: animation.easing ?? "ease-in-out-cubic",
            },
            {
              time: end,
              transform: {
                scale: [1, 1, 1],
                mode: "relative",
              },
              easing: animation.easing ?? "ease-in-out-cubic",
            },
          ],
        },
      ];

    case "transform":
      return [
        {
          kind: "fade",
          objectId: targetId(animation.from),
          from: 1,
          to: 0,
          startTime: start,
          endTime: end,
          easing: animation.easing ?? "smoothstep",
          mode: "absolute",
        },
        {
          kind: "fade",
          objectId: targetId(animation.to),
          from: 0,
          to: 1,
          startTime: start,
          endTime: end,
          easing: animation.easing ?? "smoothstep",
          mode: "absolute",
        },
      ];

    case "wait":
      return [];
  }
}

function targetId(target: SceneAnimationTarget): string {
  return typeof target === "string" ? target : target.id;
}

function inferDuration(spec: SceneDslSpec): number {
  if (spec.commands.length === 0) return 1;

  return Math.max(...spec.commands.map((command) => command.start + command.duration), 1);
}

function getBackground(spec: SceneDslSpec): string | undefined {
  const background = spec.metadata?.background;
  return typeof background === "string" ? background : undefined;
}

function toEasingId(easing: string | undefined): EasingId | undefined {
  return easing && EASING_IDS.has(easing as EasingId) ? (easing as EasingId) : undefined;
}
