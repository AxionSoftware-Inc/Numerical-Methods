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
  const points = partialLineSegments(
    layer.segments,
    clamp01(layer.transform?.drawProgress ?? 1),
  ).flatMap((segment) => [toVector(segment.from), toVector(segment.to)]);

  if (points.length < 2) {
    const empty = new THREE.Group();
    empty.name = layer.id;
    return empty;
  }

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
  const points = partialPathPoints(
    layer.points,
    clamp01(layer.transform?.drawProgress ?? 1),
    layer.closed,
  ).map(toVector);

  if (points.length < 2) {
    const empty = new THREE.Group();
    empty.name = layer.id;
    return empty;
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
  const visibleCount = Math.max(
    0,
    Math.min(
      layer.points.length,
      Math.ceil(layer.points.length * clamp01(layer.transform?.drawProgress ?? 1)),
    ),
  );
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(layer.points.slice(0, visibleCount).flat(), 3),
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
  const drawProgress = clamp01(layer.transform?.drawProgress ?? 1);

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(Math.max(layer.radius * drawProgress, 1e-4), 18, 18),
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
      drawProgress,
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
  const drawProgress = clamp01(layer.transform?.drawProgress ?? 1);

  const start = toVector(layer.from);
  const end = toVector(layer.to);
  const partialEnd = start.clone().lerp(end, drawProgress);
  const direction = partialEnd.clone().sub(start);
  const length = direction.length();

  if (length < 1e-9) {
    return group;
  }

  direction.normalize();

  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([start, partialEnd]),
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

  cone.position.copy(partialEnd);
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
    layer.transform?.revealProgress,
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
  revealProgress: number | undefined,
): THREE.Sprite {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    const fallbackTexture = new THREE.Texture();
    return new THREE.Sprite(new THREE.SpriteMaterial({ map: fallbackTexture, transparent: true }));
  }

  const pixelRatio = 3;
  const padding = format === "latex" ? 28 : 18;
  const fontSize = format === "latex" ? 46 : 34;
  const box =
    format === "latex"
      ? layoutLatex(text, fontSize, context)
      : layoutPlainText(text, fontSize, context);

  canvas.width = Math.max(96, Math.ceil((box.width + padding * 2) * pixelRatio));
  canvas.height = Math.max(72, Math.ceil((box.ascent + box.descent + padding * 2) * pixelRatio));
  canvas.style.width = `${canvas.width / pixelRatio}px`;
  canvas.style.height = `${canvas.height / pixelRatio}px`;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.scale(pixelRatio, pixelRatio);
  context.fillStyle = colorToCss(color);
  context.strokeStyle = colorToCss(color);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.textBaseline = "alphabetic";

  const reveal = revealProgress === undefined ? 1 : Math.max(0, Math.min(1, revealProgress));

  if (reveal < 1) {
    context.save();
    context.beginPath();
    context.rect(0, 0, (box.width + padding * 2) * reveal, box.ascent + box.descent + padding * 2);
    context.clip();
  }

  box.draw(context, padding, padding + box.ascent);

  if (reveal < 1) {
    context.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.02,
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

  object.traverse((child) => {
    child.userData.layerId = layer.id;
    child.userData.objectId = layer.objectId;
    child.userData.layerKind = layer.kind;
    child.userData.pickable = layer.pickable;
    child.userData.metadata = layer.metadata;
  });
}

function partialPathPoints(
  points: VisualVec3[],
  progress: number,
  closed?: boolean,
): VisualVec3[] {
  if (points.length === 0 || progress <= 0) return [];
  const source = closed && points.length > 2 ? [...points, points[0]] : [...points];
  if (progress >= 1 || source.length < 2) return source;

  const totalSegments = source.length - 1;
  const scaled = progress * totalSegments;
  const fullSegments = Math.floor(scaled);
  const remainder = scaled - fullSegments;
  const result = source.slice(0, fullSegments + 1);

  if (fullSegments < totalSegments) {
    result.push(lerpVec3(source[fullSegments], source[fullSegments + 1], remainder));
  }

  return result;
}

function partialLineSegments(
  segments: VisualLineLayerSpec["segments"],
  progress: number,
): VisualLineLayerSpec["segments"] {
  if (segments.length === 0 || progress <= 0) return [];
  if (progress >= 1) return segments;

  const scaled = progress * segments.length;
  const fullSegments = Math.floor(scaled);
  const remainder = scaled - fullSegments;
  const result = segments.slice(0, fullSegments);

  if (fullSegments < segments.length) {
    const segment = segments[fullSegments];
    result.push({
      ...segment,
      to: lerpVec3(segment.from, segment.to, remainder),
    });
  }

  return result;
}

