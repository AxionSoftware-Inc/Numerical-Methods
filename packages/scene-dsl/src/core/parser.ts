import type { CSSProperties } from "react";
import type { CameraKeyframe, EasingId } from "@methodslab/video-engine/core";
import type { VisualLayerSpec, VisualVec3 } from "@methodslab/visual-engine/core";
import type {
  SceneLabelObject,
  SceneObjectKeyframe,
  SceneObjectScript,
  SceneScript,
  SceneSlide,
  SceneSlideEffect,
} from "./types";

export const DEFAULT_CAMERA_PRESET = "default";

export const CAMERA_PRESETS: Record<string, Pick<CameraKeyframe, "position" | "target" | "fov">> = {
  default: { position: [4.8, 3.9, 5.2], target: [0, -0.1, 0], fov: 40 },
  front: { position: [4.8, 3.9, 5.2], target: [0, -0.1, 0], fov: 40 },
  right: { position: [5.6, 3.3, 0.8], target: [0, -0.08, 0], fov: 40 },
  left: { position: [-5.6, 3.3, 0.8], target: [0, -0.08, 0], fov: 40 },
  top: { position: [0.15, 6.4, 1.9], target: [0, -0.12, 0], fov: 42 },
  zoom: { position: [2.8, 2.5, 3.1], target: [0.18, -0.04, 0.04], fov: 34 },
  reset: { position: [4.8, 3.9, 5.2], target: [0, -0.1, 0], fov: 40 },
};

export const defaultSceneScript: SceneScript = {
  version: 1,
  duration: 10,
  fps: 30,
  camera: {
    orbit: false,
    turns: 1,
    keyframes: [],
  },
  objects: {
    volume: {},
    axes: {},
    cameraPath: {},
    title: {},
  },
  labels: [],
  title: "Yangi sahna",
  latex: "",
  slides: [
    {
      start: 0,
      end: 10,
      title: "Yangi sahna",
      latex: "",
      effect: "cut",
    },
  ],
};

export const defaultSceneCode = `config:
  duration: 10
  camera: default
  theme: black

object volume:

slide "Yangi sahna":
  camera: default
  latex:`;

export function parseSceneScript(value: string): { script: SceneScript; error: string | null } {
  if (value.trim().startsWith("{")) {
    return parseJsonSceneScript(value);
  }

  return parseTimelineCode(value);
}

export function updateSceneNumber(source: string, path: "duration" | "fps", value: number): string {
  if (source.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(source) as Record<string, unknown>;
      parsed[path] = value;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return source;
    }
  }

  const lines = source.split(/\r?\n/);
  const lineIndex = lines.findIndex((line) => {
    const trimmed = line.trim();
    return trimmed.startsWith(`${path} `) || trimmed.startsWith(`${path}:`);
  });

  if (lineIndex >= 0) {
    const line = lines[lineIndex] ?? "";
    const indent = line.match(/^\s*/)?.[0] ?? "";
    const separator = line.includes(":") ? ":" : " ";
    lines[lineIndex] = `${indent}${path}${separator}${separator === ":" ? ` ${value}` : value}`;
    return lines.join("\n");
  }

  return `${path}: ${value}\n${source}`;
}

export function activeSceneSlide(script: SceneScript, time: number): SceneSlide {
  return (
    script.slides.find((slide) => time >= slide.start && time < slide.end) ??
    script.slides.at(-1) ?? {
      start: 0,
      end: Number.POSITIVE_INFINITY,
      title: script.title,
      latex: script.latex,
      effect: "cut",
    }
  );
}

export function animateSlideText(slide: SceneSlide, time: number): SceneSlide {
  const progress = clamp01((time - slide.start) / Math.max(slide.end - slide.start, 1e-9));

  if (slide.effect !== "typewriter") {
    return slide;
  }

  return {
    ...slide,
    title: sliceByProgress(slide.title, Math.max(0.08, progress)),
    latex: sliceByProgress(slide.latex, Math.max(0.18, progress)),
  };
}

export function slideOverlayStyle(slide: SceneSlide, time: number): CSSProperties {
  const progress = clamp01((time - slide.start) / Math.max(slide.end - slide.start, 1e-9));
  const entrance = Math.min(1, progress / 0.22);

  if (slide.effect === "fade") {
    return { opacity: entrance };
  }

  if (slide.effect === "slide") {
    return {
      opacity: entrance,
      transform: `translate3d(${(1 - entrance) * -18}px, ${(1 - entrance) * 8}px, 0)`,
    };
  }

  return {
    opacity: 1,
    transform: "translate3d(0, 0, 0)",
  };
}

export function latexPreview(text: string): string {
  return text
    .replaceAll("\\int", "∫")
    .replaceAll("\\sum", "∑")
    .replaceAll("\\,", " ")
    .replaceAll("\\pi", "π")
    .replaceAll("\\Delta", "Δ")
    .replaceAll("\\approx", "≈")
    .replaceAll("\\cdot", "·")
    .replaceAll("\\times", "×")
    .replace(/_\{([^{}]+)\}/g, "_$1")
    .replace(/\^\{([^{}]+)\}/g, "^$1")
    .replace(/[{}]/g, "");
}

export function describeKeyframe(keyframe: SceneObjectKeyframe): string {
  const parts = [
    keyframe.position ? `pos=[${keyframe.position.join(", ")}]` : null,
    keyframe.rotation ? `rot=[${keyframe.rotation.join(", ")}]` : null,
    keyframe.scale ? `scale=[${keyframe.scale.join(", ")}]` : null,
    keyframe.opacity !== undefined ? `opacity=${keyframe.opacity}` : null,
    keyframe.easing ? `ease=${keyframe.easing}` : null,
  ].filter(Boolean);

  return parts.join(" ");
}

