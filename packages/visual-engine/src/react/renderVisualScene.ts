import * as THREE from "three";
import { colorToCss, colorToHex } from "../core/color";
import type {
  VisualArrowLayerSpec,
  VisualBoxOutlineLayerSpec,
  VisualColor,
  VisualGridLayerSpec,
  VisualGroupLayerSpec,
  VisualLabelLayerSpec,
  VisualLayerBase,
  VisualLayerSpec,
  VisualLineLayerSpec,
  VisualMarkerLayerSpec,
  VisualMeshLayerSpec,
  VisualPathLayerSpec,
  VisualPlaneLayerSpec,
  VisualPointCloudLayerSpec,
  VisualRingLayerSpec,
  VisualSceneSpec,
  VisualTransformSpec,
  VisualVec3,
} from "../core";

export function renderVisualSceneSpec(target: THREE.Group, spec: VisualSceneSpec): void {
  spec.layers.forEach((layer) => {
    const object = renderLayer(layer);
    target.add(object);
  });
}

export function applyVisualSceneStyle(scene: THREE.Scene, renderer: THREE.WebGLRenderer, spec: VisualSceneSpec): void {
  renderer.setClearColor(spec.style.background);
  renderer.toneMappingExposure = spec.style.exposure ?? renderer.toneMappingExposure;
  scene.background = new THREE.Color(spec.style.background);
  scene.fog = new THREE.Fog(spec.style.background, spec.style.fogNear, spec.style.fogFar);
}

function renderLayer(layer: VisualLayerSpec): THREE.Object3D {
  const object = renderLayerContent(layer);
  applyLayerBase(object, layer);
  return applyAppearance(applyTransform(object, layer.transform), getLayerOpacity(layer));
}

function renderLayerContent(layer: VisualLayerSpec): THREE.Object3D {
  switch (layer.kind) {
    case "mesh":
      return renderMeshLayer(layer);
    case "lines":
      return renderLineLayer(layer);
    case "path":
      return renderPathLayer(layer);
    case "point-cloud":
      return renderPointCloudLayer(layer);
    case "marker":
      return renderMarkerLayer(layer);
    case "ring":
      return renderRingLayer(layer);
    case "box-outline":
      return renderBoxOutlineLayer(layer);
    case "arrow":
      return renderArrowLayer(layer);
    case "grid":
      return renderGridLayer(layer);
    case "label":
      return renderLabelLayer(layer);
    case "plane":
      return renderPlaneLayer(layer);
    case "group":
      return renderGroupLayer(layer);
  }
}

function renderMeshLayer(layer: VisualMeshLayerSpec): THREE.Object3D {
  const group = new THREE.Group();
  group.name = layer.id;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(layer.positions, 3));

  if (layer.colors) {
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(layer.colors, 3));
  }

  if (layer.normals) {
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(layer.normals, 3));
  }

  if (layer.uvs) {
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(layer.uvs, 2));
  }

  geometry.setIndex(layer.indices);

  if (!layer.normals) {
    geometry.computeVertexNormals();
  }

  if (layer.fill !== false) {
    const material =
      layer.material.shading === "standard"
        ? new THREE.MeshStandardMaterial({
            color: toThreeColor(layer.material.color ?? "#ffffff"),
            vertexColors: layer.material.vertexColors,
            transparent: layer.material.transparent ?? layer.material.opacity !== undefined,
            opacity: layer.material.opacity ?? 1,
            side: layer.material.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
            depthTest: layer.material.depthTest ?? true,
            depthWrite: layer.material.depthWrite ?? true,
            wireframe: layer.material.wireframe,
            roughness: layer.material.roughness ?? 0.68,
            metalness: layer.material.metalness ?? 0.02,
            emissive: toThreeColor(layer.material.emissive ?? "#000000"),
            emissiveIntensity: layer.material.emissiveIntensity ?? 0,
          })
        : new THREE.MeshBasicMaterial({
            color: toThreeColor(layer.material.color ?? "#ffffff"),
            vertexColors: layer.material.vertexColors,
            transparent: layer.material.transparent ?? layer.material.opacity !== undefined,
            opacity: layer.material.opacity ?? 1,
            side: layer.material.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
            depthTest: layer.material.depthTest ?? true,
            depthWrite: layer.material.depthWrite ?? true,
            wireframe: layer.material.wireframe,
          });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `${layer.id}:fill`;
    group.add(mesh);
  }

  if (layer.wireframe) {
    const wireframe = new THREE.LineSegments(
      new THREE.WireframeGeometry(geometry),
      new THREE.LineBasicMaterial({
        color: toThreeColor(layer.wireframe.color),
        transparent: true,
        opacity: layer.wireframe.opacity,
        depthTest: layer.wireframe.depthTest ?? true,
      }),
    );
    wireframe.name = `${layer.id}:wireframe`;
    group.add(wireframe);
  }

  return group;
}

