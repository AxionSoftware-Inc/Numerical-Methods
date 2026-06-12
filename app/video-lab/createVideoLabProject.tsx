import type { VideoProjectSpec } from "@methodslab/video-engine/core";
import type { SceneCameraAnimation, SceneCameraSpec } from "@methodslab/scene-dsl/core";
import { getVideoLabPrimitive } from "./language/primitives";
import { analyzeVideoLabCode } from "./language/intellisense";
import {
  compileSceneToVideoProject,
  createMathScene,
  dropIn,
  fadeIn,
  fadeOut,
  hide,
  indicate,
  moveTo,
  rotate,
  scaleTo,
  spin,
  transform,
  wait,
  write,
  show,
} from "@methodslab/scene-dsl/core";
import {
  commandOf,
  hasToken,
  joinedFrom,
  tokenAfter,
  tokenizeVideoLabSource,
} from "./language/tokenize";
import {
  createDefaultVariables,
  durationFromNaturalTokens,
  normalizeAxis,
  parseAssignment,
  parseNamedColor,
  parseNamedNumber,
  parseNamedString,
  parseNamedVec3,
  parseVec3FromTokens,
  resolveAngle,
  resolveDuration,
  resolveNumber,
  resolvePositiveNumber,
  resolveValue,
  vectorFromDirection,
  type VideoLabVariables,
  type VideoLabVec3,
} from "./language/values";

export type VideoLabCompileResult = {
  project: VideoProjectSpec;
  error: string | null;
  warnings: string[];
};

export type CompileVideoLabCodeOptions = {
  time?: number;
};

export const DEFAULT_VIDEO_LAB_CODE = `scene "Volume Integral Demo"
duration = 8
fps = 30

camera orbit radius 5.5 height 3.05 turns 0.62

main = cyan
peak_pos = [0, 0.54, 0]
mark_from = [-0.72, 0.35, -0.48]

title "Volume Integral"
subtitle "Riemann columns as a code-first video scene"
formula f = "\\int_a^b\\int_c^d f(x,y)\\,dx\\,dy" at formula color main

grid
riemann columns count 7

point peak at peak_pos label "max contribution"
arrow mark from mark_from to peak_pos color red

drop title from top in 0.85s
write f in 0.9s
show columns from 0.18 in 1.2s
highlight peak in 0.75s
fade analysis in 0.8s
spin columns y 0.72 turns in 2.5s
wait 0.4s`;

type CameraConfig = SceneCameraSpec & {
  kind: "orbit";
  radius: number;
  height: number;
  turns: number;
};

type SceneConfig = {
  id: string;
  name: string;
  duration: number;
  fps: number;
  camera: CameraConfig;
  cameraAnimation?: SceneCameraAnimation;
};

type MathScene = ReturnType<typeof createMathScene>;

type VideoLabContext = {
  scene: MathScene;
  variables: VideoLabVariables;
  config: SceneConfig;
  warnings: string[];
  time: number;
};

