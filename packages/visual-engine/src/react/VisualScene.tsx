"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { VisualSceneSpec } from "../core";
import { applyVisualSceneStyle, renderVisualSceneSpec } from "./renderVisualScene";
import { VisualViewportControls, type VisualCameraPose } from "./VisualViewportControls";

export type VisualSceneCameraPoseState = {
  position: [number, number, number];
  target: [number, number, number];
};

export type VisualSceneProps = {
  spec: VisualSceneSpec;

  /**
   * Change this value when you want to force camera reset.
   * Example: scene kind, template id, project id.
   */
  cameraResetKey?: string;

  /**
   * preserve: user camera stays when scene content changes.
   * follow-spec: camera follows spec on every spec update. Useful for video preview.
   */
  cameraMode?: "preserve" | "follow-spec";

  /**
   * Called with canvas after renderer is ready.
   * Useful for frame capture/export adapters.
   */
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
  syncedCameraPose?: VisualSceneCameraPoseState | null;
  onCameraPoseChange?: (pose: VisualSceneCameraPoseState) => void;

  className?: string;
};

type Runtime = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  controls: VisualViewportControls;
  content: THREE.Group;
  observer: ResizeObserver;
  frameId: number;
  lastRenderTime: number;
};

type HoverInfo = {
  x: number;
  y: number;
  title: string;
  description: string;
};

const PREVIEW_RENDER_INTERVAL_MS = 1000 / 30;

