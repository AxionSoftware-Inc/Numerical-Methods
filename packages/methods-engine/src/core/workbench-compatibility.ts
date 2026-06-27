import type {
  OperatorCompositionMode,
  OperatorWorkbenchCompatibility,
  OperatorWorkbenchPreviewMode,
} from "./types";
import type { OperatorWorkbenchArtifact } from "./workbench-contract";

export function evaluateWorkbenchCompatibility(
  artifacts: readonly OperatorWorkbenchArtifact[],
  mode: OperatorCompositionMode,
): OperatorWorkbenchCompatibility {
  if (artifacts.length <= 1) {
    return {
      kind: "compatible",
      previewMode: "overlay",
      reason: "Bitta artifact uchun markaziy sahna to'g'ridan-to'g'ri ko'rsatiladi.",
      warnings: [],
      sharedFamily: true,
      sharedGrammar: true,
    };
  }

  const familyIds = new Set(artifacts.map((item) => item.familyId));
  const grammars = new Set(artifacts.map((item) => item.visual.visualGrammar));
  const sceneKinds = new Set(artifacts.map((item) => item.visual.sceneKind));
  const sharedFamily = familyIds.size === 1;
  const sharedGrammar = grammars.size === 1;
  const warnings: string[] = [];

  if (mode === "comparison") {
    if (sharedFamily && artifacts.every((item) => item.visual.supportsComparison)) {
      return {
        kind: "compatible",
        previewMode: "overlay",
        reason: "Bir xil family va comparison support mavjud, shu sabab overlay yoki unified comparison sahna xavfsiz.",
        warnings,
        sharedFamily,
        sharedGrammar,
      };
    }

    if (sharedGrammar || sceneKinds.size === 1) {
      warnings.push("Semantik koordinata to'liq bir xil emas, shu sabab preview split panelga ajratildi.");
      return {
        kind: "comparable",
        previewMode: "split",
        reason: "Operatorlar yonma-yon taqqoslash uchun mos, lekin bitta koordinata sahnaga ustma-ust bostirish tavsiya etilmaydi.",
        warnings,
        sharedFamily,
        sharedGrammar,
      };
    }

    warnings.push("Turli family va turli visual grammar bitta sahnada ko'rsatilsa chalg'itadi.");
    return {
      kind: "incompatible",
      previewMode: "graph-only",
      reason: "Bu tanlov graph relation sifatida foydali, lekin markaziy preview alohida sahnalarga ajratilishi kerak.",
      warnings,
      sharedFamily,
      sharedGrammar,
    };
  }

  if (sharedFamily && artifacts.every((item) => item.visual.supportsComposition)) {
    return {
      kind: "compatible",
      previewMode: "overlay",
      reason: "Bir xil family ichida pipeline/fused composition umumiy state fazoda talqin qilinishi mumkin.",
      warnings,
      sharedFamily,
      sharedGrammar,
    };
  }

  if (isCrossFamilyPipelineAllowed(artifacts)) {
    warnings.push("Cross-family composition umumiy sahna emas, split preview bilan ko'rsatiladi.");
    return {
      kind: "comparable",
      previewMode: "split",
      reason: "Operatorlar pipeline graph sifatida ulanadi, lekin individual preview alohida panelda saqlanadi.",
      warnings,
      sharedFamily,
      sharedGrammar,
    };
  }

  warnings.push("Bu composition state-space mosligi isbotlanmagan, shuning uchun faqat graph-only preview ruxsat etildi.");
  return {
    kind: "incompatible",
    previewMode: "graph-only",
    reason: "Operatorlar graph'da bog'lanishi mumkin, lekin bitta markaziy fazoda ko'rsatish xavfli.",
    warnings,
    sharedFamily,
    sharedGrammar,
  };
}

export function prefersGraphOverlay(previewMode: OperatorWorkbenchPreviewMode) {
  return previewMode === "overlay" || previewMode === "graph-only";
}

export function evaluateWorkbenchConnectionCompatibility(
  fromArtifact: OperatorWorkbenchArtifact,
  toArtifact: OperatorWorkbenchArtifact,
  mode: Extract<OperatorCompositionMode, "pipeline" | "fused"> = "pipeline",
) {
  return evaluateWorkbenchCompatibility([fromArtifact, toArtifact], mode);
}

function isCrossFamilyPipelineAllowed(artifacts: readonly OperatorWorkbenchArtifact[]) {
  const familyChain = artifacts.map((item) => item.familyId);
  return familyChain.every((familyId, index) => {
    if (index === 0) return true;
    const previous = familyChain[index - 1]!;
    return allowedTransitions.some(([left, right]) => left === previous && right === familyId);
  });
}

const allowedTransitions: Array<[string, string]> = [
  ["matrix", "optimization"],
  ["probability", "optimization"],
  ["ode", "optimization"],
  ["integral", "probability"],
];
