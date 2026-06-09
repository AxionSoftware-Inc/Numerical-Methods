import type {
  VisualArrowLayerSpec,
  VisualBoxOutlineLayerSpec,
  VisualGridLayerSpec,
  VisualLabelFormat,
  VisualLabelLayerSpec,
  VisualLayerSpec,
  VisualLineLayerSpec,
  VisualMarkerLayerSpec,
  VisualMetadata,
  VisualSceneSpec,
  VisualVec3,
} from "./types";
import { addVec3, boxSegments, polylineSegments } from "./geometry";

export type ComposeSceneOptions = {
  id?: string;
  metadata?: VisualMetadata;
  replaceLayers?: boolean;
};

export type AxesLayerOptions = {
  idPrefix?: string;
  objectId?: string;
  origin?: VisualVec3;
  size?: number;
  showLabels?: boolean;
  xLabel?: string;
  yLabel?: string;
  zLabel?: string;
  color?: string;
  xColor?: string;
  yColor?: string;
  zColor?: string;
  opacity?: number;
};

export type TitleLayerOptions = {
  objectId?: string;
  position?: VisualVec3;
  subtitleOffset?: VisualVec3;
  titleScale?: number;
  subtitleScale?: number;
  color?: string;
  subtitleColor?: string;
  format?: VisualLabelFormat;
};

export type FormulaLayerOptions = {
  id?: string;
  objectId?: string;
  position?: VisualVec3;
  color?: string;
  scale?: number;
  format?: VisualLabelFormat;
};

export type CameraPathLayerOptions = {
  idPrefix?: string;
  objectId?: string;
  color?: string;
  opacity?: number;
  markerRadius?: number;
  showStartMarker?: boolean;
};

export function composeSceneSpec(
  baseScene: VisualSceneSpec,
  layers: VisualLayerSpec[],
  options: ComposeSceneOptions = {},
): VisualSceneSpec {
  return {
    ...baseScene,
    id: options.id ?? baseScene.id,
    layers: options.replaceLayers ? layers : [...baseScene.layers, ...layers],
    metadata: {
      ...baseScene.metadata,
      ...options.metadata,
    },
  };
}

export function createAxesLayers(size = 1.65, origin: VisualVec3 = [-1.55, -0.72, -1.35]): VisualLayerSpec[] {
  return createCoordinateAxesLayers({
    size,
    origin,
    yLabel: "h",
  });
}

export function createCoordinateAxesLayers(options: AxesLayerOptions = {}): VisualLayerSpec[] {
  const {
    idPrefix = "axes",
    objectId = "axes",
    origin = [0, 0, 0],
    size = 1,
    showLabels = true,
    xLabel = "x",
    yLabel = "y",
    zLabel = "z",
    color = "#cbd5e1",
    xColor = "#38bdf8",
    yColor = "#fde047",
    zColor = "#86efac",
    opacity = 0.68,
  } = options;

  const [x, y, z] = origin;
  const xEnd: VisualVec3 = [x + size, y, z];
  const yEnd: VisualVec3 = [x, y + size, z];
  const zEnd: VisualVec3 = [x, y, z + size];

  const layers: VisualLayerSpec[] = [
    {
      kind: "lines",
      id: `${idPrefix}-lines`,
      objectId,
      segments: [
        { from: origin, to: xEnd },
        { from: origin, to: yEnd },
        { from: origin, to: zEnd },
      ],
      color,
      opacity,
    },
    createArrowLayer(`${idPrefix}-x-arrow`, origin, xEnd, xColor, { objectId, opacity }),
    createArrowLayer(`${idPrefix}-y-arrow`, origin, yEnd, yColor, { objectId, opacity }),
    createArrowLayer(`${idPrefix}-z-arrow`, origin, zEnd, zColor, { objectId, opacity }),
  ];

  if (!showLabels) return layers;

  layers.push(
    createLabelLayer(`${idPrefix}-x-label`, xLabel, [x + size + 0.08, y, z], xColor, {
      objectId,
      scale: 0.09,
    }),
    createLabelLayer(`${idPrefix}-y-label`, yLabel, [x, y + size + 0.08, z], yColor, {
      objectId,
      scale: 0.09,
    }),
    createLabelLayer(`${idPrefix}-z-label`, zLabel, [x, y, z + size + 0.08], zColor, {
      objectId,
      scale: 0.09,
    }),
  );

  return layers;
}

