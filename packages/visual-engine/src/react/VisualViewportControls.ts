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
  rotateSpeed?: number;
  panSpeed?: number;
  zoomSpeed?: number;
  enabled?: boolean;
};

export type VisualCameraPose = {
  position: THREE.Vector3;
  target: THREE.Vector3;
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
  rotateSpeed: number;
  panSpeed: number;
  zoomSpeed: number;
  enabled: boolean;

  private activeAction: ViewportAction | null = null;
  private activePointerId: number | null = null;
  private lastX = 0;
  private lastY = 0;
  private orbitVelocity = new THREE.Vector2();
  private panVelocity = new THREE.Vector2();
  private zoomVelocity = 0;
  private disposed = false;

  constructor(options: VisualViewportControlsOptions) {
    this.camera = options.camera;
    this.element = options.element;
    this.target = options.target?.clone() ?? new THREE.Vector3();

    this.minDistance = options.minDistance ?? 1.4;
    this.maxDistance = options.maxDistance ?? 14;
    this.primaryAction = options.primaryAction ?? "orbit";
    this.wheelAction = options.wheelAction ?? "orbit";
    this.damping = options.damping ?? 0.16;
    this.rotateSpeed = options.rotateSpeed ?? 0.0048;
    this.panSpeed = options.panSpeed ?? 0.0024;
    this.zoomSpeed = options.zoomSpeed ?? 0.0028;
    this.enabled = options.enabled ?? true;

    this.element.style.touchAction = "none";
    this.element.style.cursor = "grab";

    this.element.addEventListener("pointerdown", this.onPointerDown);
    this.element.addEventListener("pointermove", this.onPointerMove);
    this.element.addEventListener("pointerup", this.onPointerUp);
    this.element.addEventListener("pointercancel", this.onPointerUp);
    this.element.addEventListener("pointerleave", this.onPointerLeave);
    this.element.addEventListener("wheel", this.onWheel, { passive: false, capture: true });
    this.element.addEventListener("contextmenu", this.onContextMenu);

    this.camera.lookAt(this.target);
    this.clampDistance();
  }

  update(): void {
    if (this.disposed) return;

    if (!this.enabled) {
      this.clearVelocities();
      this.camera.lookAt(this.target);
      return;
    }

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

  dispose(): void {
    if (this.disposed) return;

    this.releaseActivePointer();

    this.element.removeEventListener("pointerdown", this.onPointerDown);
    this.element.removeEventListener("pointermove", this.onPointerMove);
    this.element.removeEventListener("pointerup", this.onPointerUp);
    this.element.removeEventListener("pointercancel", this.onPointerUp);
    this.element.removeEventListener("pointerleave", this.onPointerLeave);
    this.element.removeEventListener("wheel", this.onWheel, { capture: true });
    this.element.removeEventListener("contextmenu", this.onContextMenu);

    this.clearVelocities();
    this.disposed = true;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;

    if (!enabled) {
      this.activeAction = null;
      this.releaseActivePointer();
      this.clearVelocities();
      this.element.style.cursor = "default";
      return;
    }

    this.element.style.cursor = "grab";
  }

  setTarget(target: THREE.Vector3): void {
    this.target.copy(target);
    this.camera.lookAt(this.target);
  }

  setDistanceLimits(minDistance: number, maxDistance: number): void {
    this.minDistance = Math.max(0.01, Math.min(minDistance, maxDistance));
    this.maxDistance = Math.max(this.minDistance, maxDistance);
    this.clampDistance();
  }

  setPose(position: THREE.Vector3, target: THREE.Vector3): void {
    this.camera.position.copy(position);
    this.target.copy(target);
    this.clearVelocities();
    this.clampDistance();
    this.camera.lookAt(this.target);
  }

  getPose(): VisualCameraPose {
    return {
      position: this.camera.position.clone(),
      target: this.target.clone(),
    };
  }

  reset(position: THREE.Vector3, target: THREE.Vector3): void {
    this.setPose(position, target);
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (!this.enabled || this.disposed) return;

    this.element.focus();
    this.releaseActivePointer();

    this.activePointerId = event.pointerId;
    this.element.setPointerCapture?.(event.pointerId);

    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.activeAction = this.actionForPointer(event);
    this.element.style.cursor = "grabbing";
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.enabled || this.disposed) return;
    if (!this.activeAction || event.pointerId !== this.activePointerId) return;

    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;

    this.lastX = event.clientX;
    this.lastY = event.clientY;

    if (this.activeAction === "orbit") {
      this.orbitVelocity.add(new THREE.Vector2(dx * this.rotateSpeed, dy * this.rotateSpeed));
      return;
    }

    this.panVelocity.add(new THREE.Vector2(dx, dy));
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return;

    this.releaseActivePointer();
    this.activeAction = null;

    if (this.enabled) {
      this.element.style.cursor = "grab";
    }
  };

  private onPointerLeave = (): void => {
    if (!this.enabled || this.disposed) return;
    this.element.style.cursor = this.activeAction ? "grabbing" : "grab";
  };

  private onWheel = (event: WheelEvent): void => {
    if (!this.enabled || this.disposed) return;

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
      this.orbitVelocity.add(
        new THREE.Vector2(event.deltaX * this.rotateSpeed, event.deltaY * this.rotateSpeed),
      );
      return;
    }

    this.panVelocity.add(new THREE.Vector2(event.deltaX, event.deltaY));
  };

  private onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private actionForPointer(event: PointerEvent): ViewportAction {
    if (event.button === 2) return "pan";

    if (event.shiftKey || event.altKey || event.metaKey) {
      return this.primaryAction === "orbit" ? "pan" : "orbit";
    }

    return this.primaryAction;
  }

  private orbitImmediate(thetaDelta: number, phiDelta: number): void {
    const offset = this.camera.position.clone().sub(this.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);

    spherical.theta += thetaDelta;
    spherical.phi += phiDelta;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi, 0.08, Math.PI - 0.08);

    const nextOffset = new THREE.Vector3().setFromSpherical(spherical);
    this.camera.position.copy(this.target).add(nextOffset);
    this.clampDistance();
  }

  private panImmediate(dx: number, dy: number): void {
    const distance = this.camera.position.distanceTo(this.target);
    const scale = distance * this.panSpeed;

    const forward = this.target.clone().sub(this.camera.position).normalize();
    const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();

    const move = right
      .multiplyScalar(-dx * scale)
      .add(up.multiplyScalar(dy * scale));

    this.camera.position.add(move);
    this.target.add(move);
  }

  private zoomImmediate(delta: number): void {
    const direction = this.camera.position.clone().sub(this.target);
    const distance = direction.length();

    if (distance < 1e-9) return;

    const nextDistance = THREE.MathUtils.clamp(
      distance * (1 + delta * this.zoomSpeed),
      this.minDistance,
      this.maxDistance,
    );

    direction.normalize().multiplyScalar(nextDistance);
    this.camera.position.copy(this.target).add(direction);
  }

  private clampDistance(): void {
    const direction = this.camera.position.clone().sub(this.target);
    const distance = direction.length();

    if (distance < 1e-9) {
      this.camera.position.copy(this.target).add(new THREE.Vector3(0, -this.minDistance, this.minDistance));
      return;
    }

    const clamped = THREE.MathUtils.clamp(distance, this.minDistance, this.maxDistance);
    direction.normalize().multiplyScalar(clamped);
    this.camera.position.copy(this.target).add(direction);
  }

  private releaseActivePointer(): void {
    if (this.activePointerId === null) return;

    try {
      this.element.releasePointerCapture?.(this.activePointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }

    this.activePointerId = null;
  }

  private clearVelocities(): void {
    this.orbitVelocity.set(0, 0);
    this.panVelocity.set(0, 0);
    this.zoomVelocity = 0;
  }
}