export function compileVideoLabCode(
  code: string,
  options: CompileVideoLabCodeOptions = {},
): VideoLabCompileResult {
  const warnings: string[] = [];
  const languageAnalysis = analyzeVideoLabCode(code);

  warnings.push(
    ...languageAnalysis.diagnostics.map(
      (diagnostic) => `Line ${diagnostic.lineNumber}: ${diagnostic.message}`,
    ),
  );

  const config: SceneConfig = {
    id: "video-lab-scene",
    name: "Video Lab Scene",
    duration: 8,
    fps: 30,
    camera: {
      kind: "orbit",
      radius: 5.5,
      height: 3.05,
      turns: 0.62,
    },
    cameraAnimation: {
      kind: "orbit",
      radius: 5.5,
      height: 3.05,
      target: [0, 0.08, 0],
      turns: 0.62,
      easing: "ease-in-out-cubic",
    },
  };

  try {
    const scene = createMathScene({
      id: config.id,
      name: config.name,
      fps: config.fps,
      background: "#050b0f",
      camera: {
        position: [3.8, 3.2, 4.8],
        target: [0, -0.1, 0],
        fov: 42,
        minDistance: 1.8,
        maxDistance: 14,
      },
      cameraAnimation: config.cameraAnimation,
    });

    const context: VideoLabContext = {
      scene,
      variables: createDefaultVariables(),
      config,
      warnings,
      time: options.time ?? 0,
    };

    tokenizeVideoLabSource(code).forEach((line) => {
      if (line.isEmpty || line.isComment) return;

      const assignment = parseAssignment(line.line);

      if (assignment) {
        const value = resolveValue(assignment.valueSource, {
          variables: context.variables,
        });

        context.variables.set(assignment.name, value);

        if (assignment.name === "duration") {
          context.config.duration = resolvePositiveNumber(assignment.name, { variables: context.variables }, context.config.duration);
        }

        if (assignment.name === "fps") {
          context.config.fps = resolvePositiveNumber(assignment.name, { variables: context.variables }, context.config.fps);
        }

        return;
      }

      parseCommand(context, line.tokens, line.lineNumber);
    });

    const project = compileSceneToVideoProject({
      ...scene.toSpec(),
      name: config.name,
      fps: config.fps,
      duration: config.duration,
      camera: cameraSpecFromConfig(config.camera),
      cameraAnimation: config.cameraAnimation,
    });

    return {
      project,
      error: null,
      warnings,
    };
  } catch (error) {
    const fallbackScene = createMathScene({
      id: "video-lab-fallback",
      name: "Fallback Scene",
      fps: 30,
      background: "#050b0f",
    });

    fallbackScene.text("Scene compile error", {
      id: "compile-error",
      objectId: "compile-error",
      position: [-1.2, 1.2, 0],
      color: "#fb7185",
      scale: 0.18,
    });

    return {
      project: compileSceneToVideoProject(fallbackScene.toSpec()),
      error: error instanceof Error ? error.message : "Unknown compile error",
      warnings,
    };
  }
}

