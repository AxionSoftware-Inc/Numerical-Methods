import {
  buildIntegrationTrace,
  buildInterpolationTrace,
  buildMatrixTrace,
  buildOptimizationTrace,
  buildPdeTrace,
  buildProbabilityTrace,
  buildRootFindingTrace,
  buildTrace,
  createAreaIntegralWorkbenchArtifact,
  createInterpolationWorkbenchArtifact,
  createMatrixWorkbenchArtifact,
  createOdeWorkbenchArtifact,
  createOptimizationWorkbenchArtifact,
  createPdeWorkbenchArtifact,
  createProbabilityWorkbenchArtifact,
  createRootFindingWorkbenchArtifact,
  type OperatorFamilyId,
  type OperatorWorkbenchArtifact,
} from "../core";
import { integrationExamples, integrationMethods } from "./integration";
import { interpolationExamples, interpolationMethods } from "../core/interpolation";
import { matrixExamples, matrixMethods } from "../core/matrix";
import { optimizationExamples, optimizationMethods } from "../core/optimization";
import { pdeExamples, pdeMethods } from "./pde";
import { probabilityExamples, probabilityMethods } from "../core/probability";
import { rootFindingExamples, rootFindingMethods } from "../core/root-finding";
import { examples, methods } from "./ode";
import { operatorFamiliesById } from "./operators";

export type WorkbenchCatalogEntry = {
  familyId: OperatorFamilyId;
  familyName: string;
  summary: string;
  readiness: "prototype" | "partial" | "ready";
  centralVisual: boolean;
  methods: Array<{ id: string; name: string; color: string }>;
  examples: Array<{ id: string; name: string }>;
};

export type WorkbenchSelection = {
  familyId: OperatorFamilyId;
  methodId: string;
  exampleId: string;
};

export const workbenchCatalog: WorkbenchCatalogEntry[] = [
  {
    familyId: "ode",
    familyName: operatorFamiliesById.ode.name,
    summary: operatorFamiliesById.ode.summary,
    readiness: operatorFamiliesById.ode.workbench?.readiness ?? "prototype",
    centralVisual: operatorFamiliesById.ode.workbench?.centralVisual ?? false,
    methods: methods.map((item) => ({ id: item.id, name: item.name, color: item.color })),
    examples: examples.map((item) => ({ id: item.id, name: item.name })),
  },
  {
    familyId: "integral",
    familyName: operatorFamiliesById.integral.name,
    summary: operatorFamiliesById.integral.summary,
    readiness: operatorFamiliesById.integral.workbench?.readiness ?? "prototype",
    centralVisual: operatorFamiliesById.integral.workbench?.centralVisual ?? false,
    methods: integrationMethods.map((item) => ({ id: item.id, name: item.name, color: item.color })),
    examples: integrationExamples.map((item) => ({ id: item.id, name: item.name })),
  },
  {
    familyId: "pde",
    familyName: operatorFamiliesById.pde.name,
    summary: operatorFamiliesById.pde.summary,
    readiness: operatorFamiliesById.pde.workbench?.readiness ?? "prototype",
    centralVisual: operatorFamiliesById.pde.workbench?.centralVisual ?? false,
    methods: pdeMethods.map((item) => ({ id: item.id, name: item.name, color: item.color })),
    examples: pdeExamples.map((item) => ({ id: item.id, name: item.name })),
  },
  {
    familyId: "matrix",
    familyName: operatorFamiliesById.matrix.name,
    summary: operatorFamiliesById.matrix.summary,
    readiness: operatorFamiliesById.matrix.workbench?.readiness ?? "prototype",
    centralVisual: operatorFamiliesById.matrix.workbench?.centralVisual ?? false,
    methods: matrixMethods.map((item) => ({ id: item.id, name: item.name, color: item.color })),
    examples: matrixExamples.map((item) => ({ id: item.id, name: item.name })),
  },
  {
    familyId: "root-finding",
    familyName: operatorFamiliesById["root-finding"].name,
    summary: operatorFamiliesById["root-finding"].summary,
    readiness: operatorFamiliesById["root-finding"].workbench?.readiness ?? "prototype",
    centralVisual: operatorFamiliesById["root-finding"].workbench?.centralVisual ?? false,
    methods: rootFindingMethods.map((item) => ({ id: item.id, name: item.name, color: item.color })),
    examples: rootFindingExamples.map((item) => ({ id: item.id, name: item.name })),
  },
  {
    familyId: "optimization",
    familyName: operatorFamiliesById.optimization.name,
    summary: operatorFamiliesById.optimization.summary,
    readiness: operatorFamiliesById.optimization.workbench?.readiness ?? "prototype",
    centralVisual: operatorFamiliesById.optimization.workbench?.centralVisual ?? false,
    methods: optimizationMethods.map((item) => ({ id: item.id, name: item.name, color: item.color })),
    examples: optimizationExamples.map((item) => ({ id: item.id, name: item.name })),
  },
  {
    familyId: "probability",
    familyName: operatorFamiliesById.probability.name,
    summary: operatorFamiliesById.probability.summary,
    readiness: operatorFamiliesById.probability.workbench?.readiness ?? "prototype",
    centralVisual: operatorFamiliesById.probability.workbench?.centralVisual ?? false,
    methods: probabilityMethods.map((item) => ({ id: item.id, name: item.name, color: item.color })),
    examples: probabilityExamples.map((item) => ({ id: item.id, name: item.name })),
  },
  {
    familyId: "interpolation",
    familyName: operatorFamiliesById.interpolation.name,
    summary: operatorFamiliesById.interpolation.summary,
    readiness: operatorFamiliesById.interpolation.workbench?.readiness ?? "prototype",
    centralVisual: operatorFamiliesById.interpolation.workbench?.centralVisual ?? false,
    methods: interpolationMethods.map((item) => ({ id: item.id, name: item.name, color: item.color })),
    examples: interpolationExamples.map((item) => ({ id: item.id, name: item.name })),
  },
];

