import type { OperatorCompositionSpec } from "@methodslab/methods-engine/core";
import type { VisualLayerSpec, VisualSceneSpec, VisualVec3 } from "./types";
import {
  createArrowLayer,
  createBoundingBoxLayer,
  createGridLayer,
  createLabelLayer,
  createLineLayer,
  createSceneSpec,
} from "./scene-objects";

export type OperatorCompositionSceneOptions = {
  showMetrics?: boolean;
  showConnections?: boolean;
  showComparisons?: boolean;
};

export function createOperatorCompositionSceneSpec(
  composition: OperatorCompositionSpec,
  options: OperatorCompositionSceneOptions = {},
): VisualSceneSpec {
  const showMetrics = options.showMetrics !== false;
  const showConnections = options.showConnections !== false;
  const showComparisons = options.showComparisons !== false;
  const spacing = 1.65;
  const startX = -((Math.max(composition.operators.length - 1, 0) * spacing) / 2);
  const anchorY = 0.28;
  const nodeSize: VisualVec3 = [1.1, 0.82, 0.14];
  const nodePositions = new Map(
    composition.operators.map((node, index) => [node.id, [startX + index * spacing, anchorY, 0] as VisualVec3]),
  );
  const metricRows =
    showComparisons && composition.comparisons
      ? composition.comparisons.flatMap((comparison) => comparison.metrics ?? [])
      : [];

  const layers: VisualLayerSpec[] = [
    createGridLayer("composition-grid", { size: 6.2, divisions: 18, color: "#274255", opacity: 0.24, y: -1.12 }),
    createLabelLayer("composition-title", composition.name, [-2.9, 2.45, 1.7], "#f8fafc", {
      objectId: "composition-title",
      scale: 0.24,
      depthTest: false,
      renderOrder: 12,
    }),
    createLabelLayer("composition-mode", `${composition.mode} composition`, [-2.9, 2.1, 1.7], accentForMode(composition.mode), {
      objectId: "composition-title",
      scale: 0.12,
      depthTest: false,
      renderOrder: 12,
    }),
    createLabelLayer("composition-summary", composition.summary, [-2.9, 1.74, 1.7], "#cbd5e1", {
      objectId: "composition-title",
      scale: 0.1,
      depthTest: false,
      renderOrder: 12,
    }),
  ];

  composition.operators.forEach((node) => {
    const position = nodePositions.get(node.id)!;
    const framePosition: VisualVec3 = [position[0], position[1], -0.05];
    layers.push(
      createBoundingBoxLayer(`composition-node-${node.id}`, framePosition, nodeSize, node.color, {
        objectId: `node:${node.id}`,
        opacity: 0.68,
      }),
      createLineLayer(
        `composition-node-floor-${node.id}`,
        [
          {
            from: [position[0] - nodeSize[0] / 2, -0.48, -0.08],
            to: [position[0] + nodeSize[0] / 2, -0.48, -0.08],
          },
        ],
        node.color,
        { objectId: `node:${node.id}`, opacity: 0.35, linewidth: 2 },
      ),
      createLabelLayer(`composition-node-family-${node.id}`, node.familyName, [position[0] - 0.44, position[1] + 0.28, 0.03], "#f8fafc", {
        objectId: `node:${node.id}`,
        scale: 0.11,
      }),
      createLabelLayer(`composition-node-scheme-${node.id}`, node.schemeName, [position[0] - 0.44, position[1] + 0.05, 0.03], node.color, {
        objectId: `node:${node.id}`,
        scale: 0.1,
      }),
      createLabelLayer(`composition-node-role-${node.id}`, node.role, [position[0] - 0.44, position[1] - 0.16, 0.03], "#94a3b8", {
        objectId: `node:${node.id}`,
        scale: 0.08,
      }),
      createLabelLayer(`composition-node-formula-${node.id}`, node.formula, [position[0] - 0.44, position[1] - 0.39, 0.03], "#dbeafe", {
        objectId: `node:${node.id}`,
        scale: 0.075,
        format: "latex",
      }),
    );
  });

  if (showConnections) {
    composition.connections.forEach((edge) => {
      const from = nodePositions.get(edge.from);
      const to = nodePositions.get(edge.to);
      if (!from || !to) return;

      const arrowFrom: VisualVec3 = [from[0] + nodeSize[0] / 2, from[1], 0.04];
      const arrowTo: VisualVec3 = [to[0] - nodeSize[0] / 2, to[1], 0.04];
      layers.push(
        createArrowLayer(`composition-edge-${edge.id}`, arrowFrom, arrowTo, colorForChannel(edge.channel), {
          objectId: `edge:${edge.id}`,
          opacity: 0.82,
          headSize: 0.08,
          shaftRadius: 0.015,
        }),
      );

      if (edge.label || edge.channel) {
        const midX = (arrowFrom[0] + arrowTo[0]) / 2;
        layers.push(
          createLabelLayer(
            `composition-edge-label-${edge.id}`,
            edge.label ?? edge.channel,
            [midX - 0.22, arrowFrom[1] + 0.18, 0.08],
            colorForChannel(edge.channel),
            {
              objectId: `edge:${edge.id}`,
              scale: 0.075,
            },
          ),
        );
      }
    });
  }

  if (showComparisons && composition.comparisons) {
    composition.comparisons.forEach((comparison, index) => {
      const baseline = nodePositions.get(comparison.baselineNodeId);
      const candidate = nodePositions.get(comparison.candidateNodeId);
      if (!baseline || !candidate) return;

      const y = -0.78 - index * 0.22;
      layers.push(
        createLineLayer(
          `composition-compare-${index}`,
          [
            { from: [baseline[0], y, 0.16], to: [candidate[0], y, 0.16] },
          ],
          "#f472b6",
          { opacity: 0.55, linewidth: 1.6 },
        ),
        createLabelLayer(`composition-compare-label-${index}`, comparison.label, [Math.min(baseline[0], candidate[0]), y + 0.08, 0.18], "#f9a8d4", {
          scale: 0.075,
        }),
      );
      if (comparison.summary) {
        layers.push(
          createLabelLayer(`composition-compare-summary-${index}`, comparison.summary, [Math.min(baseline[0], candidate[0]), y - 0.08, 0.18], "#cbd5e1", {
            scale: 0.065,
          }),
        );
      }
    });
  }

  if (showMetrics && metricRows.length > 0) {
    metricRows.slice(0, 4).forEach((metric, index) => {
      const y = 1.12 - index * 0.28;
      layers.push(
        createLabelLayer(`composition-metric-label-${metric.id}`, metric.label, [1.75, y, 1.7], "#f8fafc", {
          objectId: "composition-metrics",
          scale: 0.088,
          depthTest: false,
          renderOrder: 12,
        }),
        createLabelLayer(`composition-metric-value-${metric.id}`, formatMetric(metric.value, metric.unit), [2.6, y, 1.7], metricColor(metric.emphasis), {
          objectId: "composition-metrics",
          scale: 0.088,
          depthTest: false,
          renderOrder: 12,
        }),
      );
    });
  }

  return createSceneSpec({
    id: `composition:${composition.id}`,
    camera: {
      position: [0.25, -6.2, 3.65],
      target: [0, 0.2, 0],
      fov: 42,
      minDistance: 2.4,
      maxDistance: 14,
    },
    style: {
      background: "#09141d",
      fogNear: 12,
      fogFar: 30,
      exposure: 1.08,
      ambientLight: 1.02,
      gridColor: "#274255",
    },
    layers,
    metadata: {
      kind: "operator-composition",
      compositionId: composition.id,
      compositionMode: composition.mode,
      visualGrammar: composition.visualGrammar,
      operatorCount: composition.operators.length,
    },
  });
}

function accentForMode(mode: OperatorCompositionSpec["mode"]) {
  if (mode === "fused") return "#22c55e";
  if (mode === "comparison") return "#f472b6";
  return "#38bdf8";
}

function colorForChannel(channel: string) {
  if (channel === "residual") return "#fb7185";
  if (channel === "spectrum") return "#c084fc";
  if (channel === "samples") return "#34d399";
  if (channel === "geometry") return "#f59e0b";
  if (channel === "control") return "#f97316";
  if (channel === "diagnostic") return "#f472b6";
  return "#60a5fa";
}

function metricColor(emphasis: "higher-better" | "lower-better" | "neutral" | undefined) {
  if (emphasis === "higher-better") return "#4ade80";
  if (emphasis === "lower-better") return "#facc15";
  return "#cbd5e1";
}

function formatMetric(value: number, unit?: string) {
  const rendered = Math.abs(value) >= 100 || Math.abs(value) < 0.01 ? value.toExponential(2) : value.toFixed(3);
  return unit ? `${rendered} ${unit}` : rendered;
}
