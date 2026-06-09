export type VisualScalar = string | number | boolean | null | undefined;

export type VisualMetadata = Record<string, VisualScalar>;

export type VisualVec2 = [number, number];

export type VisualVec3 = [number, number, number];

export type VisualRgb = [number, number, number];

export type VisualRgba = [number, number, number, number];

export type VisualColor = string | VisualRgb | VisualRgba;

export type VisualLayerKind =
  | "mesh"
  | "lines"
  | "path"
  | "marker"
  | "ring"
  | "box-outline"
  | "arrow"
  | "grid"
  | "label"
  | "plane"
  | "group";

export type VisualRenderSpace = "world" | "screen";

export type VisualTransformMode = "absolute" | "relative";

export type VisualTransformSpec = {
  /**
   * Position offset in world units.
   *
   * For layer-level transforms this is normally interpreted as local transform.
   * Video engine may use `mode` to decide whether sampled values override or add.
   */
  position?: VisualVec3;

  /**
   * Euler rotation in radians: [x, y, z].
   */
  rotation?: VisualVec3;

  /**
   * Scale multiplier: [x, y, z].
   */
  scale?: VisualVec3;

  /**
   * Pivot point in world coordinates.
   */
  pivot?: VisualVec3;

  /**
   * Optional opacity multiplier from 0..1.
   */
  opacity?: number;

  /**
   * Used by animation/video layers.
   * absolute: sampled transform replaces base transform.
   * relative: sampled transform is composed on top of base transform.
   */
  mode?: VisualTransformMode;
};

export type VisualCameraSpec = {
  position: VisualVec3;
  target: VisualVec3;
  fov: number;
  minDistance: number;
  maxDistance: number;

  /**
   * Optional clipping planes.
   */
  near?: number;
  far?: number;

  /**
   * Optional camera metadata for future exporters.
   */
  metadata?: VisualMetadata;
};

export type VisualSceneStyle = {
  background: string;
  fogNear: number;
  fogFar: number;

  /**
   * Optional renderer tone/exposure hints.
   */
  exposure?: number;
  ambientLight?: number;
  gridColor?: string;

  /**
   * Free-form style metadata.
   */
  metadata?: VisualMetadata;
};

export type VisualMeshMaterialSpec = {
  color?: VisualColor;
  vertexColors?: boolean;
  opacity?: number;
  transparent?: boolean;
  doubleSided?: boolean;
  depthTest?: boolean;
  depthWrite?: boolean;
  wireframe?: boolean;

  /**
   * "basic" is stable for math visualization.
   * "standard" can be used for shaded 3D surfaces.
   */
  shading?: "basic" | "standard";

  roughness?: number;
  metalness?: number;
  emissive?: VisualColor;
  emissiveIntensity?: number;
};

export type VisualLineMaterialSpec = {
  color: VisualColor;
  opacity?: number;
  depthTest?: boolean;
  transparent?: boolean;
  linewidth?: number;
};

export type VisualWireframeSpec = {
  color: VisualColor;
  opacity: number;
  depthTest?: boolean;
};

export type VisualLayerBase = {
  id: string;

  /**
   * objectId groups multiple visual layers into one semantic object.
   * Example: "surface", "volume", "axes", "formula", "camera-path".
   *
   * video-engine tracks should target this field.
   */
  objectId?: string;

  kind: VisualLayerKind;

  /**
   * Optional display label for editor/debug panels.
   */
  name?: string;

  visible?: boolean;
  opacity?: number;
  renderOrder?: number;

  /**
   * Whether this layer should participate in hit-testing later.
   */
  pickable?: boolean;

  transform?: VisualTransformSpec;
  metadata?: VisualMetadata;
};

export type VisualMeshLayerSpec = VisualLayerBase & {
  kind: "mesh";
  positions: number[];
  indices: number[];
  colors?: number[];
  normals?: number[];
  uvs?: number[];
  material: VisualMeshMaterialSpec;
  wireframe?: VisualWireframeSpec;

  /**
   * If false, renderer only renders wireframe when wireframe is provided.
   */
  fill?: boolean;
};

export type VisualLineSegment = {
  from: VisualVec3;
  to: VisualVec3;
  metadata?: VisualMetadata;
};

