import type {
  VisualColor,
  VisualMetadata,
  VisualSceneSpec,
  VisualTransformSpec,
  VisualVec3,
} from "@methodslab/visual-engine/core";
import type {
  EasingId,
  VideoProjectSpec,
} from "@methodslab/video-engine/core";

export type SceneDslScalar = string | number | boolean | null | undefined;

export type SceneDslMetadata = Record<string, SceneDslScalar>;

export type SceneObjectId = string;

export type SceneCommandId = string;

export type SceneObjectKind =
  | "group"
  | "text"
  | "tex"
  | "label"
  | "axes"
  | "grid"
  | "box"
  | "marker"
  | "arrow"
  | "path"
  | "plane"
  | "surface"
  | "custom";

export type SceneObjectRef<TKind extends SceneObjectKind = SceneObjectKind> = {
  id: SceneObjectId;
  kind: TKind;
};

export type SceneLayoutAnchor =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type SceneDirection = "up" | "down" | "left" | "right" | "front" | "back";

export type SceneObjectBase = {
  id: SceneObjectId;
  kind: SceneObjectKind;
  name?: string;

  /**
   * Semantic object id. This becomes VisualLayerSpec.objectId.
   * Video tracks target this value.
   */
  objectId?: string;

  visible?: boolean;
  opacity?: number;
  transform?: VisualTransformSpec;
  metadata?: SceneDslMetadata;
};

export type SceneGroupObject = SceneObjectBase & {
  kind: "group";
  children: SceneObject[];
};

export type SceneTextObject = SceneObjectBase & {
  kind: "text";
  text: string;
  position?: VisualVec3;
  color?: VisualColor;
  scale?: number;
};

export type SceneTexObject = SceneObjectBase & {
  kind: "tex";
  source: string;
  position?: VisualVec3;
  color?: VisualColor;
  scale?: number;
  tokens?: SceneTexToken[];
};

export type SceneTexToken = {
  id: string;
  text: string;
  sourceStart?: number;
  sourceEnd?: number;
  objectId?: string;
  metadata?: SceneDslMetadata;
};

export type SceneLabelObject = {
  id: string;
  kind: "label";
  objectId?: string;
  name?: string;
  text: string;
  position: VisualVec3;
  color?: VisualColor;
  scale?: number;
  format?: "text" | "latex";
  metadata?: SceneDslMetadata;
};

export type SceneAxesObject = SceneObjectBase & {
  kind: "axes";
  origin?: VisualVec3;
  size?: number;
  xLabel?: string;
  yLabel?: string;
  zLabel?: string;
  color?: VisualColor;
};

export type SceneGridObject = SceneObjectBase & {
  kind: "grid";
  size?: number;
  divisions?: number;
  y?: number;
  color?: VisualColor;
  opacity?: number;
};

export type SceneBoxObject = SceneObjectBase & {
  kind: "box";
  position: VisualVec3;
  size: VisualVec3;
  color?: VisualColor;
};

export type SceneMarkerObject = SceneObjectBase & {
  kind: "marker";
  position: VisualVec3;
  radius?: number;
  color?: VisualColor;
  label?: string;
};

export type SceneArrowObject = SceneObjectBase & {
  kind: "arrow";
  from: VisualVec3;
  to: VisualVec3;
  color?: VisualColor;
  opacity?: number;
  headSize?: number;
};

export type ScenePathObject = SceneObjectBase & {
  kind: "path";
  points: VisualVec3[];
  color?: VisualColor;
  opacity?: number;
  closed?: boolean;
};

export type ScenePlaneObject = SceneObjectBase & {
  kind: "plane";
  position: VisualVec3;
  size: [number, number];
  color?: VisualColor;
  opacity?: number;
  rotation?: VisualVec3;
};

export type SceneSurfaceObject = SceneObjectBase & {
  kind: "surface";
  scene: VisualSceneSpec;
};

export type SceneCustomObject = SceneObjectBase & {
  kind: "custom";
  scene: VisualSceneSpec;
};

export type SceneObject =
  | SceneGroupObject
  | SceneTextObject
  | SceneTexObject
  | SceneLabelObject
  | SceneAxesObject
  | SceneGridObject
  | SceneBoxObject
  | SceneMarkerObject
  | SceneArrowObject
  | ScenePathObject
  | ScenePlaneObject
  | SceneSurfaceObject
  | SceneCustomObject;

export type SceneAnimationKind =
  | "write"
  | "fade-in"
  | "fade-out"
  | "show"
  | "hide"
  | "drop-in"
  | "indicate"
  | "move-to"
  | "scale-to"
  | "rotate"
  | "spin"
  | "transform"
  | "wait";

export type SceneAnimationTarget = SceneObjectRef | SceneObjectId;

export type SceneAnimationBase = {
  id?: string;
  kind: SceneAnimationKind;
  target?: SceneAnimationTarget;
  duration?: number;
  easing?: EasingId;
  metadata?: SceneDslMetadata;
};

export type SceneWriteAnimation = SceneAnimationBase & {
  kind: "write";
  target: SceneAnimationTarget;
};

export type SceneFadeInAnimation = SceneAnimationBase & {
  kind: "fade-in";
  target: SceneAnimationTarget;
  from?: number;
  to?: number;
};

export type SceneFadeOutAnimation = SceneAnimationBase & {
  kind: "fade-out";
  target: SceneAnimationTarget;
  from?: number;
  to?: number;
};

export type SceneShowAnimation = SceneAnimationBase & {
  kind: "show";
  target: SceneAnimationTarget;
};

