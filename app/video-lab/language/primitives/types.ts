import type { VideoLabCommandCompileArgs } from "../commands";

export type VideoLabPrimitiveCategory =
  | "math"
  | "physics"
  | "geometry"
  | "visual";

export type VideoLabPrimitiveDiagnostic = {
  lineNumber: number;
  message: string;
};

export type VideoLabPrimitiveCompletion = {
  label: string;
  insertText: string;
  detail: string;
};

export type VideoLabPrimitiveReference = {
  id: string;
  title: string;
  description: string;
  examples: string[];
};

export type VideoLabPrimitive = {
  name: string;
  aliases?: string[];
  category: VideoLabPrimitiveCategory;

  /**
   * If true, symbols.ts can treat tokens[1] as a scene object id.
   * Example: graph g = sin(x) ...
   */
  createsObject?: boolean;

  description: string;
  examples: string[];

  completions?: VideoLabPrimitiveCompletion[];

  reference?: VideoLabPrimitiveReference;

  compile(args: VideoLabCommandCompileArgs): void;

  diagnose?(args: {
    tokens: string[];
    lineNumber: number;
  }): VideoLabPrimitiveDiagnostic[];
};