function parseCommand(context: VideoLabContext, tokens: string[], lineNumber: number): void {
  const command = commandOf(tokens);

  if (!command) return;
  const primitive = getVideoLabPrimitive(command);

  if (primitive) {
    primitive.compile({
      context,
      tokens,
      lineNumber,
    });
    return;
  }

  if (command === "scene") {
    const name = joinedFrom(tokens, 1).trim();
    if (name) context.config.name = name;
    return;
  }

  if (command === "duration") {
    context.config.duration = resolvePositiveNumber(tokens[1], context, context.config.duration);
    return;
  }

  if (command === "fps") {
    context.config.fps = resolvePositiveNumber(tokens[1], context, context.config.fps);
    return;
  }

  if (command === "camera") {
    parseCameraCommand(context, tokens, lineNumber);
    return;
  }

  if (command === "title") {
    const text = textCommandContent(tokens, 1) || "Untitled";

    context.scene.text(text, {
      id: "title",
      objectId: "title",
      position: parseNamedVec3(tokens, "at", context, [-1.35, 1.35, 0.2]),
      color: parseNamedColor(tokens, "color", context, "#f8fafc"),
      scale: parseNamedNumber(tokens, "scale", context, 0.38),
    });
    return;
  }

  if (command === "subtitle") {
    const text = textCommandContent(tokens, 1) || "";

    context.scene.text(text, {
      id: "subtitle",
      objectId: "subtitle",
      position: parseNamedVec3(tokens, "at", context, [-1.35, 1.02, 0.2]),
      color: parseNamedColor(tokens, "color", context, "#b6c7d6"),
      scale: parseNamedNumber(tokens, "scale", context, 0.17),
    });
    return;
  }

  if (command === "formula" || command === "tex") {
    parseFormulaCommand(context, tokens, lineNumber);
    return;
  }

  if (command === "text") {
    parseTextCommand(context, tokens, lineNumber);
    return;
  }

  if (command === "grid") {
    const isTwoDimensional = isTwoDimensionalCamera(context);
    const plane = parseNamedString(tokens, "plane", context, isTwoDimensional ? "xy" : "xz");

    context.scene.grid({
      id: parseNamedString(tokens, "id", context, "grid"),
      objectId: parseNamedString(tokens, "object", context, "grid"),
      size: parseNamedNumber(tokens, "size", context, isTwoDimensional ? 3.8 : 3.2),
      divisions: Math.round(parseNamedNumber(tokens, "divisions", context, 18)),
      y: parseNamedNumber(tokens, "y", context, isTwoDimensional ? 0 : -0.86),
      plane: plane === "xy" || plane === "yz" ? plane : "xz",
      opacity: parseNamedNumber(tokens, "opacity", context, isTwoDimensional ? 0.24 : 0.34),
      color: parseNamedColor(tokens, "color", context, "#164653"),
    });
    return;
  }

  if (command === "axes") {
    const isTwoDimensional = isTwoDimensionalCamera(context);

    context.scene.axes({
      id: parseNamedString(tokens, "id", context, "axes"),
      objectId: parseNamedString(tokens, "object", context, "axes"),
      origin: parseNamedVec3(tokens, "origin", context, [0, 0, 0]),
      size: parseNamedNumber(tokens, "size", context, isTwoDimensional ? 1.9 : 1.45),
      yLabel: parseNamedString(tokens, "ylabel", context, isTwoDimensional ? "y" : "h"),
      zLabel: parseNamedString(tokens, "zlabel", context, "z"),
      showZ: isTwoDimensional ? hasToken(tokens, "zaxis") : !hasToken(tokens, "noz"),
    });
    return;
  }

  if (command === "riemann") {
    const objectId = tokens[1] ?? "columns";
    const count = parseNamedNumber(tokens, "count", context, 7);
    createRiemannColumns(context.scene, objectId, Math.round(count));
    return;
  }



  if (command === "box") {
    parseBoxCommand(context, tokens, lineNumber);
    return;
  }

  if (command === "plane") {
    parsePlaneCommand(context, tokens, lineNumber);
    return;
  }

  if (command === "path") {
    parsePathCommand(context, tokens, lineNumber);
    return;
  }

  if (command === "point" || command === "marker") {
    parsePointCommand(context, tokens, lineNumber);
    return;
  }

  if (command === "arrow") {
    parseArrowCommand(context, tokens, lineNumber);
    return;
  }

  if (command === "write") {
    const target = tokens[1];
    if (!target) return pushWarning(context, lineNumber, "write target missing");

    context.scene.play(write(target, { duration: durationFromNaturalTokens(tokens, context, 0.85) }));
    return;
  }

  if (command === "drop") {
    const target = tokens[1];
    if (!target) return pushWarning(context, lineNumber, "drop target missing");

    const fromIndex = tokens.indexOf("from");
    const direction = normalizeDropDirection(fromIndex >= 0 ? tokens[fromIndex + 1] : undefined);

    context.scene.play(
      dropIn(target, {
        direction,
        distance: parseNamedNumber(tokens, "distance", context, 0.55),
        duration: durationFromNaturalTokens(tokens, context, 0.85),
      }),
    );
    return;
  }

  if (command === "show" || command === "reveal") {
    const target = tokens[1];
    if (!target) return pushWarning(context, lineNumber, "show target missing");

    context.scene.play(
      show(target, {
        duration: durationFromNaturalTokens(tokens, context, resolveDuration(tokens[2], context, 1)),
      }),
    );
    return;
  }

  if (command === "fade") {
    const target = tokens[1];
    if (!target) return pushWarning(context, lineNumber, "fade target missing");

    context.scene.play(
      fadeIn(target, {
        from: 0,
        to: 1,
        duration: durationFromNaturalTokens(tokens, context, resolveDuration(tokens[2], context, 0.8)),
      }),
    );
    return;
  }

  if (command === "fadeout" || command === "fade-out") {
    const target = tokens[1];
    if (!target) return pushWarning(context, lineNumber, "fade-out target missing");

    context.scene.play(
      fadeOut(target, {
        from: 1,
        to: 0,
        duration: durationFromNaturalTokens(tokens, context, resolveDuration(tokens[2], context, 0.65)),
      }),
    );
    return;
  }

  if (command === "hide") {
    const target = tokens[1];
    if (!target) return pushWarning(context, lineNumber, "hide target missing");

    const duration = durationFromNaturalTokens(tokens, context, resolveDuration(tokens[2], context, 0.01));

    if (duration <= 0.02) context.scene.play(hide(target));
    else context.scene.play(fadeOut(target, { duration }));
    return;
  }

  if (command === "highlight" || command === "indicate") {
    const target = tokens[1];
    if (!target) return pushWarning(context, lineNumber, "highlight target missing");

    context.scene.play(
      indicate(target, {
        duration: durationFromNaturalTokens(tokens, context, resolveDuration(tokens[2], context, 0.75)),
        scale: parseNamedNumber(tokens, "scale", context, 1.12),
        color: parseNamedColor(tokens, "color", context, "#facc15"),
      }),
    );
    return;
  }

  if (command === "spin") {
    parseSpinCommand(context, tokens, lineNumber);
    return;
  }

  if (command === "move") {
    parseMoveCommand(context, tokens, lineNumber);
    return;
  }

  if (command === "scale") {
    parseScaleCommand(context, tokens, lineNumber);
    return;
  }

  if (command === "rotate") {
    parseRotateCommand(context, tokens, lineNumber);
    return;
  }

  if (command === "transform") {
    const from = tokens[1];
    const toIndex = tokens.indexOf("to");
    const to = toIndex >= 0 ? tokens[toIndex + 1] : undefined;

    if (!from || !to) return pushWarning(context, lineNumber, "transform needs source and target: transform title to eq in 1s");

    context.scene.play(
      transform(from, to, {
        duration: durationFromNaturalTokens(tokens, context, 1),
      }),
    );
    return;
  }

  if (command === "wait") {
    context.scene.play(wait(resolveDuration(tokens[1], context, 0.4)));
    return;
  }

  pushWarning(context, lineNumber, `unknown command "${command}"`);
}