export function createLabelLayers(labels: SceneLabelObject[]): VisualLayerSpec[] {
  return labels.map((label) => ({
    kind: "label",
    id: `script-label-${label.id}`,
    objectId: label.objectId ?? label.id,
    text: label.text,
    position: label.position,
    color: label.color ?? "#f8fafc",
    scale: label.scale ?? 0.16,
    format: label.format ?? "text",
  }));
}

export function cameraPreset(value: string): Pick<CameraKeyframe, "position" | "target" | "fov"> | null {
  return CAMERA_PRESETS[value] ?? CAMERA_PRESETS[DEFAULT_CAMERA_PRESET] ?? null;
}

function parseTimelineCode(source: string): { script: SceneScript; error: string | null } {
  const script = createEmptySceneScript();
  let currentObject: string | null = null;
  let currentSlide: SceneSlide | null = null;
  let currentLabel: string | null = null;
  let currentBlock: "config" | "animate" | null = null;
  const errors: string[] = [];

  source.split(/\r?\n/).forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const line = rawLine.trim();

    if (!line || line.startsWith("#") || line.startsWith("//")) return;

    if (line === "config:") {
      currentBlock = "config";
      currentObject = null;
      currentSlide = null;
      currentLabel = null;
      return;
    }

    if (line === "animate:") {
      if (!currentSlide) {
        errors.push(`Line ${lineNumber}: animate must be inside a slide block.`);
        return;
      }

      currentBlock = "animate";
      currentObject = null;
      currentLabel = null;
      return;
    }

    if (/^slide\s+.+:$/.test(line)) {
      const slide = parseSmartSlideLine(line, script);

      if (!slide) {
        errors.push(`Line ${lineNumber}: slide format should be slide "Title":`);
        return;
      }

      script.slides.push(slide);
      currentSlide = slide;
      currentObject = null;
      currentLabel = null;
      currentBlock = null;
      return;
    }

    if (line.startsWith("object ") && line.endsWith(":")) {
      const objectId = normalizeObjectId(line.slice("object ".length, -1).trim());

      if (!objectId) {
        errors.push(`Line ${lineNumber}: unknown object name.`);
        return;
      }

      ensureObject(script, objectId);
      currentObject = objectId;
      currentSlide = null;
      currentLabel = null;
      currentBlock = null;
      return;
    }

    if (line.includes(":")) {
      const handled = handleColonInstruction(line, {
        script,
        currentBlock,
        currentObject,
        currentSlide,
      });

      if (handled) return;
    }

    if (line.startsWith("duration ")) {
      script.duration = parsePositiveNumber(line.slice("duration ".length), script.duration);
      currentObject = null;
      currentSlide = null;
      currentLabel = null;
      return;
    }

    if (line.startsWith("fps ")) {
      script.fps = parsePositiveNumber(line.slice("fps ".length), script.fps);
      currentObject = null;
      currentSlide = null;
      currentLabel = null;
      return;
    }

    if (line.startsWith("camera ")) {
      script.camera = parseCameraLine(line, script.camera);
      currentObject = null;
      currentSlide = null;
      currentLabel = null;
      return;
    }

    if (line.startsWith("label ") || line.startsWith("text ")) {
      const label = parseLabelLine(line);

      if (!label) {
        errors.push(`Line ${lineNumber}: text format should be "text note at x y z content ...".`);
        return;
      }

      script.labels = [...script.labels.filter((item) => item.id !== label.id), label];
      ensureObject(script, label.id);
      currentObject = label.id;
      currentSlide = null;
      currentLabel = label.id;
      return;
    }

    if (line.startsWith("object ")) {
      const objectId = normalizeObjectId(line.slice("object ".length).trim());

      if (!objectId) {
        errors.push(`Line ${lineNumber}: unknown object name.`);
        return;
      }

      ensureObject(script, objectId);
      currentObject = objectId;
      currentSlide = null;
      currentLabel = null;
      return;
    }

    if (line.startsWith("slide ") || line.startsWith("scene ")) {
      const slide = parseSlideLine(line, script);

      if (!slide) {
        errors.push(`Line ${lineNumber}: scene format should be "scene 0 to 2".`);
        return;
      }

      script.slides.push(slide);
      currentSlide = slide;
      currentObject = null;
      currentLabel = null;
      return;
    }

    if (line.startsWith("title ")) {
      const title = line.slice("title ".length).trim();
      if (currentSlide) currentSlide.title = title;
      else script.title = title;
      return;
    }

    if (line.startsWith("latex ")) {
      const latex = line.slice("latex ".length).trim();
      if (currentSlide) currentSlide.latex = latex;
      else script.latex = latex;
      return;
    }

    if (line.startsWith("content ")) {
      if (!currentLabel) {
        errors.push(`Line ${lineNumber}: content must be inside a text block.`);
        return;
      }

      script.labels = script.labels.map((label) =>
        label.id === currentLabel ? { ...label, text: line.slice("content ".length).trim() } : label,
      );
      return;
    }

    if (line.startsWith("effect ")) {
      if (!currentSlide) {
        errors.push(`Line ${lineNumber}: effect must be inside a slide block.`);
        return;
      }

      currentSlide.effect = parseSlideEffect(line.slice("effect ".length).trim());
      return;
    }

    if (line.startsWith("spin ")) {
      if (!currentObject) {
        errors.push(`Line ${lineNumber}: spin must be inside an object block.`);
        return;
      }

      ensureObject(script, currentObject);
      script.objects[currentObject].spin = parseSpinLine(line, script.objects[currentObject].spin);
      return;
    }

    if (
      line.startsWith("move ") ||
      line.startsWith("rotate ") ||
      line.startsWith("scale ") ||
      line.startsWith("show ") ||
      line.startsWith("hide ")
    ) {
      if (!currentObject) {
        errors.push(`Line ${lineNumber}: ${line.split(/\s+/)[0]} must be inside an object block.`);
        return;
      }

      const keyframes = parseActionLine(line);

      if (!keyframes) {
        errors.push(`Line ${lineNumber}: action format should be "move at 3.5 to x y z".`);
        return;
      }

      const objectId = currentObject;
      keyframes.forEach((keyframe) => appendObjectKeyframe(script, objectId, keyframe));
      return;
    }

    if (line.startsWith("replace ")) {
      const replacement = parseReplaceLine(line);

      if (!replacement) {
        errors.push(`Line ${lineNumber}: replace format should be "replace old with new at 4".`);
        return;
      }

      appendObjectKeyframe(script, replacement.hide.objectId, replacement.hide.keyframe);
      appendObjectKeyframe(script, replacement.show.objectId, replacement.show.keyframe);
      return;
    }

    if (line.startsWith("at ")) {
      if (!currentObject) {
        errors.push(`Line ${lineNumber}: at must be inside an object block.`);
        return;
      }

      const keyframe = parseKeyframeLine(line, script.duration);

      if (!keyframe) {
        errors.push(`Line ${lineNumber}: keyframe format should start with "at 3.5 pos x y z".`);
        return;
      }

      appendObjectKeyframe(script, currentObject, keyframe);
      return;
    }

    errors.push(`Line ${lineNumber}: unknown instruction.`);
  });

  if (script.slides.length === 0) {
    script.slides = [
      {
        start: 0,
        end: Number.POSITIVE_INFINITY,
        title: script.title,
        latex: script.latex,
        effect: "cut",
      },
    ];
  } else {
    distributeSlides(script);
  }

  return {
    script,
    error: errors.length > 0 ? errors.slice(0, 2).join(" ") : null,
  };
}

