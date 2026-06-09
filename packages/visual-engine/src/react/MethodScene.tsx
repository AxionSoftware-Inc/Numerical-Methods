"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  addScaled,
  amplifyError,
  buildJacobianDeformation,
  buildLocalErrorSurface,
  computeSceneFrame,
  defaultEngineStyle,
  distance,
  fieldSegment,
  fieldSamples,
  mergeLayerSpec,
} from "@methodslab/methods-engine/core";
import type { EngineStyle, ExampleSpec, LayerSpec, MethodSpec, Point, SceneFrame, TraceResult } from "@methodslab/methods-engine/core";
import type { ProjectionSegmentTrace } from "@methodslab/methods-engine/core";
import { VisualViewportControls } from "./VisualViewportControls";

type PickPayload = {
  title: string;
  rows: Array<[string, string]>;
};

type CameraState = {
  position: Point;
  target: Point;
};

type SceneTarget = THREE.Scene | THREE.Group;

type SceneRuntime = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  contentGroup: THREE.Group;
  camera: THREE.PerspectiveCamera;
  controls: VisualViewportControls;
  tooltip: HTMLDivElement;
  observer: ResizeObserver;
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;
  pickables: THREE.Object3D[];
  hovered: THREE.Object3D | null;
  frameId: number;
};

export type ComparisonTrace = {
  id: string;
  name: string;
  color: string;
  trace: TraceResult;
};

export type MethodSceneProps = {
  method: MethodSpec;
  example: ExampleSpec;
  trace: TraceResult;
  comparisonTraces: ComparisonTrace[];
  projectionSegments?: ProjectionSegmentTrace[];
  layers: Partial<LayerSpec>;
  style?: Partial<EngineStyle>;
  className?: string;
};

export function MethodScene({
  method,
  example,
  trace,
  comparisonTraces,
  projectionSegments = [],
  layers: layerOverrides,
  style: styleOverrides,
  className,
}: MethodSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<SceneRuntime | null>(null);
  const cameraStateRef = useRef<CameraState | null>(null);
  const frameRef = useRef<SceneFrame | null>(null);
  const previousExampleIdRef = useRef<string | null>(null);
  const layers = useMemo(() => mergeLayerSpec(layerOverrides), [layerOverrides]);
  const style = useMemo(() => ({ ...defaultEngineStyle, ...styleOverrides }), [styleOverrides]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.tabIndex = 0;
    mount.appendChild(renderer.domElement);

    const tooltip = createTooltip();
    mount.appendChild(tooltip);

    const scene = new THREE.Scene();
    const contentGroup = new THREE.Group();
    scene.add(contentGroup);
    scene.add(new THREE.AmbientLight(0xffffff, 0.76));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.05);
    keyLight.position.set(5, 6, 4);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x8bd5ff, 0.75);
    rimLight.position.set(-4, -3, 5);
    scene.add(rimLight);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.01, 1000);
    camera.position.set(4, -5, 3.2);
    camera.lookAt(0, 0, 0);

    const controls = new VisualViewportControls({
      camera,
      element: renderer.domElement,
      target: new THREE.Vector3(0, 0, 0),
      minDistance: 1.8,
      maxDistance: 12,
      primaryAction: "pan",
      wheelAction: "orbit",
    });
    controls.update();

    const observer = new ResizeObserver(() => {
      const current = runtimeRef.current;
      if (current) resizeRenderer(current);
    });

    const runtime: SceneRuntime = {
      renderer,
      scene,
      contentGroup,
      camera,
      controls,
      tooltip,
      observer,
      raycaster: new THREE.Raycaster(),
      pointer: new THREE.Vector2(),
      pickables: [],
      hovered: null,
      frameId: 0,
    };
    runtime.raycaster.params.Points.threshold = 0.05;
    runtimeRef.current = runtime;

    const resetCamera = () => {
      const frame = frameRef.current;
      if (!frame) return;
      applyCameraFrame(camera, controls, frame);
      cameraStateRef.current = {
        position: frame.cameraPosition,
        target: frame.center,
      };
      renderer.domElement.style.cursor = "grab";
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      runtime.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      runtime.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      runtime.raycaster.setFromCamera(runtime.pointer, camera);
      const hit = runtime.raycaster.intersectObjects(runtime.pickables, false)[0]?.object ?? null;
      runtime.hovered = hit;
      if (hit?.userData.pick) {
        renderer.domElement.style.cursor = "crosshair";
        updateTooltip(tooltip, hit.userData.pick as PickPayload, event.clientX - rect.left, event.clientY - rect.top);
      } else {
        renderer.domElement.style.cursor = "grab";
        tooltip.style.opacity = "0";
      }
    };

    const onPointerLeave = () => {
      runtime.hovered = null;
      tooltip.style.opacity = "0";
      renderer.domElement.style.cursor = "grab";
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);
    renderer.domElement.addEventListener("dblclick", resetCamera);

    resizeRenderer(runtime);
    runtime.observer.observe(mount);

    const render = () => {
      controls.update();
      cameraStateRef.current = {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
      };
      renderer.render(scene, camera);
      runtime.frameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(runtime.frameId);
      cameraStateRef.current = {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
      };
      runtime.observer.disconnect();
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      renderer.domElement.removeEventListener("dblclick", resetCamera);
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
      tooltip.remove();
      runtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    const frame = computeSceneFrame(trace);
    frameRef.current = frame;

    runtime.renderer.setClearColor(style.background);
    runtime.scene.background = new THREE.Color(style.background);
    runtime.scene.fog = new THREE.Fog(style.background, 9, 28);
    runtime.controls.setDistanceLimits(frame.minDistance, frame.maxDistance);

    const shouldAutoFrame = !cameraStateRef.current || previousExampleIdRef.current !== trace.metadata.exampleId;
    if (shouldAutoFrame) {
      applyCameraFrame(runtime.camera, runtime.controls, frame);
    }
    previousExampleIdRef.current = trace.metadata.exampleId;

    clearGroup(runtime.contentGroup);
    runtime.pickables.length = 0;
    runtime.hovered = null;
    runtime.tooltip.style.opacity = "0";
    runtime.renderer.domElement.style.cursor = "grab";
    runtime.pickables.push(...buildScene(runtime.contentGroup, { method, example, trace, comparisonTraces, projectionSegments, layers, style }));
  }, [comparisonTraces, example, layers, method, projectionSegments, style, trace]);

  return <div ref={mountRef} className={className} />;
}