export function createCameraPathLayers(points: VisualVec3[], color = "#f472b6"): VisualLayerSpec[] {
  return createCameraPathVisualLayers(points, { color });
}

export function createCameraPathVisualLayers(points: VisualVec3[], options: CameraPathLayerOptions = {}): VisualLayerSpec[] {
  if (points.length < 2) return [];

  const {
    idPrefix = "camera-path",
    objectId = "camera-path",
    color = "#f472b6",
    opacity = 0.48,
    markerRadius = 0.035,
    showStartMarker = true,
  } = options;

  const layers: VisualLayerSpec[] = [
    {
      kind: "lines",
      id: idPrefix,
      objectId,
      segments: polylineSegments(points),
      color,
      opacity,
    },
  ];

  if (showStartMarker) {
    layers.push({
      kind: "marker",
      id: `${idPrefix}-start`,
      objectId,
      position: points[0],
      color,
      radius: markerRadius,
      label: "camera path",
      labelOffset: [0.08, 0.12, 0],
    });
  }

  return layers;
}

export function createTitleLayers(title: string, subtitle = "", options: TitleLayerOptions = {}): VisualLayerSpec[] {
  const {
    objectId = "title",
    position = [-1.5, 2.6, 2],
    subtitleOffset = [0, -0.32, 0],
    titleScale = 0.3,
    subtitleScale = 0.13,
    color = "#f8fafc",
    subtitleColor = "#b6c7d6",
    format = "text",
  } = options;

  const layers: VisualLayerSpec[] = [
    createLabelLayer("scene-title", title, position, color, {
      objectId,
      scale: titleScale,
      format,
      renderOrder: 10,
      depthTest: false,
    }),
  ];

  if (subtitle.trim().length > 0) {
    layers.push(
      createLabelLayer("scene-subtitle", subtitle, addVec3(position, subtitleOffset), subtitleColor, {
        objectId,
        scale: subtitleScale,
        format,
        renderOrder: 10,
        depthTest: false,
      }),
    );
  }

  return layers;
}

export function createFormulaLabel(text: string, options: FormulaLayerOptions = {}): VisualLabelLayerSpec {
  const {
    id = "formula-label",
    objectId = "formula",
    position = [-1.45, 2.16, 2],
    color = "#e0f2fe",
    scale = 0.15,
    format = "latex",
  } = options;

  return createLabelLayer(id, text, position, color, {
    objectId,
    scale,
    format,
    renderOrder: 11,
    depthTest: false,
  });
}

export function createLabelLayer(
  id: string,
  text: string,
  position: VisualVec3,
  color = "#f8fafc",
  options: {
    objectId?: string;
    scale?: number;
    format?: VisualLabelFormat;
    opacity?: number;
    renderOrder?: number;
    depthTest?: boolean;
    metadata?: VisualMetadata;
  } = {},
): VisualLabelLayerSpec {
  return {
    kind: "label",
    id,
    objectId: options.objectId,
    text,
    position,
    color,
    scale: options.scale,
    format: options.format ?? "text",
    opacity: options.opacity,
    renderOrder: options.renderOrder,
    depthTest: options.depthTest,
    metadata: options.metadata,
  };
}

export function createMarkerLayer(
  id: string,
  position: VisualVec3,
  color = "#facc15",
  options: {
    objectId?: string;
    radius?: number;
    label?: string;
    labelOffset?: VisualVec3;
    opacity?: number;
    renderOrder?: number;
    depthTest?: boolean;
    metadata?: VisualMetadata;
  } = {},
): VisualMarkerLayerSpec {
  return {
    kind: "marker",
    id,
    objectId: options.objectId,
    position,
    color,
    radius: options.radius ?? 0.042,
    label: options.label,
    labelOffset: options.labelOffset,
    opacity: options.opacity,
    renderOrder: options.renderOrder,
    depthTest: options.depthTest,
    metadata: options.metadata,
  };
}

