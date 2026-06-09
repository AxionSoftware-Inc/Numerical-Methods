import type { VisualLayerSpec, VisualSceneSpec, VisualVec3 } from "./types";

export type ComposeSceneOptions = {
  id?: string;
  metadata?: Record<string, string | number | boolean>;
};

export function composeSceneSpec(baseScene: VisualSceneSpec, layers: VisualLayerSpec[], options: ComposeSceneOptions = {}): VisualSceneSpec {
  return {
    ...baseScene,
    id: options.id ?? baseScene.id,
    layers: [...baseScene.layers, ...layers],
    metadata: {
      ...baseScene.metadata,
      ...options.metadata,
    },
  };
}

export function createAxesLayers(size = 1.65, origin: VisualVec3 = [-1.55, -0.72, -1.35]): VisualLayerSpec[] {
  const [x, y, z] = origin;
  return [
    {
      kind: "lines",
      id: "axes-lines",
      objectId: "axes",
      segments: [
        { from: origin, to: [x + size, y, z] },
        { from: origin, to: [x, y + size * 0.82, z] },
        { from: origin, to: [x, y, z + size] },
      ],
      color: "#cbd5e1",
      opacity: 0.68,
    },
    {
      kind: "label",
      id: "axis-x-label",
      objectId: "axes",
      text: "x",
      position: [x + size + 0.08, y, z],
      color: "#38bdf8",
      scale: 0.09,
    },
    {
      kind: "label",
      id: "axis-y-label",
      objectId: "axes",
      text: "h",
      position: [x, y + size * 0.82 + 0.08, z],
      color: "#fde047",
      scale: 0.09,
    },
    {
      kind: "label",
      id: "axis-z-label",
      objectId: "axes",
      text: "y",
      position: [x, y, z + size + 0.08],
      color: "#86efac",
      scale: 0.09,
    },
  ];
}

export function createCameraPathLayers(points: VisualVec3[], color = "#f472b6"): VisualLayerSpec[] {
  if (points.length < 2) return [];
  return [
    {
      kind: "lines",
      id: "camera-path",
      objectId: "camera-path",
      segments: points.slice(1).map((point, index) => ({
        from: points[index],
        to: point,
      })),
      color,
      opacity: 0.48,
    },
    {
      kind: "marker",
      id: "camera-path-start",
      objectId: "camera-path",
      position: points[0],
      color,
      radius: 0.035,
      label: "camera path",
      labelOffset: [0.08, 0.12, 0],
    },
  ];
}

export function createTitleLayers(title: string, subtitle: string): VisualLayerSpec[] {
  return [
    {
      kind: "label",
      id: "scene-title",
      objectId: "title",
      text: title,
      position: [-1.5, 2.6, 2],
      color: "#f8fafc",
      scale: 0.3,
      format: "text",
    },
    {
      kind: "label",
      id: "scene-subtitle",
      objectId: "title",
      text: subtitle,
      position: [-1.5, 2.36, 2],
      color: "#fde047",
      scale: 0.22,
      format: "latex",
    },
  ];
}
