import * as THREE from "three";
import type {
  VisualArrowLayerSpec,
  VisualBoxOutlineLayerSpec,
  VisualGridLayerSpec,
  VisualLabelLayerSpec,
  VisualLayerSpec,
  VisualLineLayerSpec,
  VisualMarkerLayerSpec,
  VisualMeshLayerSpec,
  VisualRingLayerSpec,
  VisualSceneSpec,
  VisualTransformSpec,
  VisualVec3,
} from "../core";

export function renderVisualSceneSpec(target: THREE.Group, spec: VisualSceneSpec) {
  spec.layers.forEach((layer) => {
    target.add(renderLayer(layer));
  });
}

export function applyVisualSceneStyle(scene: THREE.Scene, renderer: THREE.WebGLRenderer, spec: VisualSceneSpec) {
  renderer.setClearColor(spec.style.background);
  scene.background = new THREE.Color(spec.style.background);
  scene.fog = new THREE.Fog(spec.style.background, spec.style.fogNear, spec.style.fogFar);
}

function renderLayer(layer: VisualLayerSpec): THREE.Object3D {
  let object: THREE.Object3D;
  switch (layer.kind) {
    case "mesh":
      object = renderMeshLayer(layer);
      break;
    case "lines":
      object = renderLineLayer(layer);
      break;
    case "marker":
      object = renderMarkerLayer(layer);
      break;
    case "ring":
      object = renderRingLayer(layer);
      break;
    case "box-outline":
      object = renderBoxOutlineLayer(layer);
      break;
    case "arrow":
      object = renderArrowLayer(layer);
      break;
    case "grid":
      object = renderGridLayer(layer);
      break;
    case "label":
      object = renderLabelLayer(layer);
      break;
  }
  return applyAppearance(applyTransform(object, layer.transform), layer.transform?.opacity);
}

function renderMeshLayer(layer: VisualMeshLayerSpec) {
  const group = new THREE.Group();
  group.name = layer.id;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(layer.positions, 3));
  if (layer.colors) geometry.setAttribute("color", new THREE.Float32BufferAttribute(layer.colors, 3));
  geometry.setIndex(layer.indices);
  geometry.computeVertexNormals();

  if (layer.fill !== false) {
    group.add(
      new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          color: layer.material.color ?? "#ffffff",
          vertexColors: layer.material.vertexColors,
          transparent: layer.material.transparent ?? layer.material.opacity !== undefined,
          opacity: layer.material.opacity ?? 1,
          side: layer.material.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
          depthTest: layer.material.depthTest ?? true,
        }),
      ),
    );
  }

  if (layer.wireframe) {
    group.add(
      new THREE.LineSegments(
        new THREE.WireframeGeometry(geometry),
        new THREE.LineBasicMaterial({
          color: layer.wireframe.color,
          transparent: true,
          opacity: layer.wireframe.opacity,
        }),
      ),
    );
  }

  return group;
}

function renderLineLayer(layer: VisualLineLayerSpec) {
  const points = layer.segments.flatMap((segment) => [toVector(segment.from), toVector(segment.to)]);
  const line = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: layer.color, transparent: layer.opacity !== undefined, opacity: layer.opacity ?? 1 }),
  );
  line.name = layer.id;
  return line;
}

function renderMarkerLayer(layer: VisualMarkerLayerSpec) {
  const group = new THREE.Group();
  group.name = layer.id;
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(layer.radius, 18, 18),
    new THREE.MeshBasicMaterial({ color: layer.color, depthTest: false }),
  );
  sphere.position.set(layer.position[0], layer.position[1] + 0.035, layer.position[2]);
  sphere.renderOrder = 6;
  group.add(sphere);
  if (layer.label) {
    const offset = layer.labelOffset ?? [0.1, 0.14, 0];
    group.add(createTextSprite(layer.label, addVec3(layer.position, offset), layer.color, 0.095, "text"));
  }
  return group;
}

function renderRingLayer(layer: VisualRingLayerSpec) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(layer.radius, layer.tubeRadius, 8, 28),
    new THREE.MeshBasicMaterial({ color: layer.color }),
  );
  ring.name = layer.id;
  ring.position.set(...layer.position);
  ring.position.y += 0.045;
  ring.rotation.x = Math.PI / 2;
  return ring;
}

