import type {
  OperatorFamilySpec,
  OperatorRegistry,
  OperatorWorkbenchFamilyStatus,
  OperatorWorkbenchReadiness,
} from "./types";

export function getWorkbenchFamilyStatuses(registry: OperatorRegistry): OperatorWorkbenchFamilyStatus[] {
  return registry.families.map((family) => {
    const workbench = family.workbench ?? defaultWorkbenchCapability(family);
    return {
      familyId: family.id,
      familyName: family.name,
      readiness: workbench.readiness,
      traceScene: workbench.traceScene,
      comparison: workbench.comparison,
      benchmark: workbench.benchmark,
      customMethod: workbench.customMethod,
      composition: workbench.composition,
      centralVisual: workbench.centralVisual,
      nextFocus: workbench.nextFocus,
    };
  });
}

export function listCompositionReadyFamilies(registry: OperatorRegistry) {
  return getWorkbenchFamilyStatuses(registry).filter((family) => family.composition && family.centralVisual);
}

export function summarizeWorkbenchReadiness(registry: OperatorRegistry) {
  const statuses = getWorkbenchFamilyStatuses(registry);
  const counts = statuses.reduce<Record<OperatorWorkbenchReadiness, number>>(
    (acc, item) => {
      acc[item.readiness] += 1;
      return acc;
    },
    { prototype: 0, partial: 0, ready: 0 },
  );

  return {
    totalFamilies: statuses.length,
    readyFamilies: counts.ready,
    partialFamilies: counts.partial,
    prototypeFamilies: counts.prototype,
    compositionReadyFamilies: statuses.filter((item) => item.composition).length,
    centralVisualFamilies: statuses.filter((item) => item.centralVisual).length,
    statuses,
  };
}

function defaultWorkbenchCapability(family: OperatorFamilySpec) {
  return {
    traceScene: false,
    comparison: false,
    benchmark: false,
    customMethod: false,
    composition: false,
    centralVisual: false,
    readiness: "prototype" as const,
    nextFocus: `${family.name} family uchun workbench capability metadata hali belgilanmagan.`,
  };
}