function parseCameraCommand(context: VideoLabContext, tokens: string[], lineNumber: number): void {
  if (tokens[1] === "preset") {
    const preset = tokens[2] ?? "surface";
    const cameraPreset = resolveCameraPreset(preset);

    context.config.camera = {
      ...context.config.camera,
      ...cameraPreset.camera,
    } as CameraConfig;
    context.config.cameraAnimation = cameraPreset.cameraAnimation;
    return;
  }

  if (tokens[1] !== "orbit") {
    pushWarning(context, lineNumber, "only camera orbit is supported for now");
    return;
  }

  context.config.camera.kind = "orbit";
  context.config.camera.radius = parseNamedNumber(tokens, "radius", context, context.config.camera.radius);
  context.config.camera.height = parseNamedNumber(tokens, "height", context, context.config.camera.height);
  context.config.camera.turns = parseNamedNumber(tokens, "turns", context, context.config.camera.turns);
  context.config.cameraAnimation = undefined;
}

function parseFormulaCommand(context: VideoLabContext, tokens: string[], lineNumber: number): void {
  const id = tokens[1] ?? `formula-${lineNumber}`;
  const equalsIndex = tokens.indexOf("=");

  const sourceStart = equalsIndex >= 0 ? equalsIndex + 1 : 2;
  const atIndex = tokens.indexOf("at");
  const colorIndex = tokens.indexOf("color");
  const scaleIndex = tokens.indexOf("scale");

  const stopIndexes = [atIndex, colorIndex, scaleIndex].filter((index) => index >= 0);
  const sourceEnd = stopIndexes.length > 0 ? Math.min(...stopIndexes) : tokens.length;
  const source = tokens.slice(sourceStart, sourceEnd).join(" ");

  context.scene.tex(source, {
    id,
    objectId: id,
    position: parseNamedVec3(tokens, "at", context, [-1.1, 0.62, 0.2]),
    color: parseNamedColor(tokens, "color", context, "#67e8f9"),
    scale: parseNamedNumber(tokens, "scale", context, 0.22),
  });
}

function textCommandContent(tokens: string[], startIndex: number): string {
  const atIndex = tokens.indexOf("at");
  const colorIndex = tokens.indexOf("color");
  const scaleIndex = tokens.indexOf("scale");
  const stopIndexes = [atIndex, colorIndex, scaleIndex].filter((index) => index >= 0);
  const endIndex = stopIndexes.length > 0 ? Math.min(...stopIndexes) : tokens.length;

  return tokens.slice(startIndex, endIndex).join(" ");
}

function cameraSpecFromConfig(camera: CameraConfig): SceneCameraSpec {
  return {
    position: camera.position,
    target: camera.target,
    fov: camera.fov,
    minDistance: camera.minDistance,
    maxDistance: camera.maxDistance,
    projection: camera.projection,
    orthographicSize: camera.orthographicSize,
  };
}

function isTwoDimensionalCamera(context: VideoLabContext): boolean {
  return context.config.camera.projection === "orthographic";
}