function renderBoxOutlineLayer(layer: VisualBoxOutlineLayerSpec) {
  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(layer.size[0], layer.size[1], layer.size[2])),
    new THREE.LineBasicMaterial({ color: layer.color, transparent: layer.opacity !== undefined, opacity: layer.opacity ?? 1 }),
  );
  outline.name = layer.id;
  outline.position.set(...layer.position);
  return outline;
}

function renderArrowLayer(layer: VisualArrowLayerSpec) {
  const group = new THREE.Group();
  group.name = layer.id;
  const start = toVector(layer.from);
  const end = toVector(layer.to);
  const direction = end.clone().sub(start);
  const length = direction.length();
  if (length < 1e-9) return group;
  direction.normalize();
  group.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([start, end]),
      new THREE.LineBasicMaterial({ color: layer.color, transparent: layer.opacity !== undefined, opacity: layer.opacity ?? 1 }),
    ),
  );
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.075, 12), new THREE.MeshBasicMaterial({ color: layer.color }));
  cone.position.copy(end);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  group.add(cone);
  return group;
}

function renderGridLayer(layer: VisualGridLayerSpec) {
  const grid = new THREE.GridHelper(layer.size, layer.divisions, layer.color, layer.color);
  grid.name = layer.id;
  grid.material.transparent = true;
  grid.material.opacity = layer.opacity;
  grid.position.y = layer.y;
  return grid;
}

function renderLabelLayer(layer: VisualLabelLayerSpec) {
  return createTextSprite(layer.text, layer.position, layer.color, layer.scale ?? 0.095, layer.format ?? "text");
}

function createTextSprite(text: string, position: VisualVec3, color: string, scale: number, format: "text" | "latex") {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return new THREE.Group();
  const fontSize = 34;
  const displayText = format === "latex" ? latexToDisplayText(text) : text;
  context.font = format === "latex" ? `${fontSize}px Georgia, serif` : `${fontSize}px Arial`;
  canvas.width = Math.max(160, Math.ceil(context.measureText(displayText).width + 28));
  canvas.height = 64;
  context.font = format === "latex" ? `${fontSize}px Georgia, serif` : `${fontSize}px Arial`;
  context.fillStyle = color;
  context.textBaseline = "middle";
  context.fillText(displayText, 14, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.position.set(...position);
  sprite.scale.set((canvas.width / canvas.height) * scale, scale, 1);
  sprite.renderOrder = 7;
  return sprite;
}

function applyTransform(object: THREE.Object3D, transform: VisualTransformSpec | undefined) {
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
  if (transform.rotation) target.rotation.set(transform.rotation[0], transform.rotation[1], transform.rotation[2]);
  if (transform.scale) target.scale.set(transform.scale[0], transform.scale[1], transform.scale[2]);
  return target;
}

function applyAppearance(object: THREE.Object3D, opacity: number | undefined) {
  if (opacity === undefined) return object;
  object.traverse((child) => {
    const maybeMesh = child as THREE.Object3D & { material?: THREE.Material | THREE.Material[] };
    const materials = Array.isArray(maybeMesh.material) ? maybeMesh.material : maybeMesh.material ? [maybeMesh.material] : [];
    materials.forEach((material) => {
      material.transparent = true;
      material.opacity = opacity;
      material.needsUpdate = true;
    });
  });
  return object;
}

function latexToDisplayText(text: string) {
  return text
    .replaceAll("\\int", "∫")
    .replaceAll("\\sum", "∑")
    .replaceAll("\\pi", "π")
    .replaceAll("\\theta", "θ")
    .replaceAll("\\alpha", "α")
    .replaceAll("\\beta", "β")
    .replaceAll("\\gamma", "γ")
    .replaceAll("\\Delta", "Δ")
    .replaceAll("\\nabla", "∇")
    .replaceAll("\\cdot", "·")
    .replaceAll("\\times", "×")
    .replaceAll("\\,", " ")
    .replace(/\\frac\\{([^{}]+)\\}\\{([^{}]+)\\}/g, "($1)/($2)")
    .replace(/\^\{([^{}]+)\}/g, "^$1")
    .replace(/_\{([^{}]+)\}/g, "_$1")
    .replace(/[{}]/g, "");
}

function toVector(point: VisualVec3) {
  return new THREE.Vector3(point[0], point[1], point[2]);
}

function addVec3(a: VisualVec3, b: VisualVec3): VisualVec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
