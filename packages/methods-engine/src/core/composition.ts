import type {
  OperatorCompositionComparisonSpec,
  OperatorCompositionEdgeSpec,
  OperatorCompositionMetricSpec,
  OperatorCompositionNodeRole,
  OperatorCompositionNodeSpec,
  OperatorCompositionSpec,
  OperatorCompositionValidation,
  OperatorFamilyId,
  OperatorGrammarId,
  OperatorRegistry,
} from "./types";

export function createOperatorNodeFromRegistry(
  registry: OperatorRegistry,
  input: {
    id?: string;
    familyId: OperatorFamilyId;
    schemeId: string;
    role?: OperatorCompositionNodeRole;
    summary?: string;
  },
): OperatorCompositionNodeSpec {
  const family = registry.familiesById[input.familyId];
  if (!family) {
    throw new Error(`Unknown operator family: ${input.familyId}`);
  }

  const scheme = family.schemes.find((item) => item.id === input.schemeId);
  if (!scheme) {
    throw new Error(`Unknown scheme "${input.schemeId}" in family "${family.id}".`);
  }

  return {
    id: input.id ?? `${family.id}:${scheme.id}`,
    familyId: family.id,
    familyName: family.name,
    schemeId: scheme.id,
    schemeName: scheme.name,
    visualGrammar: family.visualGrammar,
    color: scheme.color,
    formula: scheme.formula,
    role: input.role ?? inferNodeRole(family.id),
    summary: input.summary ?? scheme.geometry,
  };
}

export function createOperatorCompositionEdge(
  input: Pick<OperatorCompositionEdgeSpec, "from" | "to" | "channel"> & Partial<Omit<OperatorCompositionEdgeSpec, "from" | "to" | "channel">>,
): OperatorCompositionEdgeSpec {
  return {
    id: input.id ?? `${input.from}->${input.to}:${input.channel}`,
    from: input.from,
    to: input.to,
    channel: input.channel,
    label: input.label,
  };
}

export function createCompositionMetric(
  input: OperatorCompositionMetricSpec,
): OperatorCompositionMetricSpec {
  return input;
}

export function createCompositionComparison(
  input: OperatorCompositionComparisonSpec,
): OperatorCompositionComparisonSpec {
  return input;
}

export function defineOperatorComposition(
  input: Omit<OperatorCompositionSpec, "visualGrammar"> & { visualGrammar?: OperatorGrammarId },
): OperatorCompositionSpec {
  return {
    ...input,
    visualGrammar: input.visualGrammar ?? deriveCompositionGrammar(input.operators),
  };
}

export function validateOperatorComposition(
  composition: OperatorCompositionSpec,
  registry?: OperatorRegistry,
): OperatorCompositionValidation {
  const issues: string[] = [];
  const warnings: string[] = [];
  const nodeIds = new Set<string>();
  const familyIds = new Set<OperatorFamilyId>();
  const grammars = new Set<OperatorGrammarId>();

  composition.operators.forEach((node) => {
    if (nodeIds.has(node.id)) {
      issues.push(`Duplicate operator node id: ${node.id}`);
    }
    nodeIds.add(node.id);
    familyIds.add(node.familyId);
    grammars.add(node.visualGrammar);

    if (registry) {
      const family = registry.familiesById[node.familyId];
      if (!family) {
        issues.push(`Unknown family in composition: ${node.familyId}`);
      } else if (!family.schemes.some((scheme) => scheme.id === node.schemeId)) {
        issues.push(`Unknown scheme "${node.schemeId}" for family "${node.familyId}".`);
      }
    }
  });

  composition.connections.forEach((edge) => {
    if (!nodeIds.has(edge.from)) issues.push(`Edge source missing: ${edge.from}`);
    if (!nodeIds.has(edge.to)) issues.push(`Edge target missing: ${edge.to}`);
    if (edge.from === edge.to) warnings.push(`Self-loop edge detected on "${edge.from}".`);
  });

  if (composition.mode !== "comparison" && composition.operators.length > 1 && composition.connections.length === 0) {
    warnings.push("Multi-operator composition has no connections yet.");
  }

  if (composition.mode === "comparison" && composition.comparisons && composition.comparisons.length === 0) {
    warnings.push("Comparison composition has no comparison entries.");
  }

  if (!composition.operators.some((node) => node.role === "analyzer")) {
    warnings.push("No analyzer node present; workbench may show structure without diagnostics.");
  }

  if (composition.visualGrammar !== deriveCompositionGrammar(composition.operators)) {
    warnings.push("Composition visual grammar is overridden from the dominant operator grammar.");
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings,
    operatorCount: composition.operators.length,
    connectionCount: composition.connections.length,
    familyIds: [...familyIds],
    grammars: [...grammars],
    isCrossFamily: familyIds.size > 1,
  };
}

export function summarizeOperatorComposition(composition: OperatorCompositionSpec) {
  const validation = validateOperatorComposition(composition);
  return {
    id: composition.id,
    name: composition.name,
    mode: composition.mode,
    visualGrammar: composition.visualGrammar,
    operatorCount: validation.operatorCount,
    connectionCount: validation.connectionCount,
    familyCount: validation.familyIds.length,
    isCrossFamily: validation.isCrossFamily,
    warnings: validation.warnings,
  };
}

function deriveCompositionGrammar(operators: readonly OperatorCompositionNodeSpec[]): OperatorGrammarId {
  if (operators.length === 0) return "trajectory-flow";

  const counts = new Map<OperatorGrammarId, number>();
  operators.forEach((node) => {
    counts.set(node.visualGrammar, (counts.get(node.visualGrammar) ?? 0) + 1);
  });

  let winner = operators[0]!.visualGrammar;
  let bestCount = counts.get(winner) ?? 0;
  counts.forEach((count, grammar) => {
    if (count > bestCount) {
      winner = grammar;
      bestCount = count;
    }
  });
  return winner;
}

function inferNodeRole(familyId: OperatorFamilyId): OperatorCompositionNodeRole {
  if (familyId === "probability" || familyId === "matrix") return "transform";
  if (familyId === "optimization" || familyId === "root-finding") return "analyzer";
  return "transform";
}