function parseTextCommand(context: VideoLabContext, tokens: string[], lineNumber: number): void {
  const id = tokens[1] ?? `text-${lineNumber}`;
  const equalsIndex = tokens.indexOf("=");
  const textIndex = tokens.indexOf("text");
  const atIndex = tokens.indexOf("at");
  const colorIndex = tokens.indexOf("color");
  const scaleIndex = tokens.indexOf("scale");

  const contentStart = equalsIndex >= 0 ? equalsIndex + 1 : textIndex >= 0 ? textIndex + 1 : 2;
  const stopIndexes = [atIndex, colorIndex, scaleIndex].filter((index) => index >= 0);
  const contentEnd = stopIndexes.length > 0 ? Math.min(...stopIndexes) : tokens.length;
  const text = tokens.slice(contentStart, contentEnd).join(" ");

  context.scene.text(text, {
    id,
    objectId: id,
    position: parseNamedVec3(tokens, "at", context, [-1.25, -1.05, 0.2]),
    color: parseNamedColor(tokens, "color", context, "#f8fafc"),
    scale: parseNamedNumber(tokens, "scale", context, 0.18),
  });
}

function parseBoxCommand(context: VideoLabContext, tokens: string[], lineNumber: number): void {
  const id = tokens[1];

  if (!id) {
    pushWarning(context, lineNumber, "box id missing");
    return;
  }

  if (!hasToken(tokens, "at") || !hasToken(tokens, "size")) {
    pushWarning(context, lineNumber, "box must use: box id at center size 1 or box id at [0,0,0] size [1,1,1]");
    return;
  }

  const sizeToken = tokenAfter(tokens, "size");
  const sizeValue = sizeToken ? resolveValue(sizeToken, context) : 1;
  const size: VideoLabVec3 =
    Array.isArray(sizeValue) && sizeValue.length === 3
      ? sizeValue
      : [
        resolveNumber(sizeToken, context, 1),
        resolveNumber(sizeToken, context, 1),
        resolveNumber(sizeToken, context, 1),
      ];

  context.scene.box({
    id,
    objectId: parseNamedString(tokens, "object", context, id),
    position: parseNamedVec3(tokens, "at", context, [0, 0, 0]),
    size,
    color: parseNamedColor(tokens, "color", context, "#38bdf8"),
    opacity: parseNamedNumber(tokens, "opacity", context, 0.85),
  });
}

function parsePlaneCommand(context: VideoLabContext, tokens: string[], lineNumber: number): void {
  const id = tokens[1];

  if (!id) {
    pushWarning(context, lineNumber, "plane id missing");
    return;
  }

  if (!hasToken(tokens, "at") || !hasToken(tokens, "size")) {
    pushWarning(context, lineNumber, "plane must use: plane id at center size 2 2");
    return;
  }

  const sizeIndex = tokens.indexOf("size");

  context.scene.plane({
    id,
    objectId: parseNamedString(tokens, "object", context, id),
    position: parseNamedVec3(tokens, "at", context, [0, 0, 0]),
    size: [
      resolveNumber(tokens[sizeIndex + 1], context, 1),
      resolveNumber(tokens[sizeIndex + 2], context, resolveNumber(tokens[sizeIndex + 1], context, 1)),
    ],
    color: parseNamedColor(tokens, "color", context, "#38bdf8"),
    opacity: parseNamedNumber(tokens, "opacity", context, 0.25),
  });
}

function parsePathCommand(context: VideoLabContext, tokens: string[], lineNumber: number): void {
  const id = tokens[1];
  const pointsIndex = tokens.indexOf("points");

  if (!id) {
    pushWarning(context, lineNumber, "path id missing");
    return;
  }

  if (pointsIndex < 0) {
    pushWarning(context, lineNumber, "path must use: path id points [0,0,0] [1,1,0]");
    return;
  }

  const points: VideoLabVec3[] = [];

  for (let index = pointsIndex + 1; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (!token || token === "color" || token === "opacity" || token === "closed") break;

    const value = resolveValue(token, context);

    if (Array.isArray(value) && value.length === 3) {
      points.push(value);
    }
  }

  if (points.length < 2) {
    pushWarning(context, lineNumber, "path needs at least 2 points");
    return;
  }

  context.scene.path(points, {
    id,
    objectId: parseNamedString(tokens, "object", context, id),
    color: parseNamedColor(tokens, "color", context, "#67e8f9"),
    opacity: parseNamedNumber(tokens, "opacity", context, 0.9),
    closed: tokens.includes("closed"),
  });
}