export type VisualLineLayerSpec = VisualLayerBase & {
  kind: "lines";
  segments: VisualLineSegment[];
  color: VisualColor;
  opacity?: number;
  linewidth?: number;
  depthTest?: boolean;
};

export type VisualPathLayerSpec = VisualLayerBase & {
  kind: "path";
  points: VisualVec3[];
  color: VisualColor;
  opacity?: number;
  linewidth?: number;
  closed?: boolean;
  depthTest?: boolean;
};

export type VisualMarkerLayerSpec = VisualLayerBase & {
  kind: "marker";
  position: VisualVec3;
  color: VisualColor;
  radius: number;
  label?: string;
  labelOffset?: VisualVec3;
  labelScale?: number;
  depthTest?: boolean;
};

export type VisualRingLayerSpec = VisualLayerBase & {
  kind: "ring";
  position: VisualVec3;
  color: VisualColor;
  radius: number;
  tubeRadius: number;
  rotation?: VisualVec3;
  depthTest?: boolean;
};

export type VisualBoxOutlineLayerSpec = VisualLayerBase & {
  kind: "box-outline";
  position: VisualVec3;
  size: VisualVec3;
  color: VisualColor;
  opacity?: number;
  depthTest?: boolean;
};

export type VisualArrowLayerSpec = VisualLayerBase & {
  kind: "arrow";
  from: VisualVec3;
  to: VisualVec3;
  color: VisualColor;
  opacity?: number;
  headSize?: number;
  shaftRadius?: number;
  depthTest?: boolean;
};

export type VisualGridLayerSpec = VisualLayerBase & {
  kind: "grid";
  size: number;
  divisions: number;
  color: VisualColor;
  opacity: number;

  /**
   * Grid plane position.
   */
  y: number;

  /**
   * Default is "xz".
   */
  plane?: "xy" | "xz" | "yz";
};

export type VisualLabelFormat = "text" | "latex";

export type VisualLabelLayerSpec = VisualLayerBase & {
  kind: "label";
  text: string;
  position: VisualVec3;
  color: VisualColor;
  scale?: number;
  format?: VisualLabelFormat;

  /**
   * Labels are usually rendered as screen-facing sprites.
   */
  billboard?: boolean;

  /**
   * Reserved for future layout system.
   */
  anchor?: "center" | "left" | "right";
  depthTest?: boolean;
};

export type VisualPlaneLayerSpec = VisualLayerBase & {
  kind: "plane";
  position: VisualVec3;
  size: VisualVec2;
  color: VisualColor;
  opacity?: number;
  rotation?: VisualVec3;
  doubleSided?: boolean;
  depthTest?: boolean;
};

export type VisualGroupLayerSpec = VisualLayerBase & {
  kind: "group";
  layers: VisualLayerSpec[];
};

export type VisualLayerSpec =
  | VisualMeshLayerSpec
  | VisualLineLayerSpec
  | VisualPathLayerSpec
  | VisualMarkerLayerSpec
  | VisualRingLayerSpec
  | VisualBoxOutlineLayerSpec
  | VisualArrowLayerSpec
  | VisualGridLayerSpec
  | VisualLabelLayerSpec
  | VisualPlaneLayerSpec
  | VisualGroupLayerSpec;

export type VisualSceneSpec = {
  id: string;
  style: VisualSceneStyle;
  camera: VisualCameraSpec;
  layers: VisualLayerSpec[];
  metadata?: VisualMetadata;
};

export type VisualSceneBuildResult = {
  scene: VisualSceneSpec;
  warnings?: string[];
};

export type VisualBounds3 = {
  min: VisualVec3;
  max: VisualVec3;
};

export type VisualPickPayload = {
  title: string;
  rows?: Array<[string, string]>;
  metadata?: VisualMetadata;
};

export type VisualLayerFactory<TInput, TOptions = undefined> = TOptions extends undefined
  ? (input: TInput) => VisualLayerSpec[]
  : (input: TInput, options: TOptions) => VisualLayerSpec[];

export function isVisualLayerVisible(layer: VisualLayerSpec): boolean {
  return layer.visible !== false && layer.opacity !== 0;
}

export function isVisualGroupLayer(layer: VisualLayerSpec): layer is VisualGroupLayerSpec {
  return layer.kind === "group";
}