function resizeRenderer(runtime: SceneRuntime) {
  const mount = runtime.renderer.domElement.parentElement;
  const width = mount?.clientWidth || 1;
  const height = mount?.clientHeight || 1;
  runtime.renderer.setSize(width, height, false);
  runtime.camera.aspect = width / height;
  runtime.camera.updateProjectionMatrix();
}

function applyCameraFrame(camera: THREE.PerspectiveCamera, controls: VisualViewportControls, frame: SceneFrame) {
  camera.position.set(...frame.cameraPosition);
  controls.setTarget(new THREE.Vector3(...frame.center));
  camera.lookAt(controls.target);
  controls.update();
}

function buildScene(
  target: THREE.Group,
  {
    method,
    example,
    trace,
    comparisonTraces,
    projectionSegments,
    layers,
    style,
  }: {
    method: MethodSpec;
    example: ExampleSpec;
    trace: TraceResult;
    comparisonTraces: ComparisonTrace[];
    projectionSegments: ProjectionSegmentTrace[];
    layers: LayerSpec;
    style: EngineStyle;
  },
) {
  const pickables: THREE.Object3D[] = [];
  const grid = new THREE.GridHelper(5, 10, style.gridMajor, style.gridMinor);
  grid.position.z = example.gridZ;
  grid.rotation.x = Math.PI / 2;
  target.add(grid);

  if (layers.stability && trace.stabilityRegion) {
    addLine(target, trace.stabilityRegion.points, style.stability, 0.82);
    addLabel(target, "stability region", [-2.34, 1.45, trace.stabilityRegion.planeZ + 0.08], style.stability, 0.16);
  }

  addLine(target, trace.exactPath, style.exact, 1);

  if (layers.comparison) {
    for (const comparison of comparisonTraces) {
      addLine(target, comparison.trace.points, comparison.color, comparison.id === "energy-corrected-euler" ? 0.82 : 0.36);
    }
  }

  addLine(target, trace.points, method.color, 1);

  trace.points.forEach((point, index) => {
    const error = trace.errors[index];
    addSphere(
      target,
      point,
      index === 0 ? 0.055 : 0.026,
      index === 0 ? "#ffffff" : method.color,
      "#271400",
      0.2,
      {
        title: `${method.name} point ${index}`,
        rows: [
          ["t", formatNumber(error?.t ?? 0)],
          ["numeric", formatPoint(point)],
          ["exact", formatPoint(trace.exactAtStep[index] ?? point)],
          ["error", formatNumber(error?.magnitude ?? 0)],
        ],
      },
      pickables,
    );
  });

  if (layers.errors) {
    const errorStride = Math.max(1, Math.floor(trace.points.length / 34));
    trace.points.forEach((point, index) => {
      if (index % errorStride !== 0 && index !== trace.points.length - 1) return;
      const exact = trace.exactAtStep[index];
      addVector(target, exact, amplifyError(exact, point, layers.errorGain), style.error, 0.74, 0.045);
    });
  }

  const selectedStep = trace.steps[Math.min(layers.stepIndex, trace.steps.length - 1)];
  const jacobian = buildJacobianDeformation(method, example, selectedStep);
  const localError = buildLocalErrorSurface(method, example, selectedStep);

  if (layers.jacobian && jacobian) {
    addLine(target, jacobian.sourceLoop, style.jacobianSource, 0.78);
    addLine(target, jacobian.mappedLoop, style.jacobianMapped, 0.86);
    jacobian.anchors.forEach(([source, mapped]) => addVector(target, source, mapped, style.jacobianMapped, 0.5, 0.04));
  }

  if (layers.localError && localError) {
    addLocalErrorSurface(target, localError.points, localError.size, style);
  }

  if (layers.critical) {
    trace.criticalMarkers.forEach((marker) => {
      addCriticalMarker(target, marker.point, style.critical, marker.severity, {
        title: marker.label,
        rows: [
          ["kind", marker.kind],
          ["point", formatPoint(marker.point)],
          ["severity", formatNumber(marker.severity)],
          ...(marker.description ? [["note", marker.description] as [string, string]] : []),
        ],
      }, pickables);
    });
  }

  if (layers.projection) {
    projectionSegments.forEach((segment) => {
      addVector(target, segment.from, segment.to, style.projection, 0.86, 0.055);
      addSphere(
        target,
        segment.to,
        0.033,
        style.projection,
        style.projection,
        0.18,
        {
          title: `${segment.label} ${segment.index}`,
          rows: [
            ["from", formatPoint(segment.from)],
            ["to", formatPoint(segment.to)],
            ["delta", formatNumber(segment.magnitude)],
          ],
        },
        pickables,
      );
    });
  }

  if (selectedStep) {
    addVector(target, selectedStep.start, selectedStep.end, "#ffffff", 0.74, 0.045);
    addSphere(
      target,
      selectedStep.start,
      0.055,
      "#ffffff",
      "#ffffff",
      0.2,
      {
        title: `focused step ${selectedStep.index + 1} start`,
        rows: [
          ["t", formatNumber(selectedStep.tStart)],
          ["point", formatPoint(selectedStep.start)],
        ],
      },
      pickables,
    );
    addSphere(
      target,
      selectedStep.end,
      0.065,
      method.color,
      method.color,
      0.22,
      {
        title: `focused step ${selectedStep.index + 1} end`,
        rows: [
          ["t", formatNumber(selectedStep.tEnd)],
          ["numeric", formatPoint(selectedStep.end)],
          ["exact", formatPoint(selectedStep.exactEnd)],
        ],
      },
      pickables,
    );
  }

  if (layers.stages && selectedStep) {
    for (const stage of selectedStep.stages) {
      addVector(target, stage.sample, stage.vectorEnd, stage.color, 1, 0.055);
      addSphere(
        target,
        stage.sample,
        0.047,
        stage.color,
        stage.color,
        0.25,
        {
          title: `${stage.label} sample`,
          rows: [["point", formatPoint(stage.sample)]],
        },
        pickables,
      );
      addSphere(
        target,
        stage.vectorEnd,
        0.032,
        stage.color,
        stage.color,
        0.15,
        {
          title: `${stage.label} vector end`,
          rows: [["point", formatPoint(stage.vectorEnd)]],
        },
        pickables,
      );
      addLabel(target, stage.label, addScaled(stage.sample, [0.08, 0.08, 0.08], 1), stage.color, 0.14);
    }
  }

  if (layers.field) {
    fieldSamples(example).forEach((point) => {
      const [start, end] = fieldSegment(example, point);
      addVector(target, start, end, style.field, 0.48, 0.035);
    });
  }

  addLabel(target, example.equation, [-1.7, -1.65, example.gridZ + 3.65], "#cbd5e1", 0.16);
  return pickables;
}