export function createArrowLayer(
  id: string,
  from: VisualVec3,
  to: VisualVec3,
  color = "#f8fafc",
  options: {
    objectId?: string;
    opacity?: number;
    headSize?: number;
    shaftRadius?: number;
    renderOrder?: number;
    depthTest?: boolean;
    metadata?: VisualMetadata;
  } = {},
): VisualArrowLayerSpec {
  return {
    kind: "arrow",
    id,
    objectId: options.objectId,
    from,
    to,
    color,
    opacity: options.opacity,
    headSize: options.headSize,
    shaftRadius: options.shaftRadius,
    renderOrder: options.renderOrder,
    depthTest: options.depthTest,
    metadata: options.metadata,
  };
}

export function createLineLayer(
  id: string,
  segments: VisualLineLayerSpec["segments"],
  color = "#cbd5e1",
  options: {
    objectId?: string;
    opacity?: number;
    linewidth?: number;
    renderOrder?: number;
    depthTest?: boolean;
    metadata?: VisualMetadata;
  } = {},
): VisualLineLayerSpec {
  return {
    kind: "lines",
    id,
    objectId: options.objectId,
    segments,
    color,
    opacity: options.opacity,
    linewidth: options.linewidth,
    renderOrder: options.renderOrder,
    depthTest: options.depthTest,
    metadata: options.metadata,
  };
}

export function createBoundingBoxLayer(
  id: string,
  position: VisualVec3,
  size: VisualVec3,
  color = "#dbeafe",
  options: {
    objectId?: string;
    opacity?: number;
    renderOrder?: number;
    depthTest?: boolean;
    metadata?: VisualMetadata;
  } = {},
): VisualBoxOutlineLayerSpec {
  return {
    kind: "box-outline",
    id,
    objectId: options.objectId,
    position,
    size,
    color,
    opacity: options.opacity ?? 0.55,
    renderOrder: options.renderOrder,
    depthTest: options.depthTest,
    metadata: options.metadata,
  };
}

export function createBoxFrameLayer(
  id: string,
  position: VisualVec3,
  size: VisualVec3,
  color = "#dbeafe",
  options: {
    objectId?: string;
    opacity?: number;
    renderOrder?: number;
    depthTest?: boolean;
  } = {},
): VisualLineLayerSpec {
  return {
    kind: "lines",
    id,
    objectId: options.objectId,
    segments: boxSegments(position, size),
    color,
    opacity: options.opacity ?? 0.45,
    renderOrder: options.renderOrder,
    depthTest: options.depthTest,
  };
}

export function createGridLayer(
  id = "base-grid",
  options: {
    objectId?: string;
    size?: number;
    divisions?: number;
    color?: string;
    opacity?: number;
    y?: number;
    plane?: "xy" | "xz" | "yz";
    renderOrder?: number;
  } = {},
): VisualGridLayerSpec {
  return {
    kind: "grid",
    id,
    objectId: options.objectId ?? "grid",
    size: options.size ?? 2.5,
    divisions: options.divisions ?? 12,
    color: options.color ?? "#38616d",
    opacity: options.opacity ?? 0.38,
    y: options.y ?? -0.86,
    plane: options.plane ?? "xz",
    renderOrder: options.renderOrder,
  };
}

export function createSceneSpec(options: {
  id: string;
  layers?: VisualLayerSpec[];
  camera?: VisualSceneSpec["camera"];
  style?: Partial<VisualSceneSpec["style"]>;
  metadata?: VisualMetadata;
}): VisualSceneSpec {
  return {
    id: options.id,
    style: {
      background: options.style?.background ?? "#0b2024",
      fogNear: options.style?.fogNear ?? 11,
      fogFar: options.style?.fogFar ?? 28,
      exposure: options.style?.exposure,
      ambientLight: options.style?.ambientLight,
      gridColor: options.style?.gridColor,
      metadata: options.style?.metadata,
    },
    camera: options.camera ?? {
      position: [3.2, -4.8, 2.9],
      target: [0, 0, 0],
      fov: 46,
      minDistance: 1.8,
      maxDistance: 12,
    },
    layers: options.layers ?? [],
    metadata: options.metadata,
  };
}