function createEmptySceneScript(): SceneScript {
  return {
    version: 1,
    duration: defaultSceneScript.duration,
    fps: defaultSceneScript.fps,
    camera: {
      orbit: false,
      turns: defaultSceneScript.camera.turns,
      keyframes: [],
    },
    objects: {
      volume: {},
      axes: {},
      cameraPath: {},
      title: {},
    },
    labels: [],
    title: defaultSceneScript.title,
    latex: defaultSceneScript.latex,
    slides: [],
  };
}

function handleColonInstruction(
  line: string,
  context: {
    script: SceneScript;
    currentBlock: "config" | "animate" | null;
    currentObject: string | null;
    currentSlide: SceneSlide | null;
  },
): boolean {
  const separator = line.indexOf(":");
  if (separator < 0) return false;

  const key = line.slice(0, separator).trim();
  const value = line.slice(separator + 1).trim();

  if (context.currentBlock === "config") {
    if (key === "duration") context.script.duration = parsePositiveNumber(value, context.script.duration);
    if (key === "fps") context.script.fps = parsePositiveNumber(value, context.script.fps);
    if (key === "camera") applyCameraPreset(context.script, 0, value || DEFAULT_CAMERA_PRESET, true);
    return true;
  }

  if (context.currentObject && key === "spin") {
    ensureObject(context.script, context.currentObject);
    context.script.objects[context.currentObject].spin = parseSpinLine(
      `spin ${value}`,
      context.script.objects[context.currentObject].spin,
    );
    return true;
  }

  if (context.currentSlide && context.currentBlock === "animate") {
    applySlideAnimation(context.script, context.currentSlide, key, value);
    return true;
  }

  if (context.currentSlide) {
    if (key === "camera") {
      applyCameraPreset(context.script, context.currentSlide.start, value);
      return true;
    }

    if (key === "latex") {
      context.currentSlide.latex = stripQuotes(value);
      return true;
    }

    if (key === "title") {
      context.currentSlide.title = stripQuotes(value);
      return true;
    }

    if (key === "effect") {
      context.currentSlide.effect = parseSlideEffect(value);
      return true;
    }

    if (key === "duration") {
      context.currentSlide.end =
        context.currentSlide.start + parseDuration(value, context.currentSlide.end - context.currentSlide.start);
      return true;
    }
  }

  return false;
}

function parseSmartSlideLine(line: string, script: SceneScript): SceneSlide | null {
  const match = line.match(/^slide\s+"(.+)"\s*:$/) ?? line.match(/^slide\s+(.+)\s*:$/);
  if (!match) return null;

  const previous = script.slides.at(-1);
  const start = previous && Number.isFinite(previous.end) ? previous.end : 0;

  return {
    start,
    end: start + 2,
    title: stripQuotes(match[1] ?? ""),
    latex: script.latex,
    effect: "slide",
  };
}

function distributeSlides(script: SceneScript): void {
  if (script.slides.length === 0) return;

  const autoStep = script.duration / script.slides.length;
  let cursor = 0;

  script.slides = script.slides.map((slide) => {
    const duration = slide.end - slide.start;
    const explicitDuration = duration !== 2 ? duration : autoStep;
    const next: SceneSlide = {
      ...slide,
      start: cursor,
      end: cursor + explicitDuration,
    };

    cursor = next.end;
    return next;
  });
}

