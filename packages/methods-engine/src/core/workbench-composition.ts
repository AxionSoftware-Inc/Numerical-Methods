import { createCompositionComparison, createCompositionMetric, createOperatorCompositionEdge, createOperatorNodeFromRegistry, defineOperatorComposition } from "./composition";
import type { OperatorCompositionMode, OperatorCompositionSpec, OperatorRegistry } from "./types";
import type { OperatorWorkbenchArtifact } from "./workbench-contract";

export function createCompositionFromWorkbenchArtifacts(
  artifacts: readonly OperatorWorkbenchArtifact[],
  registry: OperatorRegistry,
  options: {
    id?: string;
    name?: string;
    mode?: OperatorCompositionMode;
    summary?: string;
    nodeIds?: string[];
    connections?: Array<{ from: string; to: string }>;
  } = {},
): OperatorCompositionSpec {
  const mode = options.mode ?? (artifacts.length > 1 ? "comparison" : "pipeline");
  const nodeIds = options.nodeIds ?? artifacts.map((artifact, index) => `${artifact.familyId}:${artifact.methodId}:${index}`);
  const operators = artifacts.map((artifact, index) =>
    createOperatorNodeFromRegistry(registry, {
      id: nodeIds[index] ?? `${artifact.familyId}:${artifact.methodId}:${index}`,
      familyId: artifact.familyId,
      schemeId: artifact.methodId,
      role: index === 0 ? "source" : index === artifacts.length - 1 ? "analyzer" : "transform",
      summary: artifact.summary,
    }),
  );
  const artifactsByNodeId = new Map(operators.map((node, index) => [node.id, artifacts[index]!]));

  const connections =
    mode === "comparison"
      ? []
      : (options.connections && options.connections.length > 0
          ? options.connections
          : operators.slice(0, -1).map((node, index) => ({
              from: node.id,
              to: operators[index + 1]!.id,
            }))
        ).map((edge) => {
          const left = artifactsByNodeId.get(edge.from) ?? artifacts[0]!;
          const right = artifactsByNodeId.get(edge.to) ?? artifacts[0]!;
          return createOperatorCompositionEdge({
            from: edge.from,
            to: edge.to,
            channel: inferChannel(right),
            label: inferEdgeLabel(left, right),
          });
        });

  const comparisons =
    mode === "comparison" && operators.length > 1
      ? operators.slice(1).map((node, index) => {
          const baselineArtifact = artifacts[0]!;
          const candidateArtifact = artifacts[index + 1]!;
          return createCompositionComparison({
            baselineNodeId: operators[0]!.id,
            candidateNodeId: node.id,
            label: `${baselineArtifact.methodName} vs ${candidateArtifact.methodName}`,
            summary: `${candidateArtifact.familyName} family ichida operator xulqi va diagnostika farqi.`,
            metrics: candidateArtifact.diagnostics.slice(0, 3).map((item) =>
              createCompositionMetric({
                id: `${candidateArtifact.methodId}:${item.id}`,
                label: item.label,
                value: item.value,
                unit: item.display.replace(/[0-9eE.+-]/g, "").trim() || undefined,
                emphasis: item.emphasis,
                summary: item.interpretation,
              }),
            ),
          });
        })
      : [];

  return defineOperatorComposition({
    id: options.id ?? `workbench-${artifacts.map((item) => item.methodId).join("-")}`,
    name: options.name ?? buildCompositionName(artifacts, mode),
    mode,
    summary: options.summary ?? buildCompositionSummary(artifacts, mode),
    operators,
    connections,
    comparisons,
    focusFamilyId: artifacts[0]?.familyId,
  });
}

function buildCompositionName(artifacts: readonly OperatorWorkbenchArtifact[], mode: OperatorCompositionMode) {
  if (artifacts.length === 0) return "Empty workbench composition";
  if (mode === "comparison") return `${artifacts[0]!.familyName} comparison`;
  if (mode === "fused") return `${artifacts[0]!.familyName} fused pipeline`;
  return `${artifacts[0]!.familyName} operator pipeline`;
}

function buildCompositionSummary(artifacts: readonly OperatorWorkbenchArtifact[], mode: OperatorCompositionMode) {
  if (artifacts.length === 0) return "No operators selected yet.";
  if (mode === "comparison") return "Bir nechta operator yoki metod bitta canvas'da yonma-yon tahlil qilinadi.";
  if (mode === "fused") return "Ketma-ket operatorlar fused execution modeli sifatida ko'riladi.";
  return "Operatorlar ketma-ket pipeline tarzida ulanadi va umumiy tahlil qilinadi.";
}

function inferChannel(artifact: OperatorWorkbenchArtifact) {
  if (artifact.familyId === "matrix") return "residual";
  if (artifact.familyId === "probability") return "samples";
  if (artifact.familyId === "optimization") return "diagnostic";
  if (artifact.familyId === "pde") return "geometry";
  return "state";
}

function inferEdgeLabel(left: OperatorWorkbenchArtifact, right: OperatorWorkbenchArtifact) {
  if (left.familyId === right.familyId) return `${left.familyId} handoff`;
  return `${left.familyId} -> ${right.familyId}`;
}