export const defaultWorkbenchSelectionByFamily: Record<OperatorFamilyId, WorkbenchSelection> = {
  ode: { familyId: "ode", methodId: methods[0]!.id, exampleId: examples[0]!.id },
  integral: { familyId: "integral", methodId: integrationMethods[0]!.id, exampleId: integrationExamples[0]!.id },
  pde: { familyId: "pde", methodId: pdeMethods[0]!.id, exampleId: pdeExamples[0]!.id },
  matrix: { familyId: "matrix", methodId: matrixMethods[0]!.id, exampleId: matrixExamples[0]!.id },
  "root-finding": { familyId: "root-finding", methodId: rootFindingMethods[0]!.id, exampleId: rootFindingExamples[0]!.id },
  optimization: { familyId: "optimization", methodId: optimizationMethods[0]!.id, exampleId: optimizationExamples[0]!.id },
  probability: { familyId: "probability", methodId: probabilityMethods[0]!.id, exampleId: probabilityExamples[0]!.id },
  interpolation: { familyId: "interpolation", methodId: interpolationMethods[0]!.id, exampleId: interpolationExamples[0]!.id },
};

export function buildPresetWorkbenchArtifact(selection: WorkbenchSelection): OperatorWorkbenchArtifact {
  if (selection.familyId === "ode") {
    const method = methods.find((item) => item.id === selection.methodId) ?? methods[0]!;
    const example = examples.find((item) => item.id === selection.exampleId) ?? examples[0]!;
    const trace = buildTrace(method, example, example.defaultStep);
    const comparisons = methods.filter((item) => item.id !== method.id).map((item) => buildTrace(item, example, example.defaultStep));
    return createOdeWorkbenchArtifact(trace, comparisons);
  }

  if (selection.familyId === "integral") {
    const method = integrationMethods.find((item) => item.id === selection.methodId) ?? integrationMethods[0]!;
    const example = integrationExamples.find((item) => item.id === selection.exampleId) ?? integrationExamples[0]!;
    const trace = buildIntegrationTrace(method, example, example.defaultPanels);
    const comparisons = integrationMethods.filter((item) => item.id !== method.id).map((item) => buildIntegrationTrace(item, example, example.defaultPanels));
    return createAreaIntegralWorkbenchArtifact(trace, comparisons);
  }

  if (selection.familyId === "pde") {
    const method = pdeMethods.find((item) => item.id === selection.methodId) ?? pdeMethods[0]!;
    const example = pdeExamples.find((item) => item.id === selection.exampleId) ?? pdeExamples[0]!;
    const trace = buildPdeTrace(method, example, example.defaultCells, example.defaultTimeSteps);
    const comparisons = pdeMethods.filter((item) => item.id !== method.id).map((item) => buildPdeTrace(item, example, example.defaultCells, example.defaultTimeSteps));
    return createPdeWorkbenchArtifact(trace, comparisons);
  }

  if (selection.familyId === "matrix") {
    const method = matrixMethods.find((item) => item.id === selection.methodId) ?? matrixMethods[0]!;
    const example = matrixExamples.find((item) => item.id === selection.exampleId) ?? matrixExamples[0]!;
    const trace = buildMatrixTrace(method, example, { iterations: example.defaultIterations });
    const comparisons = matrixMethods.filter((item) => item.id !== method.id && item.mode === method.mode).map((item) => buildMatrixTrace(item, example, { iterations: example.defaultIterations }));
    return createMatrixWorkbenchArtifact(trace, comparisons);
  }

  if (selection.familyId === "root-finding") {
    const method = rootFindingMethods.find((item) => item.id === selection.methodId) ?? rootFindingMethods[0]!;
    const example = rootFindingExamples.find((item) => item.id === selection.exampleId) ?? rootFindingExamples[0]!;
    const trace = buildRootFindingTrace(method, example, { iterations: example.defaultIterations });
    const comparisons = rootFindingMethods.filter((item) => item.id !== method.id).map((item) => buildRootFindingTrace(item, example, { iterations: example.defaultIterations }));
    return createRootFindingWorkbenchArtifact(trace, comparisons, {
      equation: example.equation,
      xRange: example.xRange,
      evaluate: example.evaluate,
      exactRoot: example.exactRoot,
    });
  }

  if (selection.familyId === "optimization") {
    const method = optimizationMethods.find((item) => item.id === selection.methodId) ?? optimizationMethods[0]!;
    const example = optimizationExamples.find((item) => item.id === selection.exampleId) ?? optimizationExamples[0]!;
    const trace = buildOptimizationTrace(method, example, { stepSize: example.defaultStep, iterations: example.defaultIterations });
    const comparisons = optimizationMethods.filter((item) => item.id !== method.id).map((item) => buildOptimizationTrace(item, example, { stepSize: example.defaultStep, iterations: example.defaultIterations }));
    return createOptimizationWorkbenchArtifact(trace, example, comparisons);
  }

  if (selection.familyId === "probability") {
    const method = probabilityMethods.find((item) => item.id === selection.methodId) ?? probabilityMethods[0]!;
    const example = probabilityExamples.find((item) => item.id === selection.exampleId) ?? probabilityExamples[0]!;
    const trace = buildProbabilityTrace(method, example, {
      steps: example.defaultSteps,
      pathCount: example.defaultPaths,
      drift: example.drift,
      volatility: example.volatility,
      seed: 42,
    });
    const comparisons = probabilityMethods
      .filter((item) => item.id !== method.id)
      .map((item) => buildProbabilityTrace(item, example, { steps: example.defaultSteps, pathCount: example.defaultPaths, drift: example.drift, volatility: example.volatility, seed: 42 }));
    return createProbabilityWorkbenchArtifact(trace, comparisons);
  }

  const method = interpolationMethods.find((item) => item.id === selection.methodId) ?? interpolationMethods[0]!;
  const example = interpolationExamples.find((item) => item.id === selection.exampleId) ?? interpolationExamples[0]!;
  const trace = buildInterpolationTrace(method, example, { nodeCount: example.defaultNodes });
  const comparisons = interpolationMethods.filter((item) => item.id !== method.id).map((item) => buildInterpolationTrace(item, example, { nodeCount: example.defaultNodes }));
  return createInterpolationWorkbenchArtifact(trace, comparisons, {
    formula: example.formula,
    xRange: example.xRange,
    yRange: example.yRange,
  });
}
