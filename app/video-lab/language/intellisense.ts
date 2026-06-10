import { tokenizeVideoLabSource } from "./tokenize";
import { collectVideoLabSymbols, symbolNames } from "./symbols";
import {
  getVideoLabPrimitive,
  listVideoLabPrimitiveKeywords,
} from "./primitives";
import {
  VIDEO_LAB_COLOR_PALETTE,
  VIDEO_LAB_NAMED_POSITIONS,
  parseAssignment,
} from "./values";

export type VideoLabCompletionData = {
  variables: string[];
  objects: string[];
};

export type VideoLabDiagnostic = {
  lineNumber: number;
  message: string;
};

const OBJECT_COMMANDS = new Set([
  "title",
  "subtitle",
  "formula",
  "tex",
  "text",
  "normal",
  "secant",
  "grid",
  "axes",
  "riemann",
  "grid",
  "box",
  "plane",
  "path",
  "point",
  "marker",
  "arrow",
  "tangent",
  ...listVideoLabPrimitiveKeywords(),
]);

const ANIMATION_COMMANDS = new Set([
  "write",
  "show",
  "reveal",
  "fade",
  "fadeout",
  "fade-out",
  "hide",
  "highlight",
  "indicate",
  "spin",
  "move",
  "scale",
  "rotate",
  "wait",
]);

const SETUP_COMMANDS = new Set(["scene", "duration", "fps", "camera"]);

const KNOWN_COMMANDS = new Set([
  ...OBJECT_COMMANDS,
  ...ANIMATION_COMMANDS,
  ...SETUP_COMMANDS,
]);

const TARGET_COMMANDS = new Set([
  "write",
  "show",
  "reveal",
  "fade",
  "fadeout",
  "fade-out",
  "hide",
  "highlight",
  "indicate",
  "spin",
  "move",
  "scale",
  "rotate",
]);

const PARAMETER_TOKENS = new Set([
  "at",
  "from",
  "to",
  "in",
  "for",
  "color",
  "opacity",
  "size",
  "count",
  "label",
  "points",
  "origin",
  "object",
  "scale",
  "radius",
  "height",
  "turns",
  "duration",
  "fps",
  "y",
  "x",
  "z",
  "head",
  "ylabel",
  "id",
]);

const VALUE_PARAMETER_TOKENS = new Set([
  "at",
  "from",
  "to",
  "color",
  "size",
  "count",
  "opacity",
  "radius",
  "height",
  "turns",
  "head",
  "origin",
]);

const COLOR_NAMES = new Set(Object.keys(VIDEO_LAB_COLOR_PALETTE));
const POSITION_NAMES = new Set(Object.keys(VIDEO_LAB_NAMED_POSITIONS));

export function analyzeVideoLabCode(source: string): {
  completions: VideoLabCompletionData;
  diagnostics: VideoLabDiagnostic[];
} {
  const symbols = collectVideoLabSymbols(source);
  const variables = new Set(symbolNames(symbols.variables));
  const objects = new Set(symbolNames(symbols.objects));
  const diagnostics: VideoLabDiagnostic[] = [];
  const tokenizedLines = tokenizeVideoLabSource(source);

  // Pass 1: collect variables and object ids.
  for (const line of tokenizedLines) {
    if (line.isEmpty || line.isComment) continue;

    const assignment = parseAssignment(line.line);

    if (assignment) {
      variables.add(assignment.name);
      continue;
    }

    const command = line.tokens[0];

    if (!command) continue;
    if (!KNOWN_COMMANDS.has(command)) continue;
  }

  // Common built-in object ids that are valid even if user did not explicitly create them.
  objects.add("title");
  objects.add("grid");
  objects.add("axes");

  // Pass 2: diagnostics using collected symbols.
  for (const line of tokenizedLines) {
    if (line.isEmpty || line.isComment) continue;

    const assignment = parseAssignment(line.line);

    if (assignment) continue;

    const command = line.tokens[0];

    if (!command) continue;

    if (!KNOWN_COMMANDS.has(command)) {
      diagnostics.push({
        lineNumber: line.lineNumber,
        message: withSuggestion(
          `Unknown command "${command}".`,
          command,
          [...KNOWN_COMMANDS],
        ),
      });
      continue;
    }

    diagnostics.push(
      ...diagnoseLine({
        tokens: line.tokens,
        lineNumber: line.lineNumber,
        variables,
        objects,
      }),
    );
  }

  return {
    completions: {
      variables: [...variables].sort(),
      objects: [...objects].sort(),
    },
    diagnostics: dedupeDiagnostics(diagnostics),
  };
}



