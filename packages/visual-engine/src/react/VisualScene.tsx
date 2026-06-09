"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { VisualSceneSpec } from "../core";
import { applyVisualSceneStyle, renderVisualSceneSpec } from "./renderVisualScene";
import { VisualViewportControls } from "./VisualViewportControls";

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

  className?: string;
};

type Runtime = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: VisualViewportControls;
  content: THREE.Group;
  observer: ResizeObserver;
  frameId: number;
};

export function VisualScene({
  spec,
  cameraResetKey,
  cameraMode = "preserve",
  onCanvasReady,
  className,
}: VisualSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const onCanvasReadyRef = useRef(onCanvasReady);
  const previousResetKeyRef = useRef<string | undefined>(undefined);
  const previousContentKeyRef = useRef<string | null>(null);

  useEffect(() => {
    onCanvasReadyRef.current = onCanvasReady;
  }, [onCanvasReady]);

  const contentKey = useMemo(() => createSceneContentKey(spec), [spec]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: false,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
    const camera = new THREE.PerspectiveCamera(
      spec.camera.fov,
      1,
      spec.camera.near ?? 0.01,
      spec.camera.far ?? 1000,
    );

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
    };

    runtimeRef.current = runtime;

    applyVisualSceneStyle(scene, renderer, spec);
    resetCameraFromSpec(runtime, spec);
    renderVisualSceneSpec(content, spec);
    previousContentKeyRef.current = contentKey;
    previousResetKeyRef.current = cameraResetKey;

    observer.observe(mount);
    resize(runtime);

    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      runtime.frameId = requestAnimationFrame(render);
    };

    render();

    return () => {
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

  return <div ref={mountRef} className={className} />;
}

function updateCameraProjection(camera: THREE.PerspectiveCamera, spec: VisualSceneSpec): void {
  camera.fov = spec.camera.fov;
  camera.near = spec.camera.near ?? 0.01;
  camera.far = spec.camera.far ?? 1000;
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
  runtime.camera.aspect = width / height;
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
        layer.indices.length,
        layer.colors?.length ?? 0,
        layer.material.opacity ?? "",
        layer.fill === false ? "wire-only" : "fill",
        layer.wireframe?.opacity ?? "",
      ].join(",");

    case "lines":
      return [
        ...base,
        layer.segments.length,
        layer.color,
        layer.opacity ?? "",
      ].join(",");

    case "path":
      return [
        ...base,
        layer.points.length,
        layer.color,
        layer.opacity ?? "",
        layer.closed ? "closed" : "open",
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