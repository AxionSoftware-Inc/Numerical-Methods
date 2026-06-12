"use client";

export { MethodScene } from "./MethodScene";
export { IntegrationScene } from "./IntegrationScene";
export { MultiIntegralScene } from "./MultiIntegralScene";
export { PdeScene } from "./PdeScene";
export { VisualScene } from "./VisualScene";
export { VisualViewportControls } from "./VisualViewportControls";

export {
  applyVisualSceneStyle,
  renderVisualSceneSpec,
} from "./renderVisualScene";

export type {
  ComparisonTrace,
  MethodSceneProps,
} from "./MethodScene";

export type {
  IntegrationComparisonTrace,
  IntegrationSceneProps,
} from "./IntegrationScene";

export type {
  MultiIntegralSceneProps,
} from "./MultiIntegralScene";

export type {
  PdeSceneProps,
} from "./PdeScene";

export type {
  VisualSceneProps,
} from "./VisualScene";

export type {
  ViewportAction,
  VisualCameraPose,
  VisualViewportControlsOptions,
} from "./VisualViewportControls";