function diagnoseLine({
  tokens,
  lineNumber,
  variables,
  objects,
}: {
  tokens: string[];
  lineNumber: number;
  variables: Set<string>;
  objects: Set<string>;
}): VideoLabDiagnostic[] {
  const diagnostics: VideoLabDiagnostic[] = [];
  const command = tokens[0];
  const primitive = getVideoLabPrimitive(command);

  diagnostics.push(...diagnoseRepeatedParameterValue(tokens, lineNumber, "color"));
  diagnostics.push(...diagnoseRepeatedParameterValue(tokens, lineNumber, "opacity"));
  diagnostics.push(...diagnoseRepeatedParameterValue(tokens, lineNumber, "scale"));
  diagnostics.push(...diagnoseRepeatedParameterValue(tokens, lineNumber, "radius"));

  if (TARGET_COMMANDS.has(command)) {
    const target = tokens[1];

    if (!target) {
      diagnostics.push({
        lineNumber,
        message: `Missing target. Example: ${command} title in 1s.`,
      });
    } else if (!objects.has(target)) {
      diagnostics.push({
        lineNumber,
        message: withSuggestion(
          `Unknown object "${target}".`,
          target,
          [...objects],
        ),
      });
    }
  }

  if ((command === "formula" || command === "tex") && !tokens.includes("=")) {
    diagnostics.push({
      lineNumber,
      message: `Formula should use "=". Example: formula f = "x^2" at formula.`,
    });
  }

  if (primitive?.diagnose) {
    diagnostics.push(
      ...primitive.diagnose({
        tokens,
        lineNumber,
      }),
    );
  }

  if (command === "box" && !tokens.includes("at")) {
    diagnostics.push({
      lineNumber,
      message: `Box is missing "at". Example: box cube at center size 1.`,
    });
  }

  if (command === "box" && !tokens.includes("size")) {
    diagnostics.push({
      lineNumber,
      message: `Box is missing "size". Example: box cube at center size 1.`,
    });
  }

  if (command === "plane" && !tokens.includes("at")) {
    diagnostics.push({
      lineNumber,
      message: `Plane is missing "at". Example: plane base at grid size 2.4 2.4.`,
    });
  }

  if (command === "plane" && !tokens.includes("size")) {
    diagnostics.push({
      lineNumber,
      message: `Plane is missing "size". Example: plane base at grid size 2.4 2.4.`,
    });
  }

  if (command === "arrow" && !tokens.includes("from")) {
    diagnostics.push({
      lineNumber,
      message: `Arrow is missing "from". Example: arrow v from origin to [1, 1, 0].`,
    });
  }

  if (command === "arrow" && !tokens.includes("to")) {
    diagnostics.push({
      lineNumber,
      message: `Arrow is missing "to". Example: arrow v from origin to [1, 1, 0].`,
    });
  }

  if (command === "path" && !tokens.includes("points")) {
    diagnostics.push({
      lineNumber,
      message: `Path is missing "points". Example: path p points [0,0,0] [1,1,0].`,
    });
  }

  if (command === "move") {
    const direction = tokens[2];

    if (
      direction &&
      direction !== "to" &&
      !["up", "down", "left", "right", "front", "back", "x", "y", "z"].includes(direction)
    ) {
      diagnostics.push({
        lineNumber,
        message: withSuggestion(
          `Unknown direction "${direction}".`,
          direction,
          ["up", "down", "left", "right", "front", "back", "x", "y", "z", "to"],
        ),
      });
    }
  }

  if (command === "rotate" || command === "spin") {
    const axis = tokens[2];

    if (axis && !["x", "y", "z"].includes(axis)) {
      diagnostics.push({
        lineNumber,
        message: `Unknown axis "${axis}". Use x, y, or z.`,
      });
    }
  }

  diagnostics.push(
    ...diagnosePotentialUnknownValues({
      tokens,
      lineNumber,
      variables,
      objects,
    }),
  );

  return diagnostics;
}

