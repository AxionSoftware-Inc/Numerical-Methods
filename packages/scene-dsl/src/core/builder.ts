import type {
  SceneAnimation,
  SceneBuilderApi,
  SceneBuildOptions,
  SceneCameraAnimation,
  SceneCameraSpec,
  SceneCommand,
  SceneDslSpec,
  SceneObject,
  SceneObjectId,
  SceneObjectRef,
} from "./types";
import type { VisualSceneSpec } from "@methodslab/visual-engine/core";

export type MathSceneOptions = SceneBuildOptions & {
  camera?: SceneCameraSpec;
  cameraAnimation?: SceneCameraAnimation;
};

export class MathSceneBuilder implements SceneBuilderApi {
  readonly id: string;
  readonly name: string;

  private readonly fps: number;
  private readonly background: string;
  private readonly metadata: SceneBuildOptions["metadata"];
  private readonly camera?: SceneCameraSpec;
  private readonly cameraAnimation?: SceneCameraAnimation;

  private objects: SceneObject[] = [];
  private commands: SceneCommand[] = [];
  private cursor = 0;
  private objectCounter = 0;
  private commandCounter = 0;

  constructor(options: MathSceneOptions = {}) {
    this.id = options.id ?? "math-scene";
    this.name = options.name ?? "Math Scene";
    this.fps = options.fps ?? 30;
    this.background = options.background ?? "#050b0f";
    this.metadata = options.metadata;
    this.camera = options.camera;
    this.cameraAnimation = options.cameraAnimation;
  }

  add(object: SceneObject): SceneObjectRef {
    const normalized = this.normalizeObject(object);
    this.objects.push(normalized);

    return {
      id: normalized.id,
      kind: normalized.kind,
    };
  }

  group(id: string, children: SceneObject[] = []): SceneObjectRef<"group"> {
    return this.add({
      id,
      kind: "group",
      objectId: id,
      children,
    }) as SceneObjectRef<"group">;
  }

  text(
    text: string,
    options: {
      id?: string;
      objectId?: string;
      position?: [number, number, number];
      color?: string;
      scale?: number;
      name?: string;
    } = {},
  ): SceneObjectRef<"text"> {
    const id = options.id ?? this.nextObjectId("text");

    return this.add({
      id,
      kind: "text",
      objectId: options.objectId ?? id,
      name: options.name,
      text,
      position: options.position,
      color: options.color ?? "#f8fafc",
      scale: options.scale ?? 0.14,
    }) as SceneObjectRef<"text">;
  }

  tex(
    source: string,
    options: {
      id?: string;
      objectId?: string;
      position?: [number, number, number];
      color?: string;
      scale?: number;
      name?: string;
    } = {},
  ): SceneObjectRef<"tex"> {
    const id = options.id ?? this.nextObjectId("tex");

    return this.add({
      id,
      kind: "tex",
      objectId: options.objectId ?? id,
      name: options.name,
      source,
      position: options.position,
      color: options.color ?? "#67e8f9",
      scale: options.scale ?? 0.14,
    }) as SceneObjectRef<"tex">;
  }

  label(
    text: string,
    options: {
      id?: string;
      objectId?: string;
      position: [number, number, number];
      color?: string;
      scale?: number;
      format?: "text" | "latex";
      name?: string;
    },
  ): SceneObjectRef<"label"> {
    const id = options.id ?? this.nextObjectId("label");

    return this.add({
      id,
      kind: "label",
      objectId: options.objectId ?? id,
      name: options.name,
      text,
      position: options.position,
      color: options.color ?? "#f8fafc",
      scale: options.scale ?? 0.14,
      format: options.format ?? "text",
    }) as SceneObjectRef<"label">;
  }

  axes(
    options: {
      id?: string;
      objectId?: string;
      origin?: [number, number, number];
      size?: number;
      xLabel?: string;
      yLabel?: string;
      zLabel?: string;
      color?: string;
      name?: string;
    } = {},
  ): SceneObjectRef<"axes"> {
    const id = options.id ?? "axes";

    return this.add({
      id,
      kind: "axes",
      objectId: options.objectId ?? id,
      name: options.name,
      origin: options.origin,
      size: options.size,
      xLabel: options.xLabel,
      yLabel: options.yLabel,
      zLabel: options.zLabel,
      color: options.color,
    }) as SceneObjectRef<"axes">;
  }

  grid(
    options: {
      id?: string;
      objectId?: string;
      size?: number;
      divisions?: number;
      y?: number;
      color?: string;
      opacity?: number;
      name?: string;
    } = {},
  ): SceneObjectRef<"grid"> {
    const id = options.id ?? "grid";

    return this.add({
      id,
      kind: "grid",
      objectId: options.objectId ?? id,
      name: options.name,
      size: options.size,
      divisions: options.divisions,
      y: options.y,
      color: options.color,
      opacity: options.opacity,
    }) as SceneObjectRef<"grid">;
  }

  box(
    options: {
      id?: string;
      objectId?: string;
      position: [number, number, number];
      size: [number, number, number];
      color?: string;
      opacity?: number;
      name?: string;
    },
  ): SceneObjectRef<"box"> {
    const id = options.id ?? this.nextObjectId("box");

    return this.add({
      id,
      kind: "box",
      objectId: options.objectId ?? id,
      name: options.name,
      position: options.position,
      size: options.size,
      color: options.color ?? "#38bdf8",
      opacity: options.opacity,
    }) as SceneObjectRef<"box">;
  }