function addLine(target: SceneTarget, points: Point[], color: string, opacity: number) {
  if (points.length < 2) return;
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(toVector));
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
  });
  target.add(new THREE.Line(geometry, material));
}

function addVector(target: SceneTarget, start: Point, end: Point, color: string, opacity: number, headSize: number) {
  addLine(target, [start, end], color, opacity);
  const length = distance(start, end);
  if (length < 1e-6) return;

  const direction = toVector(end).sub(toVector(start)).normalize();
  const height = Math.min(headSize * 1.7, length * 0.45);
  const geometry = new THREE.ConeGeometry(headSize * 0.42, height, 14);
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.05,
    transparent: opacity < 1,
    opacity,
    roughness: 0.58,
    metalness: 0.02,
  });
  const cone = new THREE.Mesh(geometry, material);
  cone.position.copy(toVector(end).sub(direction.clone().multiplyScalar(height * 0.5)));
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  target.add(cone);
}

function addSphere(
  target: SceneTarget,
  point: Point,
  radius: number,
  color: string,
  emissive: string,
  emissiveIntensity: number,
  pick: PickPayload | null = null,
  pickables: THREE.Object3D[] | null = null,
) {
  const geometry = new THREE.SphereGeometry(radius, 18, 18);
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity,
    roughness: 0.54,
    metalness: 0.04,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...point);
  if (pick) {
    mesh.userData.pick = pick;
    const hitGeometry = new THREE.SphereGeometry(Math.max(radius * 3.6, 0.11), 12, 12);
    const hitMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const hitMesh = new THREE.Mesh(hitGeometry, hitMaterial);
    hitMesh.position.set(...point);
    hitMesh.userData.pick = pick;
    target.add(hitMesh);
    pickables?.push(hitMesh);
  }
  target.add(mesh);
}