function renderLineLayer(layer: VisualLineLayerSpec): THREE.Object3D {
  const points = layer.segments.flatMap((segment) => [toVector(segment.from), toVector(segment.to)]);

  const line = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({
      color: toThreeColor(layer.color),
      transparent: layer.opacity !== undefined || layer.opacity !== 1,
      opacity: layer.opacity ?? 1,
      depthTest: layer.depthTest ?? true,
      linewidth: layer.linewidth ?? 1,
    }),
  );

  line.name = layer.id;
  return line;
}

function renderPathLayer(layer: VisualPathLayerSpec): THREE.Object3D {
  const points = layer.points.map(toVector);

  if (layer.closed && points.length > 2) {
    points.push(points[0].clone());
  }

  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({
      color: toThreeColor(layer.color),
      transparent: layer.opacity !== undefined || layer.opacity !== 1,
      opacity: layer.opacity ?? 1,
      depthTest: layer.depthTest ?? true,
      linewidth: layer.linewidth ?? 1,
    }),
  );

  line.name = layer.id;
  return line;
}

function renderPointCloudLayer(layer: VisualPointCloudLayerSpec): THREE.Object3D {
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(layer.points.flat(), 3),
  );

  const material = new THREE.PointsMaterial({
    color: toThreeColor(layer.color),
    transparent: layer.opacity !== undefined || layer.opacity !== 1,
    opacity: layer.opacity ?? 1,
    size: layer.size ?? 0.035,
    sizeAttenuation: layer.sizeAttenuation ?? true,
    depthTest: layer.depthTest ?? true,
  });

  const points = new THREE.Points(geometry, material);
  points.name = layer.id;

  return points;
}

function renderMarkerLayer(layer: VisualMarkerLayerSpec): THREE.Object3D {
  const group = new THREE.Group();
  group.name = layer.id;

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(layer.radius, 18, 18),
    new THREE.MeshBasicMaterial({
      color: toThreeColor(layer.color),
      depthTest: layer.depthTest ?? false,
    }),
  );

  sphere.position.set(layer.position[0], layer.position[1] + 0.035, layer.position[2]);
  sphere.renderOrder = layer.renderOrder ?? 6;
  group.add(sphere);

  if (layer.label) {
    const offset = layer.labelOffset ?? [0.1, 0.14, 0];
    const label = createTextSprite(
      layer.label,
      addVec3(layer.position, offset),
      layer.color,
      layer.labelScale ?? 0.095,
      "text",
      layer.depthTest ?? false,
    );
    group.add(label);
  }

  return group;
}

function renderRingLayer(layer: VisualRingLayerSpec): THREE.Object3D {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(layer.radius, layer.tubeRadius, 8, 32),
    new THREE.MeshBasicMaterial({
      color: toThreeColor(layer.color),
      depthTest: layer.depthTest ?? true,
    }),
  );

  ring.name = layer.id;
  ring.position.set(...layer.position);

  const rotation = layer.rotation ?? [Math.PI / 2, 0, 0];
  ring.rotation.set(rotation[0], rotation[1], rotation[2]);

  return ring;
}

function renderBoxOutlineLayer(layer: VisualBoxOutlineLayerSpec): THREE.Object3D {
  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(layer.size[0], layer.size[1], layer.size[2])),
    new THREE.LineBasicMaterial({
      color: toThreeColor(layer.color),
      transparent: layer.opacity !== undefined || layer.opacity !== 1,
      opacity: layer.opacity ?? 1,
      depthTest: layer.depthTest ?? true,
    }),
  );

  outline.name = layer.id;
  outline.position.set(...layer.position);

  return outline;
}