export type SceneHideAnimation = SceneAnimationBase & {
  kind: "hide";
  target: SceneAnimationTarget;
};

export type SceneDropDirection = "top" | "bottom" | "left" | "right";

export type SceneDropInAnimation = SceneAnimationBase & {
  kind: "drop-in";
  target: SceneAnimationTarget;
  direction?: SceneDropDirection;
  distance?: number;
};

export type SceneIndicateAnimation = SceneAnimationBase & {
  kind: "indicate";
  target: SceneAnimationTarget;
  color?: VisualColor;
  scale?: number;
};

export type SceneMoveToAnimation = SceneAnimationBase & {
  kind: "move-to";
  target: SceneAnimationTarget;
  position: VisualVec3;
};

export type SceneScaleToAnimation = SceneAnimationBase & {
  kind: "scale-to";
  target: SceneAnimationTarget;
  scale: VisualVec3;
};

export type SceneRotateAnimation = SceneAnimationBase & {
  kind: "rotate";
  target: SceneAnimationTarget;
  rotation: VisualVec3;
};

export type SceneSpinAnimation = SceneAnimationBase & {
  kind: "spin";
  target: SceneAnimationTarget;
  axis: "x" | "y" | "z";
  turns: number;
  pivot?: VisualVec3;
};

export type SceneTransformAnimation = SceneAnimationBase & {
  kind: "transform";
  from: SceneAnimationTarget;
  to: SceneAnimationTarget;
};

export type SceneWaitAnimation = SceneAnimationBase & {
  kind: "wait";
  duration: number;
};

export type SceneAnimation =
  | SceneWriteAnimation
  | SceneFadeInAnimation
  | SceneFadeOutAnimation
  | SceneShowAnimation
  | SceneHideAnimation
  | SceneDropInAnimation
  | SceneIndicateAnimation
  | SceneMoveToAnimation
  | SceneScaleToAnimation
  | SceneRotateAnimation
  | SceneSpinAnimation
  | SceneTransformAnimation
  | SceneWaitAnimation;

export type SceneCommand = {
  id: SceneCommandId;
  start: number;
  duration: number;
  animations: SceneAnimation[];
  metadata?: SceneDslMetadata;
};

export type SceneCameraSpec = {
  position?: VisualVec3;
  target?: VisualVec3;
  fov?: number;
  minDistance?: number;
  maxDistance?: number;
  projection?: "perspective" | "orthographic";
  orthographicSize?: number;
};

export type SceneCameraAnimation =
  | {
      kind: "orbit";
      start?: number;
      duration?: number;
      radius?: number;
      height?: number;
      target?: VisualVec3;
      turns?: number;
      easing?: EasingId;
    }
  | {
      kind: "keyframes";
      keyframes: Array<{
        time: number;
        position?: VisualVec3;
        target?: VisualVec3;
        fov?: number;
        easing?: EasingId;
      }>;
    };

export type SceneDslSpec = {
  id: string;
  name: string;
  fps: number;
  duration?: number;

  camera?: SceneCameraSpec;
  cameraAnimation?: SceneCameraAnimation;

  objects: SceneObject[];
  commands: SceneCommand[];

  metadata?: SceneDslMetadata;
};

export type SceneBuildOptions = {
  id?: string;
  name?: string;
  fps?: number;
  background?: string;
  metadata?: VisualMetadata;
};

export type SceneCompileResult = {
  scene: VisualSceneSpec;
  project: VideoProjectSpec;
  warnings: string[];
};

export type SceneBuilderApi = {
  readonly id: string;
  readonly name: string;

  add(object: SceneObject): SceneObjectRef;
  play(...animations: SceneAnimation[]): SceneCommand;
  wait(duration: number): SceneCommand;

  toSpec(): SceneDslSpec;
  toVisualScene(): VisualSceneSpec;
  toVideoProject(): VideoProjectSpec;
};

/**
 * Legacy parser compatibility types.
 *
 * parser.ts is still used by the current video-lab code editor.
 * These types keep it working while the new code-first Scene DSL is introduced.
 */

export type SceneSlideEffect = "cut" | "fade" | "slide" | "typewriter";

export type SceneSlide = {
  start: number;
  end: number;
  title: string;
  latex: string;
  effect?: SceneSlideEffect;
};

export type SceneObjectKeyframe = {
  time: number;
  position?: VisualVec3;
  rotation?: VisualVec3;
  scale?: VisualVec3;
  opacity?: number;
  transform?: VisualTransformSpec;
  easing?: EasingId;
  metadata?: SceneDslMetadata;
};

export type SceneObjectSpin = {
  axis: "x" | "y" | "z";
  turns: number;
  pivot?: VisualVec3;
};

export type SceneObjectScript = {
  spin?: SceneObjectSpin;
  keyframes?: SceneObjectKeyframe[];
};

export type SceneScriptCamera = {
  orbit: boolean;
  turns: number;
  keyframes: Array<{
    time: number;
    position?: VisualVec3;
    target?: VisualVec3;
    fov?: number;
    minDistance?: number;
    maxDistance?: number;
    easing?: EasingId;
  }>;
};

export type SceneScriptObjects = Record<string, SceneObjectScript> & {
  volume: SceneObjectScript;
  axes: SceneObjectScript;
  cameraPath: SceneObjectScript;
  title: SceneObjectScript;
};

export type SceneScript = {
  version: number;
  duration: number;
  fps: number;
  camera: SceneScriptCamera;
  objects: SceneScriptObjects;
  labels: SceneLabelObject[];
  title: string;
  latex: string;
  slides: SceneSlide[];
  metadata?: SceneDslMetadata;
};
