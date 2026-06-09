import type { VisualCameraSpec, VisualSceneSpec, VisualTransformSpec, VisualVec3 } from "@methodslab/visual-engine/core";

export type EasingId = "linear" | "smoothstep" | "ease-in" | "ease-out" | "ease-in-out";

export type CameraKeyframe = {
  time: number;
  position?: VisualVec3;
  target?: VisualVec3;
  fov?: number;
  minDistance?: number;
  maxDistance?: number;
  easing?: EasingId;
};

export type CameraTrackSpec = {
  keyframes: CameraKeyframe[];
};

export type TimelineSpec = {
  duration: number;
  fps: number;
  camera?: CameraTrackSpec;
  objects?: ObjectTrackSpec[];
};

export type ObjectRotationAxis = "x" | "y" | "z";

export type ObjectSpinTrackSpec = {
  kind: "spin";
  objectId: string;
  axis: ObjectRotationAxis;
  turns: number;
  pivot?: VisualVec3;
  startAngle?: number;
  easing?: EasingId;
};

export type ObjectTransformKeyframe = {
  time: number;
  transform: VisualTransformSpec;
  easing?: EasingId;
};

export type ObjectKeyframeTrackSpec = {
  kind: "keyframes";
  objectId: string;
  keyframes: ObjectTransformKeyframe[];
};

export type ObjectTrackSpec = ObjectSpinTrackSpec | ObjectKeyframeTrackSpec;

export type VideoProjectSpec = {
  id: string;
  name: string;
  baseScene: VisualSceneSpec;
  timeline: TimelineSpec;
  metadata?: Record<string, string | number | boolean>;
};

export type VideoFrameSpec = {
  frame: number;
  time: number;
  progress: number;
  scene: VisualSceneSpec;
};

export type OrbitCameraTrackOptions = {
  duration: number;
  radius?: number;
  height?: number;
  target?: VisualVec3;
  startAngle?: number;
  turns?: number;
  fov?: number;
  samples?: number;
  easing?: EasingId;
  distanceLimits?: Pick<VisualCameraSpec, "minDistance" | "maxDistance">;
};
