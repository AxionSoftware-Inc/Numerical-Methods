export * from "./core/primitiveTypes";
export * from "./core/quality";
export * from "./core/stylePresets";
export * from "./renderers/surfaceRenderer";

export * from "./math";
export * from "./physics";

import { MATH_SOURCE_PRIMITIVES } from "./math";
import { PHYSICS_SOURCE_PRIMITIVES } from "./physics";

export const VIDEO_LAB_SOURCE_PRIMITIVES = [
  ...MATH_SOURCE_PRIMITIVES,
  ...PHYSICS_SOURCE_PRIMITIVES,
];

export function sourcePrimitiveNames(): string[] {
  return VIDEO_LAB_SOURCE_PRIMITIVES.map((primitive) => primitive.name).sort();
}

export function sourcePrimitiveKeywords(): string[] {
  const keywords = new Set<string>();

  VIDEO_LAB_SOURCE_PRIMITIVES.forEach((primitive) => {
    keywords.add(primitive.name);
    primitive.aliases?.forEach((alias: string) => keywords.add(alias));
  });

  return [...keywords].sort();
}
