import type { VideoLabCommandCompileArgs } from "../../../commands";

export type SourcePrimitiveCategory = "math" | "physics" | "geometry";

export type SourcePrimitiveDiagnostic = {
  lineNumber: number;
  message: string;
};

export type SourcePrimitiveCompletion = {
  label: string;
  insertText: string;
  detail: string;
};

export type SourcePrimitiveReference = {
  id: string;
  title: string;
  description: string;
  examples: string[];
};

export type SourcePrimitive = {
  name: string;
  aliases?: string[];
  category: SourcePrimitiveCategory;
  createsObject: boolean;

  description: string;
  examples: string[];
  completions: SourcePrimitiveCompletion[];
  reference: SourcePrimitiveReference;

  compile(args: VideoLabCommandCompileArgs): void;

  diagnose?(args: {
    tokens: string[];
    lineNumber: number;
  }): SourcePrimitiveDiagnostic[];
};

export function warn(
  args: VideoLabCommandCompileArgs,
  message: string,
): void {
  args.context.warnings.push(`Line ${args.lineNumber}: ${message}`);
}

export function tokenRequired(
  tokens: string[],
  token: string,
): boolean {
  return tokens.includes(token);
}

export function tokenIndex(tokens: string[], token: string): number {
  return tokens.indexOf(token);
}

export function tokenAfter(tokens: string[], name: string): string | undefined {
  const index = tokens.indexOf(name);
  return index >= 0 ? tokens[index + 1] : undefined;
}

export function expressionBetween(tokens: string[], start: number, end: number): string {
  return tokens.slice(start, end).join("");
}

export function firstStopIndex(tokens: string[], fallback: number, ...stops: string[]): number {
  const indexes = stops
    .map((stop) => tokens.indexOf(stop))
    .filter((index) => index >= 0);

  return indexes.length > 0 ? Math.min(...indexes) : fallback;
}
