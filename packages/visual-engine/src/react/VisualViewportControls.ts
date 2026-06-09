"use client";

import * as THREE from "three";

export type ViewportAction = "orbit" | "pan";

export type VisualViewportControlsOptions = {
  camera: THREE.PerspectiveCamera;
  element: HTMLCanvasElement;
  target?: THREE.Vector3;
  minDistance?: number;
  maxDistance?: number;
  primaryAction?: ViewportAction;
  wheelAction?: ViewportAction;
  damping?: number;
};

export class VisualViewportControls {
  readonly camera: THREE.PerspectiveCamera;
  readonly element: HTMLCanvasElement;
  readonly target: THREE.Vector3;
  minDistance: number;
  maxDistance: number;
  primaryAction: ViewportAction;
  wheelAction: ViewportAction;
  damping: number;

  private activeAction: ViewportAction | null = null;
  private lastX = 0;
  private lastY = 0;
  private orbitVelocity = new THREE.Vector2();
  private panVelocity = new THREE.Vector2();
  private zoomVelocity = 0;

  constructor(options: VisualViewportControlsOptions) {
    this.camera = options.camera;
    this.element = options.element;
    this.target = options.target?.clone() ?? new THREE.Vector3();
    this.minDistance = options.minDistance ?? 1.4;
    this.maxDistance = options.maxDistance ?? 14;
    this.primaryAction = options.primaryAction ?? "orbit";
    this.wheelAction = options.wheelAction ?? "orbit";
    this.damping = options.damping ?? 0.16;

    this.element.style.touchAction = "none";
    this.element.style.cursor = "grab";
    this.element.addEventListener("pointerdown", this.onPointerDown);
    this.element.addEventListener("pointermove", this.onPointerMove);
    this.element.addEventListener("pointerup", this.onPointerUp);
    this.element.addEventListener("pointerleave", this.onPointerUp);
    this.element.addEventListener("wheel", this.onWheel, { passive: false, capture: true });
    this.element.addEventListener("contextmenu", this.onContextMenu);
    this.camera.lookAt(this.target);
  }

  update() {
    if (Math.abs(this.orbitVelocity.x) > 1e-5 || Math.abs(this.orbitVelocity.y) > 1e-5) {
      this.orbitImmediate(this.orbitVelocity.x, this.orbitVelocity.y);
      this.orbitVelocity.multiplyScalar(1 - this.damping);
    }

    if (Math.abs(this.panVelocity.x) > 1e-5 || Math.abs(this.panVelocity.y) > 1e-5) {
      this.panImmediate(this.panVelocity.x, this.panVelocity.y);
      this.panVelocity.multiplyScalar(1 - this.damping);
    }

    if (Math.abs(this.zoomVelocity) > 1e-5) {
      this.zoomImmediate(this.zoomVelocity);
      this.zoomVelocity *= 1 - this.damping;
    }

    this.camera.lookAt(this.target);
  }

  setTarget(target: THREE.Vector3) {
    this.target.copy(target);
    this.camera.lookAt(this.target);
  }

  setDistanceLimits(minDistance: number, maxDistance: number) {
    this.minDistance = minDistance;
    this.maxDistance = maxDistance;
    this.clampDistance();
  }

  dispose() {
    this.element.removeEventListener("pointerdown", this.onPointerDown);
    this.element.removeEventListener("pointermove", this.onPointerMove);
    this.element.removeEventListener("pointerup", this.onPointerUp);
    this.element.removeEventListener("pointerleave", this.onPointerUp);
    this.element.removeEventListener("wheel", this.onWheel, { capture: true });
    this.element.removeEventListener("contextmenu", this.onContextMenu);
  }

  private onPointerDown = (event: PointerEvent) => {
    this.element.focus();
    this.element.setPointerCapture?.(event.pointerId);
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.activeAction = this.actionForPointer(event);
    this.element.style.cursor = "grabbing";
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.activeAction) return;
    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;

    if (this.activeAction === "orbit") {
      this.orbitVelocity.add(new THREE.Vector2(dx * 0.0048, dy * 0.0048));
    } else {
      this.panVelocity.add(new THREE.Vector2(dx, dy));
    }
  };

  private onPointerUp = (event: PointerEvent) => {
    this.element.releasePointerCapture?.(event.pointerId);
    this.activeAction = null;
    this.element.style.cursor = "grab";
  };

  private onWheel = (event: WheelEvent) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (event.ctrlKey || event.metaKey) {
      this.zoomVelocity += event.deltaY;
      return;
    }

    if (event.shiftKey) {
      this.panVelocity.add(new THREE.Vector2(event.deltaX, event.deltaY));
      return;
    }

    if (this.wheelAction === "orbit") {
      this.orbitVelocity.add(new THREE.Vector2(event.deltaX * 0.0042, event.deltaY * 0.0042));
    } else {
      this.panVelocity.add(new THREE.Vector2(event.deltaX, event.deltaY));
    }
  };

  private onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };

  private actionForPointer(event: PointerEvent): ViewportAction {
    if (event.button === 2) return "pan";
    if (event.shiftKey || event.altKey || event.metaKey) return this.primaryAction === "orbit" ? "pan" : "orbit";
    return this.primaryAction;
  }

  private orbitImmediate(thetaDelta: number, phiDelta: number) {
    const offset = this.camera.position.clone().sub(this.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta += thetaDelta;
    spherical.phi += phiDelta;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi, 0.08, Math.PI - 0.08);
    offset.setFromSpherical(spherical);
    this.camera.position.copy(this.target).add(offset);
  }

  private panImmediate(deltaX: number, deltaY: number) {
    const distance = this.camera.position.distanceTo(this.target);
    const height = this.element.clientHeight || 1;
    const worldPerPixel = (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * distance) / height;
    const xAxis = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0);
    const yAxis = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1);
    const movement = xAxis.multiplyScalar(-deltaX * worldPerPixel).add(yAxis.multiplyScalar(deltaY * worldPerPixel));
    this.camera.position.add(movement);
    this.target.add(movement);
  }

  private zoomImmediate(deltaY: number) {
    const offset = this.camera.position.clone().sub(this.target);
    const scale = Math.exp(deltaY * 0.0018);
    offset.setLength(THREE.MathUtils.clamp(offset.length() * scale, this.minDistance, this.maxDistance));
    this.camera.position.copy(this.target).add(offset);
  }

  private clampDistance() {
    const offset = this.camera.position.clone().sub(this.target);
    offset.setLength(THREE.MathUtils.clamp(offset.length(), this.minDistance, this.maxDistance));
    this.camera.position.copy(this.target).add(offset);
  }
}
