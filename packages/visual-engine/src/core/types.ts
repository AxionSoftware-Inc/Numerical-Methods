export type VisualVec3 = [number, number, number];

export type VisualRgb = [number, number, number];

export type VisualCameraSpec = {
  position: VisualVec3;
  target: VisualVec3;
  fov: number;
  minDistance: number;
  maxDistance: number;
};

export type VisualTransformSpec = {
  position?: VisualVec3;
  rotation?: VisualVec3;
  scale?: VisualVec3;
  pivot?: VisualVec3;
  opacity?: number;
};

export type VisualSceneStyle = {
  background: string;
  fogNear: number;
  fogFar: number;
};

export type VisualMeshMaterialSpec = {
  color?: string;
  vertexColors?: boolean;
  opacity?: number;
  transparent?: boolean;
  doubleSided?: boolean;
  depthTest?: boolean;
};

export type VisualWireframeSpec = {
  color: string;
  opacity: number;
};

export type VisualLayerBase = {
  id: string;
  objectId?: string;
  transform?: VisualTransformSpec;
};

export type VisualMeshLayerSpec = VisualLayerBase & {
  kind: "mesh";
  positions: number[];
  indices: number[];
  colors?: number[];
  material: VisualMeshMaterialSpec;
  wireframe?: VisualWireframeSpec;
  fill?: boolean;
};

export type VisualLineSegment = {
  from: VisualVec3;
  to: VisualVec3;
};

export type VisualLineLayerSpec = VisualLayerBase & {
  kind: "lines";
  segments: VisualLineSegment[];
  color: string;
  opacity?: number;
};

export type VisualMarkerLayerSpec = VisualLayerBase & {
  kind: "marker";
  position: VisualVec3;
  color: string;
  radius: number;
  label?: string;
  labelOffset?: VisualVec3;
};

export type VisualRingLayerSpec = VisualLayerBase & {
  kind: "ring";
  position: VisualVec3;
  color: string;
  radius: number;
  tubeRadius: number;
};

export type VisualBoxOutlineLayerSpec = VisualLayerBase & {
  kind: "box-outline";
  position: VisualVec3;
  size: VisualVec3;
  color: string;
  opacity?: number;
};

export type VisualArrowLayerSpec = VisualLayerBase & {
  kind: "arrow";
  from: VisualVec3;
  to: VisualVec3;
  color: string;
  opacity?: number;
};

export type VisualGridLayerSpec = VisualLayerBase & {
  kind: "grid";
  size: number;
  divisions: number;
  color: string;
  opacity: number;
  y: number;
};

export type VisualLabelLayerSpec = VisualLayerBase & {
  kind: "label";
  text: string;
  position: VisualVec3;
  color: string;
  scale?: number;
  format?: "text" | "latex";
};

export type VisualLayerSpec =
  | VisualMeshLayerSpec
  | VisualLineLayerSpec
  | VisualMarkerLayerSpec
  | VisualRingLayerSpec
  | VisualBoxOutlineLayerSpec
  | VisualArrowLayerSpec
  | VisualGridLayerSpec
  | VisualLabelLayerSpec;

export type VisualSceneSpec = {
  id: string;
  style: VisualSceneStyle;
  camera: VisualCameraSpec;
  layers: VisualLayerSpec[];
  metadata?: Record<string, string | number | boolean>;
};
