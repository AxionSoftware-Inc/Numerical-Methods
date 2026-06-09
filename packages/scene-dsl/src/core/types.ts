import type { CameraKeyframe } from "@methodslab/video-engine/core";
import type { VisualVec3 } from "@methodslab/visual-engine/core";

export type SceneSlide = {
  start: number;
  end: number;
  title: string;
  latex: string;
  effect?: "cut" | "fade" | "slide" | "typewriter";
};

export type SceneObjectKeyframe = {
  time: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  opacity?: number;
  easing?: "linear" | "smoothstep" | "ease-in" | "ease-out" | "ease-in-out";
};

export type SceneObjectScript = {
  spin?: {
    axis: "x" | "y" | "z";
    turns: number;
    pivot?: [number, number, number];
  };
  keyframes?: SceneObjectKeyframe[];
};

export type SceneLabelObject = {
  id: string;
  text: string;
  position: VisualVec3;
  color: string;
  scale: number;
  format: "text" | "latex";
};

export type SceneScript = {
  version: 1;
  duration: number;
  fps: number;
  camera: {
    orbit: boolean;
    turns: number;
    keyframes: CameraKeyframe[];
  };
  objects: Record<string, SceneObjectScript>;
  labels: SceneLabelObject[];
  title: string;
  latex: string;
  slides: SceneSlide[];
};