function renderArrowLayer(layer: VisualArrowLayerSpec): THREE.Object3D {
  const group = new THREE.Group();
  group.name = layer.id;

  const start = toVector(layer.from);
  const end = toVector(layer.to);
  const direction = end.clone().sub(start);
  const length = direction.length();

  if (length < 1e-9) {
    return group;
  }

  direction.normalize();

  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([start, end]),
    new THREE.LineBasicMaterial({
      color: toThreeColor(layer.color),
      transparent: layer.opacity !== undefined || layer.opacity !== 1,
      opacity: layer.opacity ?? 1,
      depthTest: layer.depthTest ?? true,
    }),
  );
  group.add(line);

  const headSize = layer.headSize ?? 0.075;
  const headHeight = Math.min(headSize, length * 0.35);

  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(headSize * 0.35, headHeight, 14),
    new THREE.MeshBasicMaterial({
      color: toThreeColor(layer.color),
      depthTest: layer.depthTest ?? true,
    }),
  );

  cone.position.copy(end);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  group.add(cone);

  return group;
}

function renderGridLayer(layer: VisualGridLayerSpec): THREE.Object3D {
  const grid = new THREE.GridHelper(layer.size, layer.divisions, toThreeColor(layer.color), toThreeColor(layer.color));
  grid.name = layer.id;

  grid.traverse((object) => {
    if ("material" in object) {
      applyMaterialOpacity(object.material as THREE.Material | THREE.Material[], layer.opacity);
    }
  });

  grid.position.y = layer.y;

  if (layer.plane === "xy") {
    grid.rotation.x = Math.PI / 2;
  }

  if (layer.plane === "yz") {
    grid.rotation.z = Math.PI / 2;
  }

  return grid;
}

function renderLabelLayer(layer: VisualLabelLayerSpec): THREE.Object3D {
  return createTextSprite(
    layer.text,
    layer.position,
    layer.color,
    layer.scale ?? 0.095,
    layer.format ?? "text",
    layer.depthTest ?? false,
  );
}

function renderPlaneLayer(layer: VisualPlaneLayerSpec): THREE.Object3D {
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(layer.size[0], layer.size[1]),
    new THREE.MeshBasicMaterial({
      color: toThreeColor(layer.color),
      transparent: layer.opacity !== undefined || layer.opacity !== 1,
      opacity: layer.opacity ?? 1,
      side: layer.doubleSided === false ? THREE.FrontSide : THREE.DoubleSide,
      depthTest: layer.depthTest ?? true,
    }),
  );

  plane.name = layer.id;
  plane.position.set(...layer.position);

  const rotation = layer.rotation ?? [-Math.PI / 2, 0, 0];
  plane.rotation.set(rotation[0], rotation[1], rotation[2]);

  return plane;
}

function renderGroupLayer(layer: VisualGroupLayerSpec): THREE.Object3D {
  const group = new THREE.Group();
  group.name = layer.id;

  layer.layers.forEach((child) => {
    group.add(renderLayer(child));
  });

  return group;
}

function createTextSprite(
  text: string,
  position: VisualVec3,
  color: VisualColor,
  scale: number,
  format: "text" | "latex",
  depthTest: boolean,
): THREE.Sprite {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    const fallbackTexture = new THREE.Texture();
    return new THREE.Sprite(new THREE.SpriteMaterial({ map: fallbackTexture, transparent: true }));
  }

  const fontSize = 34;
  const displayText = format === "latex" ? latexToDisplayText(text) : text;
  const fontFamily = format === "latex" ? "Georgia, serif" : "Arial, sans-serif";

  context.font = `${fontSize}px ${fontFamily}`;

  canvas.width = Math.max(96, Math.ceil(context.measureText(displayText).width + 32));
  canvas.height = 72;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = `${fontSize}px ${fontFamily}`;
  context.fillStyle = colorToCss(color);
  context.textBaseline = "middle";
  context.fillText(displayText, 16, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest,
  });

  const sprite = new THREE.Sprite(material);
  sprite.position.set(...position);
  sprite.scale.set((canvas.width / canvas.height) * scale, scale, 1);
  sprite.renderOrder = 7;

  return sprite;
}

