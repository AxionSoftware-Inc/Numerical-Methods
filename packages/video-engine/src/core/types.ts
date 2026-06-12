import type {
  VisualCameraSpec,
  VisualMetadata,
  VisualSceneSpec,
  VisualTransformMode,
  VisualTransformSpec,
  VisualVec3,
} from "@methodslab/visual-engine/core";

export type EasingId =
  | "linear"
  | "smoothstep"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "ease-in-cubic"
  | "ease-out-cubic"
  | "ease-in-out-cubic";

export type VideoTime = number;

export type VideoFrameIndex = number;

export type VideoPlaybackRange = {
  start: VideoTime;
  end: VideoTime;
};

export type VideoProjectSpec = {
  id: string;
  name: string;

  /**
   * Static base scene. Timeline tracks sample over this scene.
   */
  baseScene: VisualSceneSpec;

  timeline: TimelineSpec;

  metadata?: VisualMetadata;
};

export type TimelineSpec = {
  duration: number;
  fps: number;

  /**
   * Optional camera animation track.
   */
  camera?: CameraTrackSpec;

  /**
   * Object tracks target VisualLayerSpec.objectId.
   */
  objects?: ObjectTrackSpec[];

  /**
   * Higher-level animation clips. These are optional for now,
   * but they let us grow toward a Manim-like animation system.
   */
  clips?: VideoClipSpec[];

  metadata?: VisualMetadata;
};

export type VideoClipSpec = {
  id: string;
  name?: string;
  start: VideoTime;
  duration: number;
  easing?: EasingId;
  objectIds?: string[];
  metadata?: VisualMetadata;
};

export type CameraKeyframe = {
  time: VideoTime;
  position?: VisualVec3;
  target?: VisualVec3;
  fov?: number;
  minDistance?: number;
  maxDistance?: number;
  near?: number;
  far?: number;
  easing?: EasingId;
  metadata?: VisualMetadata;
};

export type CameraKeyframeTrackSpec = {
  kind?: "keyframes";
  keyframes: CameraKeyframe[];
  metadata?: VisualMetadata;
};

export type CameraOrbitTrackSpec = {
  kind: "orbit";
  duration?: number;
  radius?: number;
  height?: number;
  target?: VisualVec3;
  startAngle?: number;
  turns?: number;
  fov?: number;
  minDistance?: number;
  maxDistance?: number;
  easing?: EasingId;
  metadata?: VisualMetadata;
};

export type CameraTrackSpec = CameraKeyframeTrackSpec | CameraOrbitTrackSpec;

export type ObjectRotationAxis = "x" | "y" | "z";

export type ObjectTrackBase = {
  id?: string;

  /**
   * Must match VisualLayerSpec.objectId.
   */
  objectId: string;

  /**
   * absolute: sampled transform replaces base transform.
   * relative: sampled transform composes over base transform.
   */
  mode?: VisualTransformMode;

  metadata?: VisualMetadata;
};

export type ObjectSpinTrackSpec = ObjectTrackBase & {
  kind: "spin";
  axis: ObjectRotationAxis;
  turns: number;
  pivot?: VisualVec3;
  startAngle?: number;
  startTime?: VideoTime;
  endTime?: VideoTime;
  easing?: EasingId;
};

export type ObjectTransformKeyframe = {
  time: VideoTime;
  transform: VisualTransformSpec;
  easing?: EasingId;
  metadata?: VisualMetadata;
};

export type ObjectKeyframeTrackSpec = ObjectTrackBase & {
  kind: "keyframes";
  keyframes: ObjectTransformKeyframe[];
};

export type ObjectFadeTrackSpec = ObjectTrackBase & {
  kind: "fade";
  from: number;
  to: number;
  startTime: VideoTime;
  endTime: VideoTime;
  easing?: EasingId;
};

export type ObjectRevealTrackSpec = ObjectTrackBase & {
  kind: "reveal";
  from: number;
  to: number;
  startTime: VideoTime;
  endTime: VideoTime;
  easing?: EasingId;
};

export type ObjectTrackSpec =
  | ObjectSpinTrackSpec
  | ObjectKeyframeTrackSpec
  | ObjectFadeTrackSpec
  | ObjectRevealTrackSpec;

export type VideoFrameSpec = {
  frame: VideoFrameIndex;
  time: VideoTime;
  progress: number;
  scene: VisualSceneSpec;
  metadata?: VisualMetadata;
};

export type VideoRenderOptions = {
  range?: Partial<VideoPlaybackRange>;
  fps?: number;
};

export type VideoProjectValidationIssue = {
  level: "warning" | "error";
  code: string;
  message: string;
  path?: string;
};

export type VideoProjectValidationResult = {
  ok: boolean;
  issues: VideoProjectValidationIssue[];
};

export type CompiledVideoProjectSpec = VideoProjectSpec & {
  timeline: TimelineSpec & {
    camera?: CameraTrackSpec;
    objects: ObjectTrackSpec[];
    clips: VideoClipSpec[];
  };
  metadata?: VisualMetadata & {
    compiled?: true;
  };
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
