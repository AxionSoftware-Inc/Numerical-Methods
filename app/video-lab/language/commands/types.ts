import type { VideoProjectSpec } from "@methodslab/video-engine/core";
import type { createMathScene } from "@methodslab/scene-dsl/core";
import type { VideoLabVariables } from "../values";

export type VideoLabCommandCategory =
  | "setup"
  | "object"
  | "animation"
  | "math"
  | "physics"
  | "utility";

export type VideoLabCompileWarning = {
  lineNumber: number;
  message: string;
};

export type VideoLabSceneConfig = {
  id: string;
  name: string;
  duration: number;
  fps: number;
  camera: {
    kind: "orbit";
    radius: number;
    height: number;
    turns: number;
  };
};

export type VideoLabMathScene = ReturnType<typeof createMathScene>;

export type VideoLabCompileContext = {
  scene: VideoLabMathScene;
  variables: VideoLabVariables;
  config: VideoLabSceneConfig;
  warnings: string[];

  /**
   * Current preview/render time in seconds.
   * Used by animated procedural primitives.
   */
  time: number;
};

export type VideoLabCommandCompileArgs = {
  context: VideoLabCompileContext;
  tokens: string[];
  lineNumber: number;
};

export type VideoLabCommandDiagnostic = {
  lineNumber: number;
  message: string;
};

export type VideoLabCommandCompletion = {
  label: string;
  insertText: string;
  detail: string;
};

export type VideoLabCommand = {
  name: string;
  aliases?: string[];
  category: VideoLabCommandCategory;
  description: string;
  examples?: string[];

  compile(args: VideoLabCommandCompileArgs): void;

  diagnose?(args: {
    tokens: string[];
    lineNumber: number;
  }): VideoLabCommandDiagnostic[];

  completions?: VideoLabCommandCompletion[];
};

export type VideoLabCompileResult = {
  project: VideoProjectSpec;
  error: string | null;
  warnings: string[];
};