function diagnoseRepeatedParameterValue(
  tokens: string[],
  lineNumber: number,
  parameter: string,
): VideoLabDiagnostic[] {
  const index = tokens.indexOf(parameter);
  if (index < 0) return [];

  const value = tokens[index + 1];
  const next = tokens[index + 2];

  if (!value || !next) return [];

  if (PARAMETER_TOKENS.has(next)) return [];
  if (next === "=") return [];

  const nextLooksLikeColor = COLOR_NAMES.has(next) || /^#[0-9a-fA-F]{3,6}$/.test(next);
  const nextLooksLikePosition = POSITION_NAMES.has(next);
  const nextLooksLikeNumber = isNumberLike(next);

  if (nextLooksLikeColor || nextLooksLikePosition || nextLooksLikeNumber) {
    return [
      {
        lineNumber,
        message: `Unexpected extra value "${next}" after "${parameter} ${value}".`,
      },
    ];
  }

  return [];
}

function diagnosePotentialUnknownValues({
  tokens,
  lineNumber,
  variables,
  objects,
}: {
  tokens: string[];
  lineNumber: number;
  variables: Set<string>;
  objects: Set<string>;
}): VideoLabDiagnostic[] {
  const diagnostics: VideoLabDiagnostic[] = [];

  for (const parameter of VALUE_PARAMETER_TOKENS) {
    const index = tokens.indexOf(parameter);

    if (index < 0) continue;

    const value = tokens[index + 1];

    if (!value) continue;
    if (isKnownValue(value, variables, objects)) continue;
    if (isVectorStart(value)) continue;

    // For size, opacity, count, radius, height, turns, head: numbers are expected,
    // so unknown words are very likely mistakes.
    if (
      ["size", "opacity", "count", "radius", "height", "turns", "head"].includes(parameter)
    ) {
      if (!isNumberLike(value) && !variables.has(value)) {
        diagnostics.push({
          lineNumber,
          message: `Unexpected value "${value}" after "${parameter}". Expected a number or variable.`,
        });
      }

      continue;
    }

    // For color, unknown words are often misspelled color names.
    if (parameter === "color") {
      if (!COLOR_NAMES.has(value) && !isHexColor(value) && !variables.has(value)) {
        diagnostics.push({
          lineNumber,
          message: withSuggestion(`Unknown color "${value}".`, value, [...COLOR_NAMES]),
        });
      }

      continue;
    }

    // For position-like values, allow object ids, variables and named positions.
    if (["at", "from", "to", "origin"].includes(parameter)) {
      if (!POSITION_NAMES.has(value) && !variables.has(value) && !objects.has(value) && !isNumberLike(value)) {
        diagnostics.push({
          lineNumber,
          message: withSuggestion(
            `Unknown position or variable "${value}".`,
            value,
            [...POSITION_NAMES, ...variables, ...objects],
          ),
        });
      }
    }
  }

  return diagnostics;
}

function isKnownValue(
  value: string,
  variables: Set<string>,
  objects: Set<string>,
): boolean {
  return (
    variables.has(value) ||
    objects.has(value) ||
    POSITION_NAMES.has(value) ||
    COLOR_NAMES.has(value) ||
    isHexColor(value) ||
    isNumberLike(value)
  );
}

function isVectorStart(value: string): boolean {
  return value.startsWith("[");
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{3,6}$/.test(value);
}

function isNumberLike(value: string): boolean {
  return (
    Number.isFinite(Number(value)) ||
    /^\d+(\.\d+)?s$/.test(value) ||
    /^\d+(\.\d+)?ms$/.test(value) ||
    /^\d+(\.\d+)?deg$/.test(value) ||
    /^\d+(\.\d+)?rad$/.test(value)
  );
}

function withSuggestion(message: string, value: string, candidates: string[]): string {
  const suggestion = closest(value, candidates);

  if (!suggestion) return message;

  return `${message} Did you mean "${suggestion}"?`;
}

function closest(value: string, candidates: string[]): string | null {
  let best: { candidate: string; distance: number } | null = null;

  for (const candidate of candidates) {
    const distance = levenshtein(value, candidate);

    if (!best || distance < best.distance) {
      best = { candidate, distance };
    }
  }

  if (!best) return null;

  const maxAllowed = value.length <= 4 ? 1 : 2;

  return best.distance <= maxAllowed ? best.candidate : null;
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let row = 0; row < rows; row += 1) matrix[row][0] = row;
  for (let col = 0; col < cols; col += 1) matrix[0][col] = col;

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = a[row - 1] === b[col - 1] ? 0 : 1;

      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

function dedupeDiagnostics(diagnostics: VideoLabDiagnostic[]): VideoLabDiagnostic[] {
  const seen = new Set<string>();

  return diagnostics.filter((diagnostic) => {
    const key = `${diagnostic.lineNumber}:${diagnostic.message}`;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}
