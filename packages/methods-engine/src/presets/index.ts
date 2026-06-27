export { methods, examples } from "./ode";
export {
  integrationExamples,
  integrationMethods,
  surfaceIntegralExamples,
  surfaceIntegrationMethods,
  volumeIntegralExamples,
  volumeIntegrationMethods,
} from "./integration";
export { interpolationExamples, interpolationMethods } from "../core/interpolation";
export { matrixExamples, matrixMethods } from "../core/matrix";
export { optimizationExamples, optimizationMethods } from "../core/optimization";
export { pdeExamples, pdeMethods } from "./pde";
export { probabilityExamples, probabilityMethods } from "../core/probability";
export { rootFindingExamples, rootFindingMethods } from "../core/root-finding";
export { operatorFamilies, operatorFamiliesById, operatorRegistry } from "./operators";
export { buildPresetWorkbenchArtifact, defaultWorkbenchSelectionByFamily, workbenchCatalog } from "./workbench";
export type { WorkbenchCatalogEntry, WorkbenchSelection } from "./workbench";