function applyLayerBase(object: THREE.Object3D, layer: VisualLayerBase): void {
  object.name = layer.name ?? layer.id;
  object.visible = layer.visible !== false;

  if (layer.renderOrder !== undefined) {
    object.renderOrder = layer.renderOrder;
    object.traverse((child) => {
      child.renderOrder = layer.renderOrder ?? child.renderOrder;
    });
  }

  object.userData.layerId = layer.id;
  object.userData.objectId = layer.objectId;
  object.userData.layerKind = layer.kind;
  object.userData.pickable = layer.pickable;
  object.userData.metadata = layer.metadata;
}

function applyTransform(object: THREE.Object3D, transform: VisualTransformSpec | undefined): THREE.Object3D {
  if (!transform) return object;

  const pivot = transform.pivot;
  const target = pivot ? new THREE.Group() : object;

  if (pivot) {
    target.position.set(...pivot);
    object.position.sub(new THREE.Vector3(...pivot));
    target.add(object);
  }

  if (transform.position) {
    target.position.x += transform.position[0];
    target.position.y += transform.position[1];
    target.position.z += transform.position[2];
  }

  if (transform.rotation) {
    target.rotation.x += transform.rotation[0];
    target.rotation.y += transform.rotation[1];
    target.rotation.z += transform.rotation[2];
  }

  if (transform.scale) {
    target.scale.x *= transform.scale[0];
    target.scale.y *= transform.scale[1];
    target.scale.z *= transform.scale[2];
  }

  return target;
}

function applyAppearance(object: THREE.Object3D, opacity: number | undefined): THREE.Object3D {
  if (opacity === undefined) return object;

  object.traverse((child) => {
    if (!("material" in child)) return;
    applyMaterialOpacity(child.material as THREE.Material | THREE.Material[], opacity);
  });

  return object;
}

function applyMaterialOpacity(material: THREE.Material | THREE.Material[], opacity: number): void {
  if (Array.isArray(material)) {
    material.forEach((item) => applySingleMaterialOpacity(item, opacity));
    return;
  }

  applySingleMaterialOpacity(material, opacity);
}

function applySingleMaterialOpacity(material: THREE.Material, opacity: number): void {
  material.transparent = opacity < 1;
  material.opacity = opacity;
  material.needsUpdate = true;
}

function getLayerOpacity(layer: VisualLayerSpec): number | undefined {
  const layerOpacity = layer.opacity;
  const transformOpacity = layer.transform?.opacity;

  if (layerOpacity === undefined && transformOpacity === undefined) {
    return undefined;
  }

  return (layerOpacity ?? 1) * (transformOpacity ?? 1);
}

function toVector(point: VisualVec3): THREE.Vector3 {
  return new THREE.Vector3(point[0], point[1], point[2]);
}

function addVec3(a: VisualVec3, b: VisualVec3): VisualVec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function toThreeColor(color: VisualColor): THREE.ColorRepresentation {
  return colorToHex(color);
}

function latexToDisplayText(value: string): string {
  return value
    .replaceAll("\\cdot", "·")
    .replaceAll("\\times", "×")
    .replaceAll("\\pi", "π")
    .replaceAll("\\theta", "θ")
    .replaceAll("\\alpha", "α")
    .replaceAll("\\beta", "β")
    .replaceAll("\\gamma", "γ")
    .replaceAll("\\Delta", "Δ")
    .replaceAll("\\nabla", "∇")
    .replaceAll("\\int", "∫")
    .replaceAll("\\sum", "Σ")
    .replaceAll("\\sqrt", "√")
    .replaceAll("\\leq", "≤")
    .replaceAll("\\geq", "≥")
    .replaceAll("\\neq", "≠")
    .replaceAll("{", "")
    .replaceAll("}", "")
    .replaceAll("^", "")
    .replaceAll("_", "");
}
