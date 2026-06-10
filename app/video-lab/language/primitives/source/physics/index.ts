import { FIELD_PRIMITIVES } from "./fields";
import { MECHANICS_PRIMITIVES } from "./mechanics";
import { OPTICS_PRIMITIVES } from "./optics";
import { PARTICLE_PRIMITIVES } from "./particles";
import { WAVE_PRIMITIVES } from "./waves";

export * from "./fields";
export * from "./mechanics";
export * from "./optics";
export * from "./particles";
export * from "./waves";

export const PHYSICS_SOURCE_PRIMITIVES = [
  ...WAVE_PRIMITIVES,
  ...MECHANICS_PRIMITIVES,
  ...FIELD_PRIMITIVES,
  ...OPTICS_PRIMITIVES,
  ...PARTICLE_PRIMITIVES,
];
