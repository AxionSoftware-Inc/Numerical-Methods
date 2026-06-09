import type {
  SceneAnimation,
  SceneAnimationTarget,
  SceneFadeInAnimation,
  SceneFadeOutAnimation,
  SceneHideAnimation,
  SceneIndicateAnimation,
  SceneMoveToAnimation,
  SceneRotateAnimation,
  SceneScaleToAnimation,
  SceneShowAnimation,
  SceneSpinAnimation,
  SceneTransformAnimation,
  SceneWaitAnimation,
  SceneWriteAnimation,
} from "./types";
import type { EasingId } from "@methodslab/video-engine/core";
import type { VisualColor, VisualVec3 } from "@methodslab/visual-engine/core";

export type AnimationOptions = {
  duration?: number;
  easing?: EasingId;
};

export type FadeOptions = AnimationOptions & {
  from?: number;
  to?: number;
};

export type IndicateOptions = AnimationOptions & {
  color?: VisualColor;
  scale?: number;
};

export type SpinOptions = AnimationOptions & {
  axis?: "x" | "y" | "z";
  turns?: number;
  pivot?: VisualVec3;
};

export type MoveOptions = AnimationOptions;

export type ScaleOptions = AnimationOptions;

export type RotateOptions = AnimationOptions;

export function write(
  target: SceneAnimationTarget,
  options: AnimationOptions = {},
): SceneWriteAnimation {
  return {
    kind: "write",
    target,
    duration: options.duration ?? 1,
    easing: options.easing ?? "ease-out-cubic",
  };
}

export function fadeIn(
  target: SceneAnimationTarget,
  options: FadeOptions = {},
): SceneFadeInAnimation {
  return {
    kind: "fade-in",
    target,
    from: options.from ?? 0,
    to: options.to ?? 1,
    duration: options.duration ?? 0.8,
    easing: options.easing ?? "ease-out-cubic",
  };
}

export function fadeOut(
  target: SceneAnimationTarget,
  options: FadeOptions = {},
): SceneFadeOutAnimation {
  return {
    kind: "fade-out",
    target,
    from: options.from ?? 1,
    to: options.to ?? 0,
    duration: options.duration ?? 0.65,
    easing: options.easing ?? "ease-in-cubic",
  };
}

export function show(target: SceneAnimationTarget): SceneShowAnimation {
  return {
    kind: "show",
    target,
    duration: 0,
  };
}

export function hide(target: SceneAnimationTarget): SceneHideAnimation {
  return {
    kind: "hide",
    target,
    duration: 0,
  };
}

export function indicate(
  target: SceneAnimationTarget,
  options: IndicateOptions = {},
): SceneIndicateAnimation {
  return {
    kind: "indicate",
    target,
    color: options.color ?? "#facc15",
    scale: options.scale ?? 1.08,
    duration: options.duration ?? 0.65,
    easing: options.easing ?? "ease-in-out-cubic",
  };
}

export function moveTo(
  target: SceneAnimationTarget,
  position: VisualVec3,
  options: MoveOptions = {},
): SceneMoveToAnimation {
  return {
    kind: "move-to",
    target,
    position,
    duration: options.duration ?? 1,
    easing: options.easing ?? "smoothstep",
  };
}

export function scaleTo(
  target: SceneAnimationTarget,
  scale: VisualVec3 | number,
  options: ScaleOptions = {},
): SceneScaleToAnimation {
  const normalizedScale: VisualVec3 =
    typeof scale === "number" ? [scale, scale, scale] : scale;

  return {
    kind: "scale-to",
    target,
    scale: normalizedScale,
    duration: options.duration ?? 1,
    easing: options.easing ?? "smoothstep",
  };
}

export function rotate(
  target: SceneAnimationTarget,
  rotation: VisualVec3,
  options: RotateOptions = {},
): SceneRotateAnimation {
  return {
    kind: "rotate",
    target,
    rotation,
    duration: options.duration ?? 1,
    easing: options.easing ?? "smoothstep",
  };
}

export function spin(
  target: SceneAnimationTarget,
  options: SpinOptions = {},
): SceneSpinAnimation {
  return {
    kind: "spin",
    target,
    axis: options.axis ?? "y",
    turns: options.turns ?? 1,
    pivot: options.pivot,
    duration: options.duration ?? 2,
    easing: options.easing ?? "linear",
  };
}

export function transform(
  from: SceneAnimationTarget,
  to: SceneAnimationTarget,
  options: AnimationOptions = {},
): SceneTransformAnimation {
  return {
    kind: "transform",
    from,
    to,
    duration: options.duration ?? 1,
    easing: options.easing ?? "smoothstep",
  };
}

export function wait(duration: number): SceneWaitAnimation {
  return {
    kind: "wait",
    duration: Math.max(0, duration),
  };
}

export function sequence(...animations: SceneAnimation[]): SceneAnimation[] {
  return animations;
}

export function parallel(...animations: SceneAnimation[]): SceneAnimation[] {
  return animations;
}

export function targetId(target: SceneAnimationTarget): string {
  return typeof target === "string" ? target : target.id;
}