function applySlideAnimation(script: SceneScript, slide: SceneSlide, objectId: string, action: string): void {
  const id = normalizeObjectId(objectId) ?? objectId;

  if (action.startsWith("move ")) {
    appendObjectKeyframe(script, id, {
      time: slide.end,
      position: namedPosition(action.slice("move ".length).trim()) ?? [0, 0, 0],
      easing: "smoothstep",
    });
    return;
  }

  addTextLabel(script, id, action);
}

function applyCameraPreset(script: SceneScript, time: number, preset: string, replace = false): void {
  const camera = cameraPreset(preset);
  if (!camera) return;

  const keyframe: CameraKeyframe = {
    time,
    position: camera.position,
    target: camera.target,
    fov: camera.fov,
    easing: "smoothstep",
  };

  script.camera = {
    orbit: false,
    turns: script.camera.turns,
    keyframes: [...(replace ? [] : script.camera.keyframes), keyframe].sort((a, b) => a.time - b.time),
  };
}

function addTextLabel(script: SceneScript, id: string, text: string): void {
  const label: SceneLabelObject = {
    id,
    kind: "label",
    objectId: id,
    text: stripQuotes(text),
    position: defaultLabelPosition(id),
    color: parseColor("sky"),
    scale: 0.15,
    format: "text",
  };

  script.labels = [...script.labels.filter((item) => item.id !== id), label];
  ensureObject(script, id);
}