function lerpVec3(from: VisualVec3, to: VisualVec3, t: number): VisualVec3 {
  return [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
    from[2] + (to[2] - from[2]) * t,
  ];
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
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
  material.transparent = material.transparent || opacity < 1;
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

type TextBox = {
  width: number;
  ascent: number;
  descent: number;
  draw: (context: CanvasRenderingContext2D, x: number, baseline: number) => void;
};

function layoutPlainText(
  text: string,
  fontSize: number,
  context: CanvasRenderingContext2D,
): TextBox {
  return makeTextBox(text, fontSize, "Arial, sans-serif", context);
}

function layoutLatex(
  source: string,
  fontSize: number,
  context: CanvasRenderingContext2D,
): TextBox {
  const parser = new LatexBoxParser(normalizeLatexSource(source), fontSize, context);
  return parser.parse();
}

class LatexBoxParser {
  private index = 0;

  constructor(
    private readonly source: string,
    private readonly fontSize: number,
    private readonly context: CanvasRenderingContext2D,
  ) {}

  parse(): TextBox {
    const box = this.parseSequence();
    return box.width > 0 ? box : makeTextBox("", this.fontSize, latexFontFamily(), this.context);
  }

  private parseSequence(stop = ""): TextBox {
    const boxes: TextBox[] = [];

    while (this.index < this.source.length) {
      if (stop && this.source[this.index] === stop) {
        this.index += 1;
        break;
      }

      const token = this.parseAtom();
      if (!token) continue;

      boxes.push(this.parseScripts(token));
    }

    return combineBoxes(boxes);
  }

  private parseAtom(): TextBox | null {
    const char = this.source[this.index];

    if (char === " ") {
      this.index += 1;
      return makeTextBox(" ", this.fontSize, latexFontFamily(), this.context);
    }

    if (char === "{") {
      this.index += 1;
      return this.parseSequence("}");
    }

    if (char === "}") {
      this.index += 1;
      return null;
    }

    if (char === "\\") {
      return this.parseCommand();
    }

    this.index += 1;
    return makeTextBox(char, this.fontSize, latexFontFamily(), this.context);
  }

  private parseCommand(): TextBox {
    this.index += 1;
    const start = this.index;

    while (/[A-Za-z]/.test(this.source[this.index] ?? "")) {
      this.index += 1;
    }

    const command = this.source.slice(start, this.index);

    if (command === "frac") {
      const numerator = this.parseRequiredGroup(this.fontSize * 0.76);
      const denominator = this.parseRequiredGroup(this.fontSize * 0.76);
      return makeFractionBox(numerator, denominator, this.fontSize);
    }

    if (command === "sqrt") {
      const value = this.parseRequiredGroup(this.fontSize * 0.86);
      return makeSqrtBox(value, this.fontSize, this.context);
    }

    if (command === "mathcal" || command === "mathrm" || command === "text" || command === "operatorname") {
      return this.parseRequiredGroup(this.fontSize);
    }

    if (command === "left" || command === "right") {
      return this.parseAtom() ?? makeTextBox("", this.fontSize, latexFontFamily(), this.context);
    }

    if (command === "quad" || command === "qquad") {
      return makeTextBox(command === "qquad" ? "    " : "  ", this.fontSize, latexFontFamily(), this.context);
    }

    return makeTextBox(latexCommandText(command), this.fontSize, latexFontFamily(), this.context);
  }

  private parseScripts(base: TextBox): TextBox {
    let superscript: TextBox | undefined;
    let subscript: TextBox | undefined;

    while (this.source[this.index] === "^" || this.source[this.index] === "_") {
      const marker = this.source[this.index];
      this.index += 1;
      const script = this.parseScriptAtom();

      if (marker === "^") {
        superscript = script;
      } else {
        subscript = script;
      }
    }

    return superscript || subscript
      ? makeScriptBox(base, superscript, subscript, this.fontSize)
      : base;
  }

  private parseScriptAtom(): TextBox {
    const scriptSize = this.fontSize * 0.62;
    return this.source[this.index] === "{"
      ? this.parseRequiredGroup(scriptSize)
      : this.parseSingleAtom(scriptSize);
  }

  private parseSingleAtom(fontSize: number): TextBox {
    const parser = new LatexBoxParser(this.source.slice(this.index), fontSize, this.context);
    const box = parser.parseAtom() ?? makeTextBox("", fontSize, latexFontFamily(), this.context);
    this.index += parser.index;
    return box;
  }

  private parseRequiredGroup(fontSize: number): TextBox {
    this.skipWhitespace();

    if (this.source[this.index] !== "{") {
      return this.parseSingleAtom(fontSize);
    }

    this.index += 1;
    const parser = new LatexBoxParser(this.source.slice(this.index), fontSize, this.context);
    const box = parser.parseSequence("}");
    this.index += parser.index;
    return box;
  }

  private skipWhitespace(): void {
    while (this.source[this.index] === " ") {
      this.index += 1;
    }
  }
}

function makeTextBox(
  text: string,
  fontSize: number,
  fontFamily: string,
  context: CanvasRenderingContext2D,
): TextBox {
  const font = `${fontSize}px ${fontFamily}`;
  context.font = font;
  const metrics = context.measureText(text);
  const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.78;
  const descent = metrics.actualBoundingBoxDescent || fontSize * 0.24;

  return {
    width: metrics.width,
    ascent,
    descent,
    draw: (target, x, baseline) => {
      target.font = font;
      target.fillText(text, x, baseline);
    },
  };
}

function combineBoxes(boxes: TextBox[]): TextBox {
  const width = boxes.reduce((sum, box) => sum + box.width, 0);
  const ascent = Math.max(...boxes.map((box) => box.ascent), 1);
  const descent = Math.max(...boxes.map((box) => box.descent), 1);

  return {
    width,
    ascent,
    descent,
    draw: (context, x, baseline) => {
      let cursor = x;

      boxes.forEach((box) => {
        box.draw(context, cursor, baseline);
        cursor += box.width;
      });
    },
  };
}

function makeFractionBox(numerator: TextBox, denominator: TextBox, fontSize: number): TextBox {
  const gap = fontSize * 0.12;
  const linePadding = fontSize * 0.12;
  const width = Math.max(numerator.width, denominator.width) + linePadding * 2;
  const ascent = numerator.ascent + numerator.descent + gap + fontSize * 0.06;
  const descent = denominator.ascent + denominator.descent + gap;

  return {
    width,
    ascent,
    descent,
    draw: (context, x, baseline) => {
      const center = x + width / 2;
      const lineY = baseline - fontSize * 0.06;
      numerator.draw(context, center - numerator.width / 2, lineY - gap - numerator.descent);
      denominator.draw(context, center - denominator.width / 2, lineY + gap + denominator.ascent);
      context.lineWidth = Math.max(1.4, fontSize * 0.035);
      context.beginPath();
      context.moveTo(x + linePadding * 0.45, lineY);
      context.lineTo(x + width - linePadding * 0.45, lineY);
      context.stroke();
    },
  };
}

function makeScriptBox(
  base: TextBox,
  superscript: TextBox | undefined,
  subscript: TextBox | undefined,
  fontSize: number,
): TextBox {
  const scriptWidth = Math.max(superscript?.width ?? 0, subscript?.width ?? 0);
  const gap = fontSize * 0.035;
  const ascent = Math.max(base.ascent, (superscript?.ascent ?? 0) + (superscript?.descent ?? 0) + fontSize * 0.28);
  const descent = Math.max(base.descent, (subscript?.ascent ?? 0) + (subscript?.descent ?? 0) + fontSize * 0.1);

  return {
    width: base.width + scriptWidth + gap,
    ascent,
    descent,
    draw: (context, x, baseline) => {
      base.draw(context, x, baseline);

      if (superscript) {
        superscript.draw(context, x + base.width + gap, baseline - fontSize * 0.46);
      }

      if (subscript) {
        subscript.draw(context, x + base.width + gap, baseline + fontSize * 0.34);
      }
    },
  };
}

function makeSqrtBox(
  value: TextBox,
  fontSize: number,
  context: CanvasRenderingContext2D,
): TextBox {
  const radical = makeTextBox("√", fontSize * 1.08, latexFontFamily(), context);
  const gap = fontSize * 0.08;
  const width = radical.width + value.width + gap;
  const ascent = Math.max(radical.ascent, value.ascent + fontSize * 0.18);
  const descent = Math.max(radical.descent, value.descent);

  return {
    width,
    ascent,
    descent,
    draw: (target, x, baseline) => {
      radical.draw(target, x, baseline);
      value.draw(target, x + radical.width + gap, baseline);
      target.lineWidth = Math.max(1.2, fontSize * 0.032);
      target.beginPath();
      target.moveTo(x + radical.width + gap * 0.6, baseline - value.ascent - fontSize * 0.08);
      target.lineTo(x + width, baseline - value.ascent - fontSize * 0.08);
      target.stroke();
    },
  };
}

function latexFontFamily(): string {
  return "Cambria Math, STIX Two Math, Times New Roman, Georgia, serif";
}

function latexCommandText(command: string): string {
  const symbols: Record<string, string> = {
    alpha: "α",
    approx: "≈",
    beta: "β",
    gamma: "γ",
    delta: "δ",
    Delta: "Δ",
    epsilon: "ε",
    eta: "η",
    xi: "ξ",
    phi: "φ",
    varphi: "φ",
    psi: "ψ",
    tau: "τ",
    theta: "θ",
    lambda: "λ",
    mu: "μ",
    pi: "π",
    rho: "ρ",
    sigma: "σ",
    omega: "ω",
    Omega: "Ω",
    nabla: "∇",
    partial: "∂",
    infty: "∞",
    int: "∫",
    sum: "Σ",
    prod: "Π",
    cdot: "·",
    times: "×",
    div: "÷",
    leq: "≤",
    geq: "≥",
    neq: "≠",
    to: "→",
    rightarrow: "→",
    leftarrow: "←",
    pm: "±",
  };

  return symbols[command] ?? command;
}

function normalizeLatexSource(source: string): string {
  return source
    .replace(/\^\(([^)]+)\)/g, "^{$1}")
    .replace(/_\(([^)]+)\)/g, "_{$1}")
    .replace(/\^(-?\d+(?:\.\d+)?)/g, "^{$1}")
    .replace(/_(-?\d+(?:\.\d+)?)/g, "_{$1}");
}

function toThreeColor(color: VisualColor): THREE.ColorRepresentation {
  return colorToHex(color);
}
