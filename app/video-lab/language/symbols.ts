import { tokenizeVideoLabSource } from "./tokenize";
import { parseAssignment } from "./values";
import {
  getVideoLabPrimitive,
  listVideoLabPrimitiveKeywords,
} from "./primitives";

export type VideoLabSymbolKind = "variable" | "object";

export type VideoLabSymbol = {
  name: string;
  kind: VideoLabSymbolKind;
  lineNumber: number;
  source: string;
};

export type VideoLabSymbolTable = {
  variables: Map<string, VideoLabSymbol>;
  objects: Map<string, VideoLabSymbol>;
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
  "graph",
  "box",
  "plane",
  "path",
  "point",
  "marker",
  "arrow",
  "tangent",

  "electric_field",
"efield",
"electricfield",
  ...listVideoLabPrimitiveKeywords(),
]);

export function collectVideoLabSymbols(source: string): VideoLabSymbolTable {
  const variables = new Map<string, VideoLabSymbol>();
  const objects = new Map<string, VideoLabSymbol>();

  for (const line of tokenizeVideoLabSource(source)) {
    if (line.isEmpty || line.isComment) continue;

    const assignment = parseAssignment(line.line);

    if (assignment) {
      variables.set(assignment.name, {
        name: assignment.name,
        kind: "variable",
        lineNumber: line.lineNumber,
        source: line.line,
      });

      continue;
    }

    const command = line.tokens[0];

    if (!command || !OBJECT_COMMANDS.has(command)) continue;

    const objectIds = objectIdsFromCommand(command, line.tokens);

    for (const objectId of objectIds) {
      objects.set(objectId, {
        name: objectId,
        kind: "object",
        lineNumber: line.lineNumber,
        source: line.line,
      });
    }
  }

  addBuiltinObjects(objects);

  return {
    variables,
    objects,
  };
}

export function symbolNames(symbols: Map<string, VideoLabSymbol>): string[] {
  return [...symbols.keys()].sort();
}

function objectIdsFromCommand(command: string, tokens: string[]): string[] {
  const primitive = getVideoLabPrimitive(command);

  if (primitive?.createsObject) {
    return tokens[1] ? [tokens[1]] : [];
  }
  if (command === "title") return ["title"];
  if (command === "subtitle") return ["title", "subtitle"];
  if (command === "grid") return ["grid"];
  if (command === "axes") return ["axes"];
  if (command === "riemann") return [tokens[1] ?? "columns"];

  if (
    command === "formula" ||
    command === "tex" ||
    command === "text" ||
    command === "graph" ||
    command === "box" ||
    command === "plane" ||
    command === "path" ||
    command === "point" ||
    command === "marker" ||
    command === "arrow"
  ) {
    return tokens[1] ? [tokens[1]] : [];
  }

  return [];
}

function addBuiltinObjects(objects: Map<string, VideoLabSymbol>): void {
  const builtins = ["title", "grid", "axes"];

  for (const name of builtins) {
    if (objects.has(name)) continue;

    objects.set(name, {
      name,
      kind: "object",
      lineNumber: 0,
      source: "builtin",
    });
  }
}