function parseDuration(value: string, fallback: number): number {
  const numeric = Number(value.replace(/s$/u, ""));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function stripQuotes(value: string): string {
  return value.replace(/^["']|["']$/g, "");
}

function parseJsonSceneScript(value: string): { script: SceneScript; error: string | null } {
  try {
    const parsed = JSON.parse(value) as Partial<SceneScript>;
    const objects = parseSceneObjects(parsed.objects);

    return {
      script: {
        version: 1,
        duration: numberOrDefault(parsed.duration, defaultSceneScript.duration),
        fps: numberOrDefault(parsed.fps, defaultSceneScript.fps),
        camera: {
          orbit: Boolean(parsed.camera?.orbit),
          turns: numberOrDefault(parsed.camera?.turns, defaultSceneScript.camera.turns),
          keyframes: parseCameraKeyframes(parsed.camera?.keyframes),
        },
        objects,
        labels: parseLabels(parsed.labels),
        title: typeof parsed.title === "string" ? parsed.title : defaultSceneScript.title,
        latex: typeof parsed.latex === "string" ? parsed.latex : defaultSceneScript.latex,
        slides: parseSlides(parsed.slides, parsed.title, parsed.latex),
      },
      error: null,
    };
  } catch {
    return {
      script: defaultSceneScript,
      error: "Script syntax error. Using default scene script.",
    };
  }
}

function parseSceneObjects(value: unknown): SceneScript["objects"] {
  const base: SceneScript["objects"] = {
    volume: {},
    axes: {},
    cameraPath: {},
    title: {},
  };

  if (!value || typeof value !== "object") {
    return base;
  }

  const raw = value as Record<string, unknown>;

  Object.entries(raw).forEach(([id, object]) => {
    base[id] = parseObjectScript(object, base[id] ?? {});
  });

  base.volume = parseObjectScript(raw.volume, base.volume);
  base.axes = parseObjectScript(raw.axes, base.axes);
  base.cameraPath = parseObjectScript(raw.cameraPath, base.cameraPath);
  base.title = parseObjectScript(raw.title, base.title);

  return base;
}

function parseObjectScript(value: unknown, fallback: SceneObjectScript): SceneObjectScript {
  if (!value || typeof value !== "object") return fallback;

  const object = value as Partial<SceneObjectScript>;

  return {
    spin: parseSpin(object.spin, fallback.spin),
    keyframes: parseObjectKeyframes(object.keyframes, fallback.keyframes),
  };
}

function appendObjectKeyframe(script: SceneScript, objectId: string, keyframe: SceneObjectKeyframe): void {
  ensureObject(script, objectId);

  const existing = script.objects[objectId].keyframes ?? [];
  const sameTimeIndex = existing.findIndex((item) => Math.abs(item.time - keyframe.time) < 1e-9);

  if (sameTimeIndex >= 0) {
    existing[sameTimeIndex] = mergeSceneKeyframes(existing[sameTimeIndex], keyframe);
    script.objects[objectId].keyframes = [...existing].sort((a, b) => a.time - b.time);
    return;
  }

  script.objects[objectId].keyframes = [...existing, keyframe].sort((a, b) => a.time - b.time);
}

function ensureObject(script: SceneScript, objectId: string): void {
  script.objects[objectId] = script.objects[objectId] ?? {};
}

function mergeSceneKeyframes(base: SceneObjectKeyframe, next: SceneObjectKeyframe): SceneObjectKeyframe {
  return {
    time: base.time,
    position: next.position ?? base.position,
    rotation: next.rotation ?? base.rotation,
    scale: next.scale ?? base.scale,
    opacity: next.opacity ?? base.opacity,
    easing: next.easing ?? base.easing,
    transform: next.transform ?? base.transform,
    metadata: {
      ...base.metadata,
      ...next.metadata,
    },
  };
}

function parseSpin(value: unknown, fallback: SceneObjectScript["spin"]): SceneObjectScript["spin"] {
  if (!value || typeof value !== "object") return fallback;

  const spin = value as Partial<NonNullable<SceneObjectScript["spin"]>>;
  const axis = spin.axis === "x" || spin.axis === "y" || spin.axis === "z" ? spin.axis : fallback?.axis ?? "y";

  return {
    axis,
    turns: numberOrDefault(spin.turns, fallback?.turns ?? 0),
    pivot: parseVec3(spin.pivot, fallback?.pivot),
  };
}

function parseObjectKeyframes(value: unknown, fallback: SceneObjectKeyframe[] | undefined): SceneObjectKeyframe[] | undefined {
  if (!Array.isArray(value)) return fallback;

  return value
    .map<SceneObjectKeyframe | null>((item) => {
      if (!item || typeof item !== "object") return null;

      const keyframe = item as Partial<SceneObjectKeyframe>;

      return {
        time: numberOrDefault(keyframe.time, 0),
        position: parseVec3(keyframe.position),
        rotation: parseVec3(keyframe.rotation),
        scale: parseVec3(keyframe.scale),
        opacity: typeof keyframe.opacity === "number" ? keyframe.opacity : undefined,
        easing: parseEasing(keyframe.easing),
        transform: keyframe.transform,
        metadata: keyframe.metadata,
      };
    })
    .filter((item): item is SceneObjectKeyframe => item !== null)
    .sort((a, b) => a.time - b.time);
}

function parseVec3(value: unknown, fallback?: VisualVec3): VisualVec3 | undefined {
  if (!Array.isArray(value) || value.length !== 3) return fallback;

  const tuple = value.map((item) => Number(item));

  if (tuple.some((item) => !Number.isFinite(item))) return fallback;

  return tuple as VisualVec3;
}

function parseEasing(value: unknown): EasingId | undefined {
  if (
    value === "linear" ||
    value === "smoothstep" ||
    value === "ease-in" ||
    value === "ease-out" ||
    value === "ease-in-out" ||
    value === "ease-in-cubic" ||
    value === "ease-out-cubic" ||
    value === "ease-in-out-cubic"
  ) {
    return value;
  }

  return undefined;
}

function parseSlideEffect(value: unknown): SceneSlideEffect {
  if (value === "cut" || value === "fade" || value === "slide" || value === "typewriter") {
    return value;
  }

  return "cut";
}

function parseCameraKeyframes(value: unknown): CameraKeyframe[] {
  if (!Array.isArray(value)) return [];

  return value
    .map<CameraKeyframe | null>((item) => {
      if (!item || typeof item !== "object") return null;

      const keyframe = item as Partial<CameraKeyframe>;

      return {
        time: numberOrDefault(keyframe.time, 0),
        position: parseVec3(keyframe.position),
        target: parseVec3(keyframe.target),
        fov: typeof keyframe.fov === "number" ? keyframe.fov : undefined,
        minDistance: typeof keyframe.minDistance === "number" ? keyframe.minDistance : undefined,
        maxDistance: typeof keyframe.maxDistance === "number" ? keyframe.maxDistance : undefined,
        easing: parseEasing(keyframe.easing),
      };
    })
    .filter((item): item is CameraKeyframe => item !== null)
    .sort((a, b) => a.time - b.time);
}

function parseLabels(value: unknown): SceneLabelObject[] {
  if (!Array.isArray(value)) return [];

  const labels: SceneLabelObject[] = [];

  value.forEach((item) => {
    if (!item || typeof item !== "object") return;

    const label = item as Partial<SceneLabelObject>;

    if (typeof label.id !== "string" || typeof label.text !== "string") {
      return;
    }

    labels.push({
      id: label.id,
      kind: "label",
      objectId: label.objectId ?? label.id,
      text: label.text,
      position: parseVec3(label.position, [0, 0, 0]) ?? [0, 0, 0],
      color: typeof label.color === "string" ? label.color : "#f8fafc",
      scale: typeof label.scale === "number" ? label.scale : 0.16,
      format: label.format === "latex" ? "latex" : "text",
      metadata: label.metadata,
    });
  });

  return labels;
}

function parsePositiveNumber(value: string, fallback: number): number {
  const parsed = Number(value.trim().split(/\s+/)[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseTimeToken(value: string | undefined, duration: number): number {
  if (!value) return Number.NaN;

  const named: Record<string, number> = {
    start: 0,
    begin: 0,
    early: duration * 0.25,
    middle: duration * 0.35,
    mid: duration * 0.35,
    late: duration * 0.7,
    end: duration,
    finish: duration,
  };

  return named[value] ?? Number(value);
}

function parseCameraLine(line: string, fallback: SceneScript["camera"]): SceneScript["camera"] {
  const parts = line.split(/\s+/);
  const command = parts[1];
  const range = parseRange(command);

  if (command === "at") {
    const keyframe = parseCameraAtLine(parts);

    return {
      orbit: false,
      turns: fallback.turns,
      keyframes: keyframe ? [...fallback.keyframes, keyframe].sort((a, b) => a.time - b.time) : fallback.keyframes,
    };
  }

  if (range) {
    const keyframes = parseCameraRangeLine(parts, range);

    return {
      orbit: false,
      turns: fallback.turns,
      keyframes: keyframes ? [...fallback.keyframes, ...keyframes].sort((a, b) => a.time - b.time) : fallback.keyframes,
    };
  }

  if (command === "orbit") {
    return {
      orbit: true,
      turns: parsePositiveNumber(parts[2] ?? "", fallback.turns),
      keyframes: [],
    };
  }

  if (command === "rotate") {
    return {
      orbit: true,
      turns: parseAngle(parts[2] ?? "0") / (Math.PI * 2),
      keyframes: [],
    };
  }

  if (command === "fixed" || command === "off") {
    return {
      orbit: false,
      turns: fallback.turns,
      keyframes: [],
    };
  }

  if (command === "move") {
    const keyframe = parseCameraMoveLine(parts);

    return {
      orbit: false,
      turns: fallback.turns,
      keyframes: keyframe ? [...fallback.keyframes, keyframe].sort((a, b) => a.time - b.time) : fallback.keyframes,
    };
  }

  const preset = cameraPreset(command ?? "");

  if (preset) {
    const keyframe: CameraKeyframe = {
      time: 0,
      position: preset.position,
      target: preset.target,
      fov: preset.fov,
      easing: "smoothstep",
    };

    return {
      orbit: false,
      turns: fallback.turns,
      keyframes: [keyframe],
    };
  }

  return fallback;
}

function parseCameraAtLine(parts: string[]): CameraKeyframe | null {
  const hasTime = Number.isFinite(Number(parts[2]));
  const time = hasTime ? Number(parts[2]) : 0;
  const moveIndex = parts.indexOf("move");
  const position = moveIndex >= 0 ? parseVec3Expression(parts, moveIndex + 1) : parseVec3FromTokens(parts, hasTime ? 3 : 2);

  if (!position) return null;

  const lookIndex = parts.indexOf("look");
  const fovIndex = parts.indexOf("fov");

  return {
    time,
    position,
    target: lookIndex >= 0 ? parseVec3Expression(parts, lookIndex + 1) : undefined,
    fov: fovIndex >= 0 ? numberOrDefault(Number(parts[fovIndex + 1]), 44) : undefined,
    easing: "smoothstep",
  };
}

function parseCameraRangeLine(parts: string[], range: [number, number]): CameraKeyframe[] | null {
  const fromIndex = parts.indexOf("from");
  const toIndex = parts.indexOf("to");
  const from = fromIndex >= 0 ? parseVec3FromTokens(parts, fromIndex + 1) : undefined;
  const to = toIndex >= 0 ? parseVec3FromTokens(parts, toIndex + 1) : undefined;

  if (!from || !to) return null;

  const lookIndex = parts.indexOf("look");
  const fovIndex = parts.indexOf("fov");
  const easeIndex = parts.indexOf("ease");
  const target = lookIndex >= 0 ? parseVec3FromTokens(parts, lookIndex + 1) : undefined;
  const fov = fovIndex >= 0 ? numberOrDefault(Number(parts[fovIndex + 1]), 44) : undefined;
  const easing = easeIndex >= 0 ? parseEasing(parts[easeIndex + 1]) ?? "smoothstep" : "smoothstep";

  return [
    { time: range[0], position: from, target, fov, easing },
    { time: range[1], position: to, target, fov, easing },
  ];
}

function parseCameraMoveLine(parts: string[]): CameraKeyframe | null {
  const atIndex = parts.indexOf("at");
  const time = Number(parts[atIndex + 1]);

  if (atIndex < 0 || !Number.isFinite(time)) return null;

  const posIndex = parts.indexOf("pos");
  const lookIndex = parts.indexOf("look");
  const fovIndex = parts.indexOf("fov");
  const easeIndex = parts.indexOf("ease");

  const keyframe: CameraKeyframe = {
    time,
    position: posIndex >= 0 ? parseVec3Expression(parts, posIndex + 1) : undefined,
    target: lookIndex >= 0 ? parseVec3Expression(parts, lookIndex + 1) : undefined,
    fov: fovIndex >= 0 ? numberOrDefault(Number(parts[fovIndex + 1]), 44) : undefined,
    easing: easeIndex >= 0 ? parseEasing(parts[easeIndex + 1]) : undefined,
  };

  return keyframe.position || keyframe.target || keyframe.fov ? keyframe : null;
}

function normalizeObjectId(value: string): string | null {
  if (!value) return null;
  if (value === "camera-path") return "cameraPath";
  return value;
}

function parseLabelLine(line: string): SceneLabelObject | null {
  const parts = line.split(/\s+/);
  const id = normalizeObjectId(parts[1] ?? "");
  const atIndex = parts.indexOf("at");

  if (!id) return null;

  const position = atIndex >= 0 ? parseVec3FromTokens(parts, atIndex + 1) : defaultLabelPosition(id);

  if (!position) return null;

  const colorIndex = parts.indexOf("color");
  const scaleIndex = parts.indexOf("scale");
  const formatIndex = parts.indexOf("format");
  const textIndex = parts.indexOf("text");
  const contentIndex = parts.indexOf("content");
  const bodyIndex = textIndex >= 0 ? textIndex : contentIndex;

  return {
    id,
    kind: "label",
    objectId: id,
    text: bodyIndex >= 0 ? parts.slice(bodyIndex + 1).join(" ") : id,
    position,
    color: parseColor(colorIndex >= 0 ? parts[colorIndex + 1] : undefined),
    scale: scaleIndex >= 0 ? numberOrDefault(Number(parts[scaleIndex + 1]), 0.16) : 0.16,
    format: formatIndex >= 0 && parts[formatIndex + 1] === "latex" ? "latex" : "text",
  };
}

function defaultLabelPosition(id: string): VisualVec3 {
  if (id === "note") return [-0.92, 1.34, 1.18];
  return [-1, 1.32, 1.18];
}

function parseColor(value: string | undefined): string {
  if (!value) return "#f8fafc";

  const palette: Record<string, string> = {
    sky: "#bfdbfe",
    yellow: "#fde047",
    white: "#f8fafc",
    green: "#86efac",
    pink: "#f9a8d4",
    teal: "#5eead4",
    cyan: "#67e8f9",
    red: "#fb7185",
  };

  return palette[value] ?? value;
}

function parseActionLine(line: string): SceneObjectKeyframe[] | null {
  const parts = line.split(/\s+/);
  const action = parts[0];
  const range = parseRange(parts[1]);

  if (range) return parseRangeAction(parts, action, range);

  const atIndex = parts.indexOf("at");
  const time = Number(parts[atIndex + 1]);

  if (atIndex < 0 || !Number.isFinite(time)) return null;

  const keyframe: SceneObjectKeyframe = { time };
  const toIndex = parts.indexOf("to");

  if (action === "move") keyframe.position = parseVec3FromTokens(parts, toIndex + 1);
  if (action === "rotate") keyframe.rotation = parseVec3FromTokens(parts, toIndex + 1);
  if (action === "scale") keyframe.scale = parseVec3FromTokens(parts, toIndex + 1);
  if (action === "show") keyframe.opacity = 1;
  if (action === "hide") keyframe.opacity = 0;

  const easeIndex = parts.indexOf("ease");
  keyframe.easing = easeIndex >= 0 ? parseEasing(parts[easeIndex + 1]) : undefined;

  return keyframe.position || keyframe.rotation || keyframe.scale || keyframe.opacity !== undefined ? [keyframe] : null;
}

function parseRangeAction(parts: string[], action: string | undefined, range: [number, number]): SceneObjectKeyframe[] | null {
  const fromIndex = parts.indexOf("from");
  const toIndex = parts.indexOf("to");
  const from = fromIndex >= 0 ? parseVec3FromTokens(parts, fromIndex + 1) : undefined;
  const to = toIndex >= 0 ? parseVec3FromTokens(parts, toIndex + 1) : undefined;

  if (!from || !to) return null;

  const easeIndex = parts.indexOf("ease");
  const easing = easeIndex >= 0 ? parseEasing(parts[easeIndex + 1]) ?? "smoothstep" : "smoothstep";

  const first: SceneObjectKeyframe = { time: range[0], easing };
  const second: SceneObjectKeyframe = { time: range[1], easing };

  if (action === "move") {
    first.position = from;
    second.position = to;
  } else if (action === "rotate") {
    first.rotation = from;
    second.rotation = to;
  } else if (action === "scale") {
    first.scale = from;
    second.scale = to;
  } else {
    return null;
  }

  return [first, second];
}

function parseReplaceLine(
  line: string,
): { hide: { objectId: string; keyframe: SceneObjectKeyframe }; show: { objectId: string; keyframe: SceneObjectKeyframe } } | null {
  const parts = line.split(/\s+/);
  const withIndex = parts.indexOf("with");
  const atIndex = parts.indexOf("at");
  const oldObject = parts[1];
  const newObject = parts[withIndex + 1];
  const time = Number(parts[atIndex + 1]);

  if (!oldObject || withIndex < 0 || !newObject || atIndex < 0 || !Number.isFinite(time)) return null;

  const easeIndex = parts.indexOf("ease");
  const easing = easeIndex >= 0 ? parseEasing(parts[easeIndex + 1]) ?? "smoothstep" : "smoothstep";

  return {
    hide: {
      objectId: oldObject,
      keyframe: { time, opacity: 0, easing },
    },
    show: {
      objectId: newObject,
      keyframe: { time, opacity: 1, easing },
    },
  };
}

function parseSlideLine(line: string, script: SceneScript): SceneSlide | null {
  if (line === "scene" || line === "slide") {
    const previous = script.slides.at(-1);
    const start = previous && Number.isFinite(previous.end) ? previous.end : 0;

    return {
      start,
      end: start + 2,
      title: defaultSceneScript.title,
      latex: defaultSceneScript.latex,
      effect: "cut",
    };
  }

  const match =
    line.match(/^(?:scene|slide)\s+(-?\d+(?:\.\d+)?)\s+to\s+(-?\d+(?:\.\d+)?)$/) ??
    line.match(/^slide\s+(-?\d+(?:\.\d+)?)\s*\.\.\s*(-?\d+(?:\.\d+)?)$/);

  if (!match) return null;

  const start = Number(match[1]);
  const end = Number(match[2]);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

  return {
    start,
    end,
    title: defaultSceneScript.title,
    latex: defaultSceneScript.latex,
    effect: "cut",
  };
}

function parseSpinLine(line: string, fallback: SceneObjectScript["spin"]): SceneObjectScript["spin"] {
  const parts = line.split(/\s+/);
  const axis = parts[1] === "x" || parts[1] === "y" || parts[1] === "z" ? parts[1] : fallback?.axis ?? "y";
  const turns = numberOrDefault(Number(parts[2]), fallback?.turns ?? 1);
  const pivotIndex = parts.indexOf("pivot");

  return {
    axis,
    turns,
    pivot: pivotIndex >= 0 ? parseVec3FromTokens(parts, pivotIndex + 1, fallback?.pivot) : fallback?.pivot,
  };
}

function parseKeyframeLine(line: string, duration: number): SceneObjectKeyframe | null {
  const parts = line.split(/\s+/);
  const time = parseTimeToken(parts[1], duration);

  if (!Number.isFinite(time)) return null;

  const keyframe: SceneObjectKeyframe = { time };
  const action = parts[2];

  if (action === "move" || action === "position") {
    keyframe.position = parseVec3Expression(parts, 3);
    keyframe.easing = parseLineEasing(parts);
    return keyframe.position ? keyframe : null;
  }

  if (action === "rotate" || action === "rotation") {
    keyframe.rotation = parseVec3Expression(parts, 3, "angle");
    keyframe.easing = parseLineEasing(parts);
    return keyframe.rotation ? keyframe : null;
  }

  if (action === "scale") {
    keyframe.scale = parseVec3Expression(parts, 3);
    keyframe.easing = parseLineEasing(parts);
    return keyframe.scale ? keyframe : null;
  }

  if (action === "show" || action === "hide") {
    keyframe.opacity = action === "show" ? 1 : 0;
    keyframe.easing = parseLineEasing(parts);
    return keyframe;
  }

  for (let index = 2; index < parts.length; index += 1) {
    const token = parts[index];

    if (token === "pos" || token === "position") {
      keyframe.position = parseVec3FromTokens(parts, index + 1);
      index += 3;
    } else if (token === "rot" || token === "rotation") {
      keyframe.rotation = parseVec3FromTokens(parts, index + 1);
      index += 3;
    } else if (token === "scale") {
      keyframe.scale = parseVec3FromTokens(parts, index + 1);
      index += 3;
    } else if (token === "opacity") {
      keyframe.opacity = numberOrDefault(Number(parts[index + 1]), 1);
      index += 1;
    } else if (token === "ease" || token === "easing") {
      keyframe.easing = parseEasing(parts[index + 1]);
      index += 1;
    }
  }

  return keyframe.position || keyframe.rotation || keyframe.scale || keyframe.opacity !== undefined ? keyframe : null;
}

function parseVec3FromTokens(parts: string[], start: number, fallback?: VisualVec3): VisualVec3 | undefined {
  const tuple = [Number(parts[start]), Number(parts[start + 1]), Number(parts[start + 2])];

  if (tuple.some((item) => !Number.isFinite(item))) return fallback;

  return tuple as VisualVec3;
}

function parseVec3Expression(
  parts: string[],
  start: number,
  mode: "number" | "angle" = "number",
  fallback?: VisualVec3,
): VisualVec3 | undefined {
  const named = mode === "number" ? namedPosition(parts[start]) : undefined;
  if (named) return named;

  const direct = parseVec3FromTokens(parts, start);
  if (direct) return direct;

  const tuple: VisualVec3 = fallback ?? [0, 0, 0];
  let found = false;

  for (let index = start; index < parts.length - 1; index += 1) {
    const axis = parts[index];

    if (axis !== "x" && axis !== "y" && axis !== "z") continue;

    const value = mode === "angle" ? parseAngle(parts[index + 1] ?? "0") : Number(parts[index + 1]);

    if (!Number.isFinite(value)) continue;

    tuple[axis === "x" ? 0 : axis === "y" ? 1 : 2] = value;
    found = true;
    index += 1;
  }

  return found ? tuple : fallback;
}

function namedPosition(value: string | undefined): VisualVec3 | undefined {
  const positions: Record<string, VisualVec3> = {
    center: [0, 0, 0],
    right: [0.38, 0.04, 0.06],
    left: [-0.38, 0.04, 0.06],
    up: [0, 0.28, 0],
    down: [0, -0.2, 0],
    front: [0, 0.04, 0.38],
    back: [0, 0.04, -0.38],
  };

  return value ? positions[value] : undefined;
}

function parseAngle(value: string): number {
  const normalized = value.trim().toLowerCase();
  const number = Number(normalized.replace(/(degrees|degree|deg|grad|radians|radian|rad)$/u, ""));

  if (!Number.isFinite(number)) return 0;

  if (
    normalized.endsWith("deg") ||
    normalized.endsWith("degree") ||
    normalized.endsWith("degrees") ||
    normalized.endsWith("grad")
  ) {
    return (number * Math.PI) / 180;
  }

  return number;
}

function parseLineEasing(parts: string[]): EasingId {
  const easeIndex = parts.indexOf("ease");
  return easeIndex >= 0 ? parseEasing(parts[easeIndex + 1]) ?? "smoothstep" : "smoothstep";
}

function parseRange(value: string | undefined): [number, number] | null {
  const match = value?.match(/^(-?\d+(?:\.\d+)?)\.\.(-?\d+(?:\.\d+)?)$/);

  if (!match) return null;

  const start = Number(match[1]);
  const end = Number(match[2]);

  return Number.isFinite(start) && Number.isFinite(end) && end >= start ? [start, end] : null;
}

function numberOrDefault(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseSlides(value: unknown, title: unknown, latex: unknown): SceneSlide[] {
  if (!Array.isArray(value)) {
    return [
      {
        start: 0,
        end: Number.POSITIVE_INFINITY,
        title: typeof title === "string" ? title : defaultSceneScript.title,
        latex: typeof latex === "string" ? latex : defaultSceneScript.latex,
        effect: "cut",
      },
    ];
  }

  const slides = value
    .map<SceneSlide | null>((item) => {
      if (!item || typeof item !== "object") return null;

      const candidate = item as Partial<SceneSlide>;

      return {
        start: numberOrDefault(candidate.start, 0),
        end: numberOrDefault(candidate.end, Number.POSITIVE_INFINITY),
        title: typeof candidate.title === "string" ? candidate.title : defaultSceneScript.title,
        latex: typeof candidate.latex === "string" ? candidate.latex : defaultSceneScript.latex,
        effect: parseSlideEffect(candidate.effect),
      };
    })
    .filter((item): item is SceneSlide => item !== null)
    .sort((a, b) => a.start - b.start);

  return slides.length > 0 ? slides : defaultSceneScript.slides;
}

function sliceByProgress(value: string, progress: number): string {
  return value.slice(0, Math.max(1, Math.ceil(value.length * progress)));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}