function parsePointCommand(context: VideoLabContext, tokens: string[], lineNumber: number): void {
  const id = tokens[1];

  if (!id) {
    pushWarning(context, lineNumber, "point id missing");
    return;
  }

  if (!hasToken(tokens, "at")) {
    pushWarning(context, lineNumber, "point needs position: point p at center");
    return;
  }

  const labelIndex = tokens.indexOf("label");

  context.scene.marker({
    id,
    objectId: parseNamedString(tokens, "object", context, id === "peak" ? "analysis" : id),
    position: parseNamedVec3(tokens, "at", context, [0, 0, 0]),
    color: parseNamedColor(tokens, "color", context, "#facc15"),
    radius: parseNamedNumber(tokens, "radius", context, 0.065),
    label: labelIndex >= 0 ? tokens.slice(labelIndex + 1).join(" ") : undefined,
  });
}

function parseArrowCommand(context: VideoLabContext, tokens: string[], lineNumber: number): void {
  const id = tokens[1];

  if (!id) {
    pushWarning(context, lineNumber, "arrow id missing");
    return;
  }

  if (!hasToken(tokens, "from") || !hasToken(tokens, "to")) {
    pushWarning(context, lineNumber, "arrow must use: arrow a from origin to [1,1,0]");
    return;
  }

  context.scene.arrow({
    id,
    objectId: parseNamedString(tokens, "object", context, id === "mark" ? "analysis" : id),
    from: parseNamedVec3(tokens, "from", context, [0, 0, 0]),
    to: parseNamedVec3(tokens, "to", context, [1, 0, 0]),
    color: parseNamedColor(tokens, "color", context, "#fb7185"),
    opacity: parseNamedNumber(tokens, "opacity", context, 0.92),
    headSize: parseNamedNumber(tokens, "head", context, 0.105),
  });
}

function parseSpinCommand(context: VideoLabContext, tokens: string[], lineNumber: number): void {
  const target = tokens[1];

  if (!target) {
    pushWarning(context, lineNumber, "spin target missing");
    return;
  }

  const axis = normalizeAxis(tokens[2]);
  const turnsIndex = tokens.indexOf("turns");
  const turns =
    turnsIndex >= 0
      ? resolveNumber(tokens[turnsIndex - 1], context, 1)
      : resolveNumber(tokens[3], context, 1);

  context.scene.play(
    spin(target, {
      axis,
      turns,
      duration: durationFromNaturalTokens(tokens, context, resolveDuration(tokens[4], context, 2)),
      easing: "ease-in-out-cubic",
    }),
  );
}

function parseMoveCommand(context: VideoLabContext, tokens: string[], lineNumber: number): void {
  const target = tokens[1];

  if (!target) {
    pushWarning(context, lineNumber, "move target missing");
    return;
  }

  const toIndex = tokens.indexOf("to");

  if (toIndex >= 0) {
    context.scene.play(
      moveTo(target, parseVec3FromTokens(tokens, toIndex + 1, context), {
        duration: durationFromNaturalTokens(tokens, context, 1),
      }),
    );
    return;
  }

  const direction = tokens[2];
  const amount = resolveNumber(tokens[3], context, 1);
  const vector = vectorFromDirection(direction, amount);

  if (!vector) {
    pushWarning(context, lineNumber, "move must use: move obj to center OR move obj up 0.4 in 1s");
    return;
  }

  context.scene.play(
    moveTo(target, vector, {
      duration: durationFromNaturalTokens(tokens, context, 1),
    }),
  );
}

function parseScaleCommand(context: VideoLabContext, tokens: string[], lineNumber: number): void {
  const target = tokens[1];

  if (!target) {
    pushWarning(context, lineNumber, "scale target missing");
    return;
  }

  context.scene.play(
    scaleTo(target, resolveNumber(tokens[2], context, 1), {
      duration: durationFromNaturalTokens(tokens, context, resolveDuration(tokens[3], context, 1)),
    }),
  );
}

function parseRotateCommand(context: VideoLabContext, tokens: string[], lineNumber: number): void {
  const target = tokens[1];

  if (!target) {
    pushWarning(context, lineNumber, "rotate target missing");
    return;
  }

  const axis = normalizeAxis(tokens[2]);
  const angle = resolveAngle(tokens[3], context, 0);

  context.scene.play(
    rotate(target, axisRotation(axis, angle), {
      duration: durationFromNaturalTokens(tokens, context, resolveDuration(tokens[4], context, 1)),
    }),
  );
}