  marker(
    options: {
      id?: string;
      objectId?: string;
      position: [number, number, number];
      radius?: number;
      color?: string;
      label?: string;
      name?: string;
    },
  ): SceneObjectRef<"marker"> {
    const id = options.id ?? this.nextObjectId("marker");

    return this.add({
      id,
      kind: "marker",
      objectId: options.objectId ?? id,
      name: options.name,
      position: options.position,
      radius: options.radius,
      color: options.color ?? "#facc15",
      label: options.label,
    }) as SceneObjectRef<"marker">;
  }

  arrow(
    options: {
      id?: string;
      objectId?: string;
      from: [number, number, number];
      to: [number, number, number];
      color?: string;
      opacity?: number;
      headSize?: number;
      name?: string;
    },
  ): SceneObjectRef<"arrow"> {
    const id = options.id ?? this.nextObjectId("arrow");

    return this.add({
      id,
      kind: "arrow",
      objectId: options.objectId ?? id,
      name: options.name,
      from: options.from,
      to: options.to,
      color: options.color ?? "#fb7185",
      opacity: options.opacity,
      headSize: options.headSize,
    }) as SceneObjectRef<"arrow">;
  }

  path(
    points: [number, number, number][],
    options: {
      id?: string;
      objectId?: string;
      color?: string;
      opacity?: number;
      closed?: boolean;
      name?: string;
    } = {},
  ): SceneObjectRef<"path"> {
    const id = options.id ?? this.nextObjectId("path");

    return this.add({
      id,
      kind: "path",
      objectId: options.objectId ?? id,
      name: options.name,
      points,
      color: options.color ?? "#67e8f9",
      opacity: options.opacity,
      closed: options.closed,
    }) as SceneObjectRef<"path">;
  }

  plane(
    options: {
      id?: string;
      objectId?: string;
      position: [number, number, number];
      size: [number, number];
      color?: string;
      opacity?: number;
      rotation?: [number, number, number];
      name?: string;
    },
  ): SceneObjectRef<"plane"> {
    const id = options.id ?? this.nextObjectId("plane");

    return this.add({
      id,
      kind: "plane",
      objectId: options.objectId ?? id,
      name: options.name,
      position: options.position,
      size: options.size,
      color: options.color ?? "#38bdf8",
      opacity: options.opacity,
      rotation: options.rotation,
    }) as SceneObjectRef<"plane">;
  }

    surface(
    scene: VisualSceneSpec,
    options: {
      id?: string;
      objectId?: string;
      name?: string;
      opacity?: number;
    } = {},
  ): SceneObjectRef<"surface"> {
    const id = options.id ?? this.nextObjectId("surface");

    return this.add({
      id,
      kind: "surface",
      objectId: options.objectId ?? id,
      name: options.name,
      scene,
      opacity: options.opacity,
    }) as SceneObjectRef<"surface">;
  }

  custom(
    scene: VisualSceneSpec,
    options: {
      id?: string;
      objectId?: string;
      name?: string;
      opacity?: number;
    } = {},
  ): SceneObjectRef<"custom"> {
    const id = options.id ?? this.nextObjectId("custom");

    return this.add({
      id,
      kind: "custom",
      objectId: options.objectId ?? id,
      name: options.name,
      scene,
      opacity: options.opacity,
    }) as SceneObjectRef<"custom">;
  }

  play(...animations: SceneAnimation[]): SceneCommand {
    const duration = Math.max(
      0,
      ...animations.map((animation) => animation.duration ?? 0),
    );

    const command: SceneCommand = {
      id: this.nextCommandId(),
      start: this.cursor,
      duration,
      animations,
    };

    this.commands.push(command);
    this.cursor += duration;

    return command;
  }

  wait(duration: number): SceneCommand {
    const normalizedDuration = Math.max(0, duration);

    const command: SceneCommand = {
      id: this.nextCommandId(),
      start: this.cursor,
      duration: normalizedDuration,
      animations: [
        {
          kind: "wait",
          duration: normalizedDuration,
        },
      ],
    };

    this.commands.push(command);
    this.cursor += normalizedDuration;

    return command;
  }

  setTime(time: number): void {
    this.cursor = Math.max(0, time);
  }

  getTime(): number {
    return this.cursor;
  }

  toSpec(): SceneDslSpec {
    return {
      id: this.id,
      name: this.name,
      fps: this.fps,
      duration: this.cursor,
      camera: this.camera,
      cameraAnimation: this.cameraAnimation,
      objects: this.objects,
      commands: this.commands,
      metadata: {
        ...this.metadata,
        background: this.background,
      },
    };
  }

  toVisualScene(): never {
    throw new Error("toVisualScene() is implemented in compiler.ts. Use compileSceneToVisualScene(scene.toSpec()).");
  }

  toVideoProject(): never {
    throw new Error("toVideoProject() is implemented in compiler.ts. Use compileSceneToVideoProject(scene.toSpec()).");
  }

  private normalizeObject(object: SceneObject): SceneObject {
    const id = object.id || this.nextObjectId(object.kind);
    const objectId = object.objectId ?? id;

    return {
      ...object,
      id,
      objectId,
    } as SceneObject;
  }

  private nextObjectId(prefix: string): SceneObjectId {
    this.objectCounter += 1;
    return `${prefix}-${this.objectCounter}`;
  }

  private nextCommandId(): string {
    this.commandCounter += 1;
    return `cmd-${this.commandCounter}`;
  }
}

export function createMathScene(options: MathSceneOptions = {}): MathSceneBuilder {
  return new MathSceneBuilder(options);
}