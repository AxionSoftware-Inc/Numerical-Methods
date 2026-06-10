import { areaSourcePrimitive, numberLineSourcePrimitive, parametricSourcePrimitive } from "./surfaces";
import type { SourcePrimitive } from "../core/primitiveTypes";

export const FUNCTION_PRIMITIVES: SourcePrimitive[] = [
  areaSourcePrimitive,
  numberLineSourcePrimitive,
  parametricSourcePrimitive,
];
