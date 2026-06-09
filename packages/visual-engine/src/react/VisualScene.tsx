"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { VisualSceneSpec } from "../core";
import { applyVisualSceneStyle, renderVisualSceneSpec } from "./renderVisualScene";
import { VisualViewportControls } from "./VisualViewportControls";

export type VisualSceneProps = {
  spec: VisualSceneSpec;
  cameraResetKey?: string;
  cameraMode?: "preserve" | "follow-spec";
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

export function VisualScene({ spec, cameraResetKey, cameraMode = "preserve", onCanvasReady, className }: VisualSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const onCanvasReadyRef = useRef(onCanvasReady);
  const previousResetKeyRef = useRef<string | undefined>(undefined);
  const previousContentKeyRef = useRef<string | null>(null);

  useEffect(() => {
    onCanvasReadyRef.current = onCanvasReady;
  }, [onCanvasReady]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.28;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.style.touchAction = "none";
    mount.appendChild(renderer.domElement);
    onCanvasReadyRef.current?.(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, 1, 0.01, 1000);
    camera.position.set(3.6, -5.2, 3.2);
    const controls = new VisualViewportControls({
      camera,
      element: renderer.domElement,
      target: new THREE.Vector3(0, 0, 0),
      minDistance: 1.8,
      maxDistance: 12,
      primaryAction: "orbit",
      wheelAction: "orbit",
    });

    const content = new THREE.Group();
    scene.add(content);
    addDefaultLights(scene);

    const observer = new ResizeObserver(() => {
      const current = runtimeRef.current;
      if (current) resize(current);
    });
    const runtime: Runtime = { renderer, scene, camera, controls, content, observer, frameId: 0 };
    runtimeRef.current = runtime;
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
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
      onCanvasReadyRef.current?.(null);
      runtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const shouldResetCamera = cameraMode === "follow-spec" || previousResetKeyRef.current !== cameraResetKey;

    applyVisualSceneStyle(runtime.scene, runtime.renderer, spec);
    runtime.camera.fov = spec.camera.fov;
    runtime.camera.updateProjectionMatrix();
    runtime.controls.setDistanceLimits(spec.camera.minDistance, spec.camera.maxDistance);
    const contentKey = `${spec.id}:${spec.layers.length}:${spec.layers.map(layerContentKey).join("|")}`;
    if (previousContentKeyRef.current !== contentKey) {
      clearGroup(runtime.content);
      renderVisualSceneSpec(runtime.content, spec);
      previousContentKeyRef.current = contentKey;
    }

    if (shouldResetCamera) {
      runtime.camera.position.set(...spec.camera.position);
      runtime.controls.setTarget(new THREE.Vector3(...spec.camera.target));
      previousResetKeyRef.current = cameraResetKey;
    }
    runtime.controls.update();
  }, [cameraMode, cameraResetKey, spec]);

  return <div ref={mountRef} className={className} />;
}

function addDefaultLights(scene: THREE.Scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 1.08));
  scene.add(new THREE.HemisphereLight(0xe0f7ff, 0x24313a, 1.45));
  const key = new THREE.DirectionalLight(0xffffff, 2.8);
  key.position.set(4.8, -5.4, 7.2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xbdefff, 1.25);
  fill.position.set(-4, 3, 4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x6dd3ff, 1.15);
  rim.position.set(-3, 4, 3);
  scene.add(rim);
}

function resize(runtime: Runtime) {
  const mount = runtime.renderer.domElement.parentElement;
  const width = mount?.clientWidth || 1;
  const height = mount?.clientHeight || 1;
  runtime.renderer.setSize(width, height, false);
  runtime.camera.aspect = width / height;
  runtime.camera.updateProjectionMatrix();
}

function clearGroup(group: THREE.Group) {
  while (group.children.length > 0) {
    const child = group.children.pop();
    if (child) disposeObject(child);
  }
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (
      child instanceof THREE.Mesh ||
      child instanceof THREE.Line ||
      child instanceof THREE.LineSegments ||
      child instanceof THREE.Sprite ||
      child instanceof THREE.InstancedMesh
    ) {
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
  const textured = material as THREE.Material & { map?: THREE.Texture };
  textured.map?.dispose();
  material.dispose();
}

function layerContentKey(layer: { id: string; kind: string; transform?: unknown; text?: string; position?: unknown }) {
  return JSON.stringify({
    id: layer.id,
    kind: layer.kind,
    text: layer.text,
    position: layer.position,
    transform: layer.transform,
  });
}
