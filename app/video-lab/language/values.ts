export type VideoLabScalar = string | number | boolean;
export type VideoLabVec3 = [number, number, number];

export type VideoLabValue =
  | VideoLabScalar
  | VideoLabVec3;

export type VideoLabVariables = Map<string, VideoLabValue>;

export type ResolveValueOptions = {
  variables: VideoLabVariables;
};

export const VIDEO_LAB_COLOR_PALETTE: Record<string, string> = {
  white: "#f8fafc",
  slate: "#94a3b8",
  gray: "#9ca3af",

  cyan: "#67e8f9",
  sky: "#38bdf8",
  blue: "#60a5fa",
  teal: "#5eead4",
  green: "#86efac",
  emerald: "#34d399",

  yellow: "#fde047",
  amber: "#f59e0b",
  orange: "#fb923c",

  red: "#fb7185",
  rose: "#fda4af",
  pink: "#f9a8d4",
  purple: "#c084fc",
  violet: "#a78bfa",
};

export const VIDEO_LAB_NAMED_POSITIONS: Record<string, VideoLabVec3> = {
  origin: [0, 0, 0],
  center: [0, 0, 0],

  top: [0, 2.1, 1.8],
  bottom: [0, -1.25, 1.4],
  left: [-1.45, 0.2, 1.3],
  right: [1.45, 0.2, 1.3],

  "top-left": [-1.45, 2.15, 1.8],
  "top-right": [1.05, 2.15, 1.8],
  "bottom-left": [-1.45, -1.15, 1.5],
  "bottom-right": [1.05, -1.15, 1.5],

  title: [-1.45, 2.46, 1.9],
  subtitle: [-1.45, 2.12, 1.9],
  formula: [-1.42, 1.82, 1.9],
  note: [-1, 1.3, 1.2],

  grid: [0, -0.86, 0],
};

export function createDefaultVariables(): VideoLabVariables {
  return new Map<string, VideoLabValue>([
    ["origin", [0, 0, 0]],
    ["center", [0, 0, 0]],

    ["top", VIDEO_LAB_NAMED_POSITIONS.top],
    ["bottom", VIDEO_LAB_NAMED_POSITIONS.bottom],
    ["left", VIDEO_LAB_NAMED_POSITIONS.left],
    ["right", VIDEO_LAB_NAMED_POSITIONS.right],

    ["title_pos", VIDEO_LAB_NAMED_POSITIONS.title],
    ["subtitle_pos", VIDEO_LAB_NAMED_POSITIONS.subtitle],
    ["formula_pos", VIDEO_LAB_NAMED_POSITIONS.formula],

    ...Object.entries(VIDEO_LAB_COLOR_PALETTE),
  ]);
}

export function parseAssignment(line: string): { name: string; valueSource: string } | null {
  const match = line.match(/^([a-zA-Z_][\w-]*)\s*=\s*(.+)$/);

  if (!match) return null;

  return {
    name: match[1],
    valueSource: match[2].trim(),
  };
}

export function resolveValue(source: string, options: ResolveValueOptions): VideoLabValue {
  const trimmed = stripOuterWhitespace(source);

  if (options.variables.has(trimmed)) {
    return options.variables.get(trimmed) as VideoLabValue;
  }

  if (trimmed in VIDEO_LAB_COLOR_PALETTE) {
    return VIDEO_LAB_COLOR_PALETTE[trimmed];
  }

  if (trimmed in VIDEO_LAB_NAMED_POSITIONS) {
    return VIDEO_LAB_NAMED_POSITIONS[trimmed];
  }

  if (isQuoted(trimmed)) {
    return unquote(trimmed);
  }

  if (isVec3Literal(trimmed)) {
    return parseVec3Literal(trimmed, options);
  }

  if (trimmed === "true") return true;
  if (trimmed === "false") return false;

  const numeric = parseNumberish(trimmed);

  if (Number.isFinite(numeric)) {
    return numeric;
  }

  return trimmed;
}

export function resolveString(source: string | undefined, options: ResolveValueOptions, fallback = ""): string {
  if (!source) return fallback;

  const value = resolveValue(source, options);

  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return String(value);

  return fallback;
}

export function resolveColor(source: string | undefined, options: ResolveValueOptions, fallback = "#f8fafc"): string {
  if (!source) return fallback;

  const value = resolveValue(source, options);

  if (typeof value === "string") {
    return VIDEO_LAB_COLOR_PALETTE[value] ?? value;
  }

  return fallback;
}

export function resolveNumber(source: string | undefined, options: ResolveValueOptions, fallback = 0): number {
  if (!source) return fallback;

  const value = resolveValue(source, options);

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = parseNumberish(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

export function resolvePositiveNumber(source: string | undefined, options: ResolveValueOptions, fallback: number): number {
  const value = resolveNumber(source, options, fallback);
  return value > 0 ? value : fallback;
}

export function resolveDuration(source: string | undefined, options: ResolveValueOptions, fallback: number): number {
  if (!source) return fallback;

  const value = resolveValue(source, options);

  if (typeof value === "number") {
    return value > 0 ? value : fallback;
  }

  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim().toLowerCase();

  if (trimmed.endsWith("ms")) {
    const ms = Number(trimmed.slice(0, -2));
    return Number.isFinite(ms) && ms >= 0 ? ms / 1000 : fallback;
  }

  if (trimmed.endsWith("s")) {
    const seconds = Number(trimmed.slice(0, -1));
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : fallback;
  }

  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
}

export function resolveAngle(source: string | undefined, options: ResolveValueOptions, fallback = 0): number {
  if (!source) return fallback;

  const value = resolveValue(source, options);

  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized.endsWith("deg")) {
    const degrees = Number(normalized.slice(0, -3));
    return Number.isFinite(degrees) ? (degrees * Math.PI) / 180 : fallback;
  }

  if (normalized.endsWith("degree")) {
    const degrees = Number(normalized.slice(0, -6));
    return Number.isFinite(degrees) ? (degrees * Math.PI) / 180 : fallback;
  }

  if (normalized.endsWith("degrees")) {
    const degrees = Number(normalized.slice(0, -7));
    return Number.isFinite(degrees) ? (degrees * Math.PI) / 180 : fallback;
  }

  if (normalized.endsWith("rad")) {
    const radians = Number(normalized.slice(0, -3));
    return Number.isFinite(radians) ? radians : fallback;
  }

  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function resolveVec3(source: string | undefined, options: ResolveValueOptions, fallback: VideoLabVec3 = [0, 0, 0]): VideoLabVec3 {
  if (!source) return fallback;

  const value = resolveValue(source, options);

  if (isVec3(value)) {
    return value;
  }

  if (typeof value === "string") {
    if (value in VIDEO_LAB_NAMED_POSITIONS) {
      return VIDEO_LAB_NAMED_POSITIONS[value];
    }
  }

  return fallback;
}

export function parseVec3FromTokens(
  tokens: string[],
  start: number,
  options: ResolveValueOptions,
  fallback: VideoLabVec3 = [0, 0, 0],
): VideoLabVec3 {
  const first = tokens[start];

  if (!first) return fallback;

  if (first.startsWith("[") && !first.endsWith("]")) {
    const parts: string[] = [];

    for (let index = start; index < tokens.length; index += 1) {
      parts.push(tokens[index]);

      if (tokens[index]?.endsWith("]")) break;
    }

    return resolveVec3(parts.join(" "), options, fallback);
  }

  if (first.startsWith("[") || first in VIDEO_LAB_NAMED_POSITIONS || options.variables.has(first)) {
    return resolveVec3(first, options, fallback);
  }

  return [
    resolveNumber(tokens[start], options, fallback[0]),
    resolveNumber(tokens[start + 1], options, fallback[1]),
    resolveNumber(tokens[start + 2], options, fallback[2]),
  ];
}

export function parseNamedNumber(
  tokens: string[],
  name: string,
  options: ResolveValueOptions,
  fallback: number,
): number {
  const index = tokens.indexOf(name);
  if (index < 0) return fallback;
  return resolveNumber(tokens[index + 1], options, fallback);
}

export function parseNamedDuration(
  tokens: string[],
  name: string,
  options: ResolveValueOptions,
  fallback: number,
): number {
  const index = tokens.indexOf(name);
  if (index < 0) return fallback;
  return resolveDuration(tokens[index + 1], options, fallback);
}

export function parseNamedString(
  tokens: string[],
  name: string,
  options: ResolveValueOptions,
  fallback: string,
): string {
  const index = tokens.indexOf(name);
  if (index < 0) return fallback;
  return resolveString(tokens[index + 1], options, fallback);
}

export function parseNamedColor(
  tokens: string[],
  name: string,
  options: ResolveValueOptions,
  fallback: string,
): string {
  const index = tokens.indexOf(name);
  if (index < 0) return fallback;
  return resolveColor(tokens[index + 1], options, fallback);
}

export function parseNamedVec3(
  tokens: string[],
  name: string,
  options: ResolveValueOptions,
  fallback: VideoLabVec3,
): VideoLabVec3 {
  const index = tokens.indexOf(name);
  if (index < 0) return fallback;
  return parseVec3FromTokens(tokens, index + 1, options, fallback);
}

export function durationFromNaturalTokens(
  tokens: string[],
  options: ResolveValueOptions,
  fallback: number,
): number {
  const inIndex = tokens.indexOf("in");
  if (inIndex >= 0) return resolveDuration(tokens[inIndex + 1], options, fallback);

  const forIndex = tokens.indexOf("for");
  if (forIndex >= 0) return resolveDuration(tokens[forIndex + 1], options, fallback);

  return fallback;
}

export function vectorFromDirection(direction: string | undefined, amount: number): VideoLabVec3 | null {
  if (!direction) return null;

  if (direction === "up") return [0, amount, 0];
  if (direction === "down") return [0, -amount, 0];
  if (direction === "left") return [-amount, 0, 0];
  if (direction === "right") return [amount, 0, 0];
  if (direction === "front") return [0, 0, amount];
  if (direction === "back") return [0, 0, -amount];

  if (direction === "x") return [amount, 0, 0];
  if (direction === "y") return [0, amount, 0];
  if (direction === "z") return [0, 0, amount];

  return null;
}

export function normalizeAxis(value: string | undefined): "x" | "y" | "z" {
  if (value === "x" || value === "z") return value;
  return "y";
}

export function isVec3(value: VideoLabValue | unknown): value is VideoLabVec3 {
  return Array.isArray(value) && value.length === 3 && value.every((item) => typeof item === "number");
}

function parseVec3Literal(source: string, options: ResolveValueOptions): VideoLabVec3 {
  const body = source.slice(1, -1).trim();
  const parts = body.split(",").map((item) => item.trim());

  return [
    resolveNumber(parts[0], options, 0),
    resolveNumber(parts[1], options, 0),
    resolveNumber(parts[2], options, 0),
  ];
}

function parseNumberish(source: string): number {
  const normalized = source.trim();

  if (normalized.endsWith("s")) {
    return Number(normalized.slice(0, -1));
  }

  if (normalized.endsWith("ms")) {
    const ms = Number(normalized.slice(0, -2));
    return Number.isFinite(ms) ? ms / 1000 : Number.NaN;
  }

  return Number(normalized);
}

function stripOuterWhitespace(value: string): string {
  return value.trim();
}

function isQuoted(value: string): boolean {
  return (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"));
}

function unquote(value: string): string {
  return value.slice(1, -1);
}

function isVec3Literal(value: string): boolean {
  return value.startsWith("[") && value.endsWith("]");
}