import type {
  VideoLabPrimitive,
  VideoLabPrimitiveCompletion,
  VideoLabPrimitiveReference,
} from "./types";
import { VIDEO_LAB_SOURCE_PRIMITIVES } from "./source";
import { graphCommand } from "./math";

const graphPrimitive: VideoLabPrimitive = {
  name: graphCommand.name,
  aliases: graphCommand.aliases,
  category: "math",
  createsObject: true,
  description: graphCommand.description,
  examples: graphCommand.examples ?? [],
  completions: graphCommand.completions,
  reference: {
    id: "graph",
    title: "Graph",
    description:
      "Function graph yaratadi. Expression sample qilinib path obyektga aylantiriladi.",
    examples: [
      `graph g = sin(x) from -pi to pi color cyan`,
      `graph p = x^2 from -2 to 2 color yellow`,
      `graph line = 0.5*x + 1 from -3 to 3 color red`,
      `write g in 1s`,
    ],
  },
  compile: graphCommand.compile,
  diagnose: graphCommand.diagnose,
};

const sourcePrimitives: VideoLabPrimitive[] = VIDEO_LAB_SOURCE_PRIMITIVES.map(
  (primitive) => ({
    name: primitive.name,
    aliases: primitive.aliases,
    category: primitive.category === "geometry" ? "geometry" : primitive.category,
    createsObject: primitive.createsObject,
    description: primitive.description,
    examples: primitive.examples,
    completions: primitive.completions,
    reference: primitive.reference,
    compile: primitive.compile,
    diagnose: primitive.diagnose,
  }),
);

const VIDEO_LAB_PRIMITIVES: VideoLabPrimitive[] = [
  graphPrimitive,
  ...sourcePrimitives,
];

const primitiveMap = new Map<string, VideoLabPrimitive>();

VIDEO_LAB_PRIMITIVES.forEach((primitive) => {
  primitiveMap.set(primitive.name, primitive);

  primitive.aliases?.forEach((alias) => {
    primitiveMap.set(alias, primitive);
  });
});

export function getVideoLabPrimitive(name: string | undefined): VideoLabPrimitive | null {
  if (!name) return null;
  return primitiveMap.get(name) ?? null;
}

export function hasVideoLabPrimitive(name: string | undefined): boolean {
  return getVideoLabPrimitive(name) !== null;
}

export function listVideoLabPrimitives(): VideoLabPrimitive[] {
  const unique = new Map<string, VideoLabPrimitive>();

  primitiveMap.forEach((primitive) => {
    unique.set(primitive.name, primitive);
  });

  return [...unique.values()];
}

export function listVideoLabPrimitiveNames(): string[] {
  return listVideoLabPrimitives()
    .map((primitive) => primitive.name)
    .sort();
}

export function listVideoLabPrimitiveKeywords(): string[] {
  const keywords = new Set<string>();

  listVideoLabPrimitives().forEach((primitive) => {
    keywords.add(primitive.name);
    primitive.aliases?.forEach((alias) => keywords.add(alias));
  });

  return [...keywords].sort();
}

export function listVideoLabPrimitiveCompletions(): VideoLabPrimitiveCompletion[] {
  return listVideoLabPrimitives().flatMap((primitive) => primitive.completions ?? []);
}

export function listVideoLabPrimitiveReferences(): VideoLabPrimitiveReference[] {
  return listVideoLabPrimitives()
    .map((primitive) => primitive.reference)
    .filter((reference): reference is VideoLabPrimitiveReference => Boolean(reference));
}

export function primitiveCreatesObject(name: string | undefined): boolean {
  return getVideoLabPrimitive(name)?.createsObject === true;
}