export function VisualScene({
  spec,
  cameraResetKey,
  cameraMode = "preserve",
  onCanvasReady,
  syncedCameraPose,
  onCameraPoseChange,
  className,
}: VisualSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const onCanvasReadyRef = useRef(onCanvasReady);
  const previousResetKeyRef = useRef<string | undefined>(undefined);
  const previousContentKeyRef = useRef<string | null>(null);
  const onCameraPoseChangeRef = useRef(onCameraPoseChange);
  const appliedPoseKeyRef = useRef<string | null>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    onCanvasReadyRef.current = onCanvasReady;
  }, [onCanvasReady]);

  useEffect(() => {
    onCameraPoseChangeRef.current = onCameraPoseChange;
  }, [onCameraPoseChange]);

  const contentKey = useMemo(() => createSceneContentKey(spec), [spec]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "WebGL renderer could not be created.";
      queueMicrotask(() => setRenderError(message));
      onCanvasReadyRef.current?.(null);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = spec.style.exposure ?? 1.22;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.style.touchAction = "none";

    mount.appendChild(renderer.domElement);
    onCanvasReadyRef.current?.(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = createCamera(spec, 1);
    camera.position.set(...spec.camera.position);

    const controls = new VisualViewportControls({
      camera,
      element: renderer.domElement,
      target: new THREE.Vector3(...spec.camera.target),
      minDistance: spec.camera.minDistance,
      maxDistance: spec.camera.maxDistance,
      primaryAction: "orbit",
      wheelAction: "orbit",
    });

    const content = new THREE.Group();
    content.name = "visual-scene-content";
    scene.add(content);

    addDefaultLights(scene, spec);

    const observer = new ResizeObserver(() => {
      const current = runtimeRef.current;
      if (current) resize(current);
    });

    const runtime: Runtime = {
      renderer,
      scene,
      camera,
      controls,
      content,
      observer,
      frameId: 0,
      lastRenderTime: 0,
    };

    runtimeRef.current = runtime;

    applyVisualSceneStyle(scene, renderer, spec);
    resetCameraFromSpec(runtime, spec);
    renderVisualSceneSpec(content, spec);
    previousContentKeyRef.current = contentKey;
    previousResetKeyRef.current = cameraResetKey;

    observer.observe(mount);
    resize(runtime);

    const render = (now: number) => {
      if (now - runtime.lastRenderTime >= PREVIEW_RENDER_INTERVAL_MS) {
        controls.update();
        const poseState = toPoseState(controls.getPose());
        const poseKey = poseStateKey(poseState);
        if (poseKey !== appliedPoseKeyRef.current) {
          appliedPoseKeyRef.current = poseKey;
          onCameraPoseChangeRef.current?.(poseState);
        }
        renderer.render(scene, camera);
        runtime.lastRenderTime = now;
      }

      runtime.frameId = requestAnimationFrame(render);
    };

    runtime.frameId = requestAnimationFrame(render);

    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 0.065;
    raycaster.params.Line.threshold = 0.055;
    const pointer = new THREE.Vector2();

    const onPointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
      pointer.y = -(((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1);
      raycaster.setFromCamera(pointer, camera);

      const hit = raycaster
        .intersectObjects(content.children, true)
        .find((item) => item.object.userData.layerId && item.object.userData.pickable !== false);

      if (!hit) {
        renderer.domElement.style.cursor = "grab";
        setHover(null);
        return;
      }

      const metadata = hit.object.userData.metadata as { title?: string; description?: string } | undefined;
      const layerId = String(hit.object.userData.layerId);
      const layerKind = String(hit.object.userData.layerKind ?? "visual layer");
      const objectId = hit.object.userData.objectId ? String(hit.object.userData.objectId) : layerKind;

      renderer.domElement.style.cursor = "help";
      setHover({
        x: event.clientX,
        y: event.clientY,
        title: metadata?.title ?? formatLayerTitle(layerId),
        description: metadata?.description ?? `${objectId} · ${layerKind}`,
      });
    };

    const onPointerLeave = () => {
      renderer.domElement.style.cursor = "grab";
      setHover(null);
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);

    return () => {
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      cancelAnimationFrame(runtime.frameId);
      observer.disconnect();
      controls.dispose();
      clearGroup(content);
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
      onCanvasReadyRef.current?.(null);
      runtimeRef.current = null;
    };
    // Mount once. Spec updates are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    applyVisualSceneStyle(runtime.scene, runtime.renderer, spec);
    updateCameraProjection(runtime.camera, spec);
    runtime.controls.setDistanceLimits(spec.camera.minDistance, spec.camera.maxDistance);

    const shouldResetCamera =
      cameraMode === "follow-spec" || previousResetKeyRef.current !== cameraResetKey;

    if (previousContentKeyRef.current !== contentKey) {
      clearGroup(runtime.content);
      renderVisualSceneSpec(runtime.content, spec);
      previousContentKeyRef.current = contentKey;
    }

    if (shouldResetCamera) {
      resetCameraFromSpec(runtime, spec);
      previousResetKeyRef.current = cameraResetKey;
    }

    runtime.controls.update();
  }, [cameraMode, cameraResetKey, contentKey, spec]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime || !syncedCameraPose) return;
    const nextPoseKey = poseStateKey(syncedCameraPose);
    if (nextPoseKey === appliedPoseKeyRef.current) return;
    runtime.controls.setPose(
      new THREE.Vector3(...syncedCameraPose.position),
      new THREE.Vector3(...syncedCameraPose.target),
    );
    appliedPoseKeyRef.current = nextPoseKey;
  }, [syncedCameraPose]);

  return (
    <div ref={mountRef} className={className}>
      {renderError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.12),_rgba(6,16,22,0.96)_60%)] p-6 text-center">
          <div className="max-w-md rounded-[24px] border border-white/10 bg-black/20 px-6 py-5 text-[#d7e3ea] shadow-2xl shadow-black/30 backdrop-blur">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8fb0be]">Render Unavailable</div>
            <div className="mt-3 text-lg font-semibold text-white">{String(spec.metadata?.exampleName ?? spec.metadata?.kind ?? "Visual scene")}</div>
            <div className="mt-2 text-sm leading-6 text-[#9fb3bb]">
              WebGL context yaratilmadi. Bu brauzer yoki sandbox GPU renderni bloklayapti.
            </div>
            <div className="mt-3 text-xs leading-5 text-[#7f98a4]">
              {renderError}
            </div>
          </div>
        </div>
      ) : null}
      {hover ? (
        <div
          data-testid="visual-tooltip"
          className="pointer-events-none z-50 max-w-[260px] rounded border border-white/15 bg-[#061016]/90 px-3 py-2 text-xs leading-5 text-[#d7e3ea] shadow-2xl shadow-black/35 backdrop-blur-md"
          style={{ position: "fixed", left: hover.x + 14, top: hover.y + 14 }}
        >
          <div className="font-semibold text-white">{hover.title}</div>
          <div className="mt-1 text-[#9fb3bb]">{hover.description}</div>
        </div>
      ) : null}
    </div>
  );
}

