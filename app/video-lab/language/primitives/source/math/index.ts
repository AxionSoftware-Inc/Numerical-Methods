import { CALCULUS_PRIMITIVES } from "./calculus";
import { COMPLEX_PRIMITIVES } from "./complex";
import { FUNCTION_PRIMITIVES } from "./functions";
import { GEOMETRY_PRIMITIVES } from "./geometry";
import { LINEAR_ALGEBRA_PRIMITIVES } from "./linearAlgebra";
import { SURFACE_PRIMITIVES } from "./surfaces";

export * from "./calculus";
export * from "./complex";
export * from "./functions";
export * from "./geometry";
export * from "./linearAlgebra";
export * from "./surfaces";

export const MATH_SOURCE_PRIMITIVES = [
  ...FUNCTION_PRIMITIVES,
  ...CALCULUS_PRIMITIVES,
  ...LINEAR_ALGEBRA_PRIMITIVES,
  ...GEOMETRY_PRIMITIVES,
  ...SURFACE_PRIMITIVES,
  ...COMPLEX_PRIMITIVES,
];