function addCriticalMarker(target: SceneTarget, point: Point, color: string, severity: number, pick: PickPayload, pickables: THREE.Object3D[]) {
  const radius = 0.08 + Math.max(0, Math.min(1, severity)) * 0.035;
  addSphere(target, point, radius, color, color, 0.28, pick, pickables);
  addLine(target, [[point[0] - radius * 2.2, point[1], point[2]], [point[0] + radius * 2.2, point[1], point[2]]], color, 0.86);
  addLine(target, [[point[0], point[1] - radius * 2.2, point[2]], [point[0], point[1] + radius * 2.2, point[2]]], color, 0.86);
  addLabel(target, "critical", [point[0] + 0.14, point[1] + 0.08, point[2] + 0.05], color, 0.13);
}

function addLocalErrorSurface(target: SceneTarget, points: Point[], size: number, style: EngineStyle) {
  for (let row = 0; row < size; row++) {
    addLine(target, points.slice(row * size, row * size + size), row % 2 === 0 ? style.localErrorLow : style.localErrorHigh, 0.52);
  }
  for (let column = 0; column < size; column++) {
    const line: Point[] = [];
    for (let row = 0; row < size; row++) {
      line.push(points[row * size + column]);
    }
    addLine(target, line, column % 2 === 0 ? style.localErrorLow : style.localErrorHigh, 0.52);
  }
}

function addLabel(target: SceneTarget, text: string, point: Point, color: string, scale: number) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return;

  const fontSize = 42;
  context.font = `${fontSize}px Arial`;
  const width = Math.ceil(context.measureText(text).width + 32);
  canvas.width = Math.max(128, width);
  canvas.height = 72;
  context.font = `${fontSize}px Arial`;
  context.fillStyle = color;
  context.textBaseline = "middle";
  context.fillText(text, 16, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.position.set(...point);
  sprite.scale.set((canvas.width / canvas.height) * scale, scale, 1);
  target.add(sprite);
}

function toVector(point: Point) {
  return new THREE.Vector3(point[0], point[1], point[2]);
}

function createTooltip() {
  const tooltip = document.createElement("div");
  tooltip.style.position = "absolute";
  tooltip.style.pointerEvents = "none";
  tooltip.style.opacity = "0";
  tooltip.style.transform = "translate(14px, 14px)";
  tooltip.style.maxWidth = "360px";
  tooltip.style.border = "1px solid rgba(148, 163, 184, 0.45)";
  tooltip.style.background = "rgba(4, 12, 16, 0.9)";
  tooltip.style.backdropFilter = "blur(10px)";
  tooltip.style.color = "#e5eef3";
  tooltip.style.font = "12px/1.45 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
  tooltip.style.borderRadius = "6px";
  tooltip.style.padding = "10px 12px";
  tooltip.style.zIndex = "20";
  return tooltip;
}

function updateTooltip(tooltip: HTMLDivElement, payload: PickPayload, x: number, y: number) {
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
  tooltip.style.opacity = "1";
  tooltip.innerHTML = [
    `<div style="font-weight:700;margin-bottom:6px;color:#ffffff">${escapeHtml(payload.title)}</div>`,
    ...payload.rows.map(([label, value]) => `<div><span style="color:#8fb3c5">${escapeHtml(label)}:</span> ${escapeHtml(value)}</div>`),
  ].join("");
}

function formatPoint(point: Point) {
  return `[${point.map(formatNumber).join(", ")}]`;
}

function formatNumber(value: number) {
  return Math.abs(value) >= 10 ? value.toFixed(2) : value.toFixed(4);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clearGroup(group: THREE.Group) {
  while (group.children.length > 0) {
    const child = group.children.pop();
    if (child) disposeObject(child);
  }
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.Sprite) {
      child.geometry?.dispose();
      const material = child.material;
      if (Array.isArray(material)) {
        material.forEach(disposeMaterial);
      } else {
        disposeMaterial(material);
      }
    }
  });
}

function disposeMaterial(material: THREE.Material | undefined) {
  if (!material) return;
  const maybeTextured = material as THREE.Material & { map?: THREE.Texture };
  maybeTextured.map?.dispose();
  material.dispose();
}