function toPoseState(pose: VisualCameraPose): VisualSceneCameraPoseState {
  return {
    position: [pose.position.x, pose.position.y, pose.position.z],
    target: [pose.target.x, pose.target.y, pose.target.z],
  };
}

function poseStateKey(pose: VisualSceneCameraPoseState) {
  return [...pose.position, ...pose.target].map((value) => value.toFixed(4)).join(",");
}

function formatLayerTitle(layerId: string): string {
  return layerId
    .replace(/[-_:]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function createCamera(
  spec: VisualSceneSpec,
  aspect: number,
): THREE.PerspectiveCamera | THREE.OrthographicCamera {
  if (spec.camera.projection === "orthographic") {
    const size = spec.camera.orthographicSize ?? 3.8;
    return new THREE.OrthographicCamera(
      (-size * aspect) / 2,
      (size * aspect) / 2,
      size / 2,
      -size / 2,
      spec.camera.near ?? 0.01,
      spec.camera.far ?? 1000,
    );
  }

  return new THREE.PerspectiveCamera(
    spec.camera.fov,
    aspect,
    spec.camera.near ?? 0.01,
    spec.camera.far ?? 1000,
  );
}

function updateCameraProjection(
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
  spec: VisualSceneSpec,
): void {
  camera.near = spec.camera.near ?? 0.01;
  camera.far = spec.camera.far ?? 1000;

  if (camera instanceof THREE.PerspectiveCamera) {
    camera.fov = spec.camera.fov;
  }

  camera.updateProjectionMatrix();
}

function resetCameraFromSpec(runtime: Runtime, spec: VisualSceneSpec): void {
  runtime.camera.position.set(...spec.camera.position);
  runtime.controls.setTarget(new THREE.Vector3(...spec.camera.target));
  runtime.camera.lookAt(runtime.controls.target);
  runtime.controls.update();
}

function addDefaultLights(scene: THREE.Scene, spec: VisualSceneSpec): void {
  const ambientIntensity = spec.style.ambientLight ?? 1.08;

  const ambient = new THREE.AmbientLight(0xffffff, ambientIntensity);
  ambient.name = "ambient-light";
  scene.add(ambient);

  const hemisphere = new THREE.HemisphereLight(0xe0f7ff, 0x24313a, 1.35);
  hemisphere.name = "hemisphere-light";
  scene.add(hemisphere);

  const key = new THREE.DirectionalLight(0xffffff, 2.65);
  key.name = "key-light";
  key.position.set(4.8, -5.4, 7.2);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xbdefff, 1.12);
  fill.name = "fill-light";
  fill.position.set(-4, 3, 4);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0x6dd3ff, 1.05);
  rim.name = "rim-light";
  rim.position.set(-3, 4, 3);
  scene.add(rim);
}

function resize(runtime: Runtime): void {
  const mount = runtime.renderer.domElement.parentElement;
  const width = mount?.clientWidth || 1;
  const height = mount?.clientHeight || 1;

  runtime.renderer.setSize(width, height, false);
  const aspect = width / height;

  if (runtime.camera instanceof THREE.PerspectiveCamera) {
    runtime.camera.aspect = aspect;
  } else {
    const size = runtime.camera.top - runtime.camera.bottom;
    runtime.camera.left = (-size * aspect) / 2;
    runtime.camera.right = (size * aspect) / 2;
  }

  runtime.camera.updateProjectionMatrix();
}

function createSceneContentKey(spec: VisualSceneSpec): string {
  return [
    spec.id,
    spec.layers.length,
    spec.layers.map(layerContentKey).join("|"),
  ].join(":");
}