function createRiemannColumns(scene: MathScene, objectId: string, count: number): void {
  const safeCount = Math.max(2, Math.min(18, count));
  const spacing = 2.38 / safeCount;

  for (let ix = 0; ix < safeCount; ix += 1) {
    for (let iz = 0; iz < safeCount; iz += 1) {
      const x = (ix - (safeCount - 1) / 2) * spacing;
      const z = (iz - (safeCount - 1) / 2) * spacing;
      const distance = Math.hypot(x, z);
      const height = 0.24 + Math.max(0, 1.1 - distance * 0.62);
      const color = height > 0.9 ? "#facc15" : height > 0.62 ? "#38bdf8" : "#0ea5e9";

      scene.box({
        id: `${objectId}-${ix}-${iz}`,
        objectId,
        position: [x, -0.86 + height / 2, z],
        size: [spacing * 0.78, height, spacing * 0.78],
        color,
        opacity: 0.74,
      });
    }
  }
}

function axisRotation(axis: "x" | "y" | "z", angle: number): VideoLabVec3 {
  if (axis === "x") return [angle, 0, 0];
  if (axis === "z") return [0, 0, angle];
  return [0, angle, 0];
}

function normalizeDropDirection(value: string | undefined): "top" | "bottom" | "left" | "right" {
  if (value === "bottom" || value === "left" || value === "right") return value;
  return "top";
}

function pushWarning(context: VideoLabContext, lineNumber: number, message: string): void {
  context.warnings.push(`Line ${lineNumber}: ${message}`);
}

function resolveCameraPreset(name: string): {
  camera: {
    position?: [number, number, number];
    target?: [number, number, number];
    fov?: number;
    minDistance?: number;
    maxDistance?: number;
    projection?: "perspective" | "orthographic";
    orthographicSize?: number;
  };
  cameraAnimation?: SceneCameraAnimation;
} {
  if (name === "2d" || name === "front") {
    return {
      camera: {
        position: [0, 0, 5.6],
        target: [0, 0, 0],
        fov: 34,
        projection: "orthographic",
        orthographicSize: 3.1,
        minDistance: 1.5,
        maxDistance: 16,
      },
      cameraAnimation: undefined,
    };
  }

  if (name === "graph") {
    return {
      camera: {
        position: [0, 0.4, 5.4],
        target: [0, 0, 0],
        fov: 42,
        minDistance: 1.6,
        maxDistance: 12,
      },
      cameraAnimation: {
        kind: "orbit",
        radius: 5.2,
        height: 2.2,
        turns: 0.04,
        target: [0, 0, 0],
      },
    };
  }

  if (name === "surface") {
    return {
      camera: {
        position: [4.3, 3.4, 5.2],
        target: [0, 0, 0],
        fov: 42,
        minDistance: 1.8,
        maxDistance: 14,
      },
      cameraAnimation: {
        kind: "orbit",
        radius: 6,
        height: 3.7,
        turns: 0.08,
        target: [0, 0, 0],
      },
    };
  }

  if (name === "field") {
    return {
      camera: {
        position: [4.6, 3.2, 5.4],
        target: [0, 0, 0],
        fov: 44,
        minDistance: 1.8,
        maxDistance: 16,
      },
      cameraAnimation: {
        kind: "orbit",
        radius: 6.3,
        height: 3.8,
        turns: 0.1,
        target: [0, 0, 0],
      },
    };
  }

  if (name === "top") {
    return {
      camera: {
        position: [0, 7, 0.001],
        target: [0, 0, 0],
        fov: 44,
        minDistance: 1.8,
        maxDistance: 16,
      },
      cameraAnimation: {
        kind: "orbit",
        radius: 0.001,
        height: 7,
        turns: 0,
        target: [0, 0, 0],
      },
    };
  }

  if (name === "close") {
    return {
      camera: {
        position: [2.6, 2.2, 3.2],
        target: [0, 0, 0],
        fov: 38,
        minDistance: 1.2,
        maxDistance: 9,
      },
      cameraAnimation: {
        kind: "orbit",
        radius: 4,
        height: 2.7,
        turns: 0.06,
        target: [0, 0, 0],
      },
    };
  }

  return resolveCameraPreset("surface");
}