function layerContentKey(layer: VisualSceneSpec["layers"][number]): string {
  const base = [
    layer.kind,
    layer.id,
    layer.objectId ?? "",
    layer.visible === false ? "hidden" : "visible",
    layer.opacity ?? "",
    layer.renderOrder ?? "",
    JSON.stringify(layer.transform ?? null),
  ];

  switch (layer.kind) {
    case "mesh":
      return [
        ...base,
        layer.positions.length,
        numberArrayContentKey(layer.positions),
        layer.indices.length,
        layer.colors?.length ?? 0,
        layer.colors ? numberArrayContentKey(layer.colors) : "",
        layer.material.opacity ?? "",
        layer.fill === false ? "wire-only" : "fill",
        layer.wireframe?.opacity ?? "",
      ].join(",");

    case "lines":
      return [
        ...base,
        layer.segments.length,
        lineSegmentsContentKey(layer.segments),
        layer.color,
        layer.opacity ?? "",
      ].join(",");

    case "path":
      return [
        ...base,
        layer.points.length,
        vec3ArrayContentKey(layer.points),
        layer.color,
        layer.opacity ?? "",
        layer.closed ? "closed" : "open",
      ].join(",");

    case "point-cloud":
      return [
        ...base,
        layer.points.length,
        vec3ArrayContentKey(layer.points),
        layer.color,
        layer.opacity ?? "",
        layer.size ?? "",
        layer.depthTest === false ? "no-depth" : "depth",
        layer.sizeAttenuation === false ? "no-attenuation" : "attenuation",
      ].join(",");

    case "marker":
      return [
        ...base,
        layer.position.join(","),
        layer.color,
        layer.radius,
        layer.label ?? "",
      ].join(",");

    case "ring":
      return [
        ...base,
        layer.position.join(","),
        layer.color,
        layer.radius,
        layer.tubeRadius,
      ].join(",");

    case "box-outline":
      return [
        ...base,
        layer.position.join(","),
        layer.size.join(","),
        layer.color,
      ].join(",");

    case "arrow":
      return [
        ...base,
        layer.from.join(","),
        layer.to.join(","),
        layer.color,
        layer.opacity ?? "",
      ].join(",");

    case "grid":
      return [
        ...base,
        layer.size,
        layer.divisions,
        layer.color,
        layer.opacity,
        layer.y,
        layer.plane ?? "",
      ].join(",");

    case "label":
      return [
        ...base,
        layer.text,
        layer.position.join(","),
        layer.color,
        layer.scale ?? "",
        layer.format ?? "",
      ].join(",");

    case "plane":
      return [
        ...base,
        layer.position.join(","),
        layer.size.join(","),
        layer.color,
        layer.opacity ?? "",
      ].join(",");

    case "group":
      return [
        ...base,
        layer.layers.length,
        layer.layers.map(layerContentKey).join(";"),
      ].join(",");
  }
}

function numberArrayContentKey(values: number[]): string {
  return sampleSignature(values, 192).join(",");
}

function lineSegmentsContentKey(segments: Array<{ from: [number, number, number]; to: [number, number, number] }>): string {
  const values = segments.flatMap((segment) => [...segment.from, ...segment.to]);
  return numberArrayContentKey(values);
}

function vec3ArrayContentKey(values: Array<[number, number, number]>): string {
  const flattened: number[] = [];

  values.forEach((point) => {
    flattened.push(point[0], point[1], point[2]);
  });

  return sampleSignature(flattened, 192).join(",");
}

function sampleSignature(values: number[], limit: number): string[] {
  if (values.length === 0) {
    return ["0"];
  }

  const step = Math.max(1, Math.floor(values.length / limit));
  const signature: string[] = [];

  for (let index = 0; index < values.length; index += step) {
    signature.push(Math.round(values[index] * 1000) / 1000 + "");
  }

  signature.push(`len:${values.length}`);
  return signature;
}

function clearGroup(group: THREE.Group): void {
  while (group.children.length > 0) {
    const child = group.children.pop();
    if (child) disposeObject(child);
  }
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if ("geometry" in child) {
      const geometry = child.geometry as THREE.BufferGeometry | undefined;
      geometry?.dispose();
    }

    if ("material" in child) {
      const material = child.material as THREE.Material | THREE.Material[] | undefined;
      disposeMaterial(material);
    }
  });
}

function disposeMaterial(material: THREE.Material | THREE.Material[] | undefined): void {
  if (!material) return;

  if (Array.isArray(material)) {
    material.forEach(disposeMaterial);
    return;
  }

  const materialWithMaps = material as THREE.Material & {
    map?: THREE.Texture;
    normalMap?: THREE.Texture;
    roughnessMap?: THREE.Texture;
    metalnessMap?: THREE.Texture;
    emissiveMap?: THREE.Texture;
    alphaMap?: THREE.Texture;
  };

  materialWithMaps.map?.dispose();
  materialWithMaps.normalMap?.dispose();
  materialWithMaps.roughnessMap?.dispose();
  materialWithMaps.metalnessMap?.dispose();
  materialWithMaps.emissiveMap?.dispose();
  materialWithMaps.alphaMap?.dispose();

  material.dispose();
}
