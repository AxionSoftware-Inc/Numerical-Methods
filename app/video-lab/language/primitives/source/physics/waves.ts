import { compileMathExpression } from "../../math/expression";
import type { VideoLabVec3 } from "../../../values";
import {
  parseNamedColor,
  parseNamedNumber,
  resolveNumber,
} from "../../../values";
import {
  expressionBetween,
  firstStopIndex,
  tokenAfter,
  tokenIndex,
  tokenRequired,
  warn,
  type SourcePrimitive,
} from "../core/primitiveTypes";
import {
  isSurfaceQuality,
  surfaceQualityDefaults,
  surfaceQualityList,
} from "../core/quality";
import {
  isSurfaceStyle,
  surfaceStyleDefaults,
  surfaceStyleList,
} from "../core/stylePresets";
import {
  renderSampledSurface,
  type SurfaceRenderMode,
} from "../renderers/surfaceRenderer";

export const waveSourcePrimitive: SourcePrimitive = {
  name: "wave",
  category: "physics",
  createsObject: true,
  description: "Render y = f(x) as a wave path.",
  examples: [`wave w = sin(x) from -pi to pi amplitude 0.75 color cyan y 0.5`],
  completions: [
    {
      label: "wave",
      insertText: "wave ${1:w} = ${2:sin(x)} from ${3:-pi} to ${4:pi} amplitude ${5:0.7} color ${6:cyan}",
      detail: "Create wave path",
    },
  ],
  reference: {
    id: "wave",
    title: "Wave",
    description: "Sinusoidal yoki custom expression asosida wave chizadi.",
    examples: [`wave w = sin(x) from -pi to pi amplitude 0.75 color cyan`],
  },

  compile(args) {
    const { context, tokens } = args;
    const id = tokens[1];
    if (!id) return warn(args, "wave id missing. Example: wave w = sin(x) from -pi to pi.");

    const equalsIndex = tokenIndex(tokens, "=");
    const fromIndex = tokenIndex(tokens, "from");
    const toIndex = tokenIndex(tokens, "to");
    if (equalsIndex < 0 || fromIndex < 0 || toIndex < 0) {
      return warn(args, "wave needs expression and range. Example: wave w = sin(x) from -pi to pi.");
    }

    const expression = compileMathExpression(expressionBetween(tokens, equalsIndex + 1, Math.min(fromIndex, toIndex)));
    const from = resolveNumber(tokens[fromIndex + 1], context, -Math.PI);
    const to = resolveNumber(tokens[toIndex + 1], context, Math.PI);
    const samples = Math.max(12, Math.round(parseNamedNumber(tokens, "samples", context, 128)));
    const amplitude = parseNamedNumber(tokens, "amplitude", context, 0.7);
    const scale = parseNamedNumber(tokens, "scale", context, 0.55);
    const y = parseNamedNumber(tokens, "y", context, 0);
    const z = parseNamedNumber(tokens, "z", context, 0);
    const color = parseNamedColor(tokens, "color", context, "#67e8f9");
    const opacity = parseNamedNumber(tokens, "opacity", context, 0.95);
    const points: VideoLabVec3[] = [];

    for (let index = 0; index <= samples; index += 1) {
      const t = samples === 0 ? 0 : index / samples;
      const x = from + (to - from) * t;
      const value = expression.evaluate({ x, y: 0, t: context.time });
      points.push([x * scale, y + value * amplitude, z]);
    }

    context.scene.path(points, { id, objectId: id, color, opacity });
  },

  diagnose({ tokens, lineNumber }) {
    const diagnostics = [];
    if (!tokens[1]) diagnostics.push({ lineNumber, message: "Wave id missing." });
    if (!tokenRequired(tokens, "=") || !tokenRequired(tokens, "from") || !tokenRequired(tokens, "to")) {
      diagnostics.push({ lineNumber, message: "Wave needs expression and range." });
    }
    return diagnostics;
  },
};

export const interferenceSourcePrimitive: SourcePrimitive = {
  name: "interference",
  category: "physics",
  createsObject: true,
  description: "Render superposition of two wave expressions.",
  examples: [`interference i a = sin(x) b = sin(x+1) from -pi to pi color cyan`],
  completions: [
    {
      label: "interference",
      insertText: "interference ${1:i} a = ${2:sin(x)} b = ${3:sin(x+1)} from ${4:-pi} to ${5:pi} color ${6:cyan}",
      detail: "Create wave interference",
    },
  ],
  reference: {
    id: "interference",
    title: "Interference",
    description: "Ikki wave expression yig‘indisini chizadi.",
    examples: [`interference i a = sin(2*x) b = sin(2*x+1) from -pi to pi`],
  },

  compile(args) {
    const { context, tokens } = args;
    const id = tokens[1];
    if (!id) return warn(args, "interference id missing.");

    const aIndex = tokenIndex(tokens, "a");
    const bIndex = tokenIndex(tokens, "b");
    const fromIndex = tokenIndex(tokens, "from");
    const toIndex = tokenIndex(tokens, "to");
    if (aIndex < 0 || bIndex < 0 || fromIndex < 0 || toIndex < 0) {
      return warn(args, "interference needs a, b, from and to.");
    }

    const aEquals = tokens.indexOf("=", aIndex);
    const bEquals = tokens.indexOf("=", bIndex);
    const aExpression = compileMathExpression(expressionBetween(tokens, aEquals + 1, bIndex));
    const bExpression = compileMathExpression(expressionBetween(tokens, bEquals + 1, Math.min(fromIndex, toIndex)));
    const from = resolveNumber(tokens[fromIndex + 1], context, -Math.PI);
    const to = resolveNumber(tokens[toIndex + 1], context, Math.PI);
    const samples = Math.max(12, Math.round(parseNamedNumber(tokens, "samples", context, 160)));
    const amplitude = parseNamedNumber(tokens, "amplitude", context, 0.5);
    const scale = parseNamedNumber(tokens, "scale", context, 0.55);
    const y = parseNamedNumber(tokens, "y", context, 0);
    const z = parseNamedNumber(tokens, "z", context, 0);
    const color = parseNamedColor(tokens, "color", context, "#67e8f9");
    const points: VideoLabVec3[] = [];

    for (let index = 0; index <= samples; index += 1) {
      const progress = index / samples;
      const x = from + (to - from) * progress;
      const value =
        aExpression.evaluate({ x, y: 0, t: context.time }) +
        bExpression.evaluate({ x, y: 0, t: context.time });
      points.push([x * scale, y + value * amplitude, z]);
    }

    context.scene.path(points, { id, objectId: id, color, opacity: 0.95 });
  },
};

export const waveSurfaceSourcePrimitive: SourcePrimitive = {
  name: "wave_surface",
  aliases: ["wavesurface"],
  category: "physics",
  createsObject: true,
  description: "Render z=f(x,y,t) as a sampled wave surface.",
  examples: [
    `wave_surface ws = sin(x)*cos(y) range 3 mode mesh color cyan`,
    `wave_surface dots = sin(7*sqrt(x^2+y^2)-10*t) range 3 mode dots color white animate`,
  ],
  completions: [
    {
      label: "wave_surface",
      insertText:
        "wave_surface ${1:ws} = ${2:sin(x)*cos(y)} range ${3:3} mode ${4:mesh} color ${5:cyan}",
      detail: "Create wave surface",
    },
  ],
  reference: {
    id: "wave-surface",
    title: "Wave surface",
    description: "x, y va t expressionlari asosida 3D wave surface yaratadi.",
    examples: [
      `wave_surface ws = sin(x)*cos(y) range 3 mode mesh color cyan`,
      `wave_surface dots = sin(7*sqrt(x^2+y^2)-10*t) range 3 mode dots animate`,
    ],
  },

  compile(args) {
    const { context, tokens } = args;
    const id = tokens[1];

    if (!id) {
      warn(args, `wave_surface id missing. Example: wave_surface ws = sin(x)*cos(y) range 3.`);
      return;
    }

    const equalsIndex = tokenIndex(tokens, "=");

    if (equalsIndex < 0) {
      warn(args, `wave_surface is missing "=". Example: wave_surface ws = sin(x)*cos(y) range 3.`);
      return;
    }

    const expressionEnd = firstStopIndex(
      tokens,
      tokens.length,
      "range",
      "rows",
      "cols",
      "color",
      "opacity",
      "scale",
      "height",
      "baseY",
      "baseZ",
      "style",
      "quality",
      "palette",
      "shade",
      "contrast",
      "brightness",
      "mode",
      "guides",
      "guideOpacity",
      "edgeFade",
      "meshOpacity",
      "lineOpacity",
      "wireframe",
      "wireOpacity",
      "pointSize",
      "size",
      "pointOpacity",
    );
    const expressionSource = expressionBetween(tokens, equalsIndex + 1, expressionEnd);

    if (!expressionSource) {
      warn(args, "wave_surface expression missing.");
      return;
    }

    try {
      const expression = compileMathExpression(expressionSource);
      const rawMode = tokenAfter(tokens, "mode") ?? "lines";

      if (rawMode !== "lines" && rawMode !== "mesh" && rawMode !== "dots") {
        warn(
          args,
          `Unknown wave_surface mode "${rawMode}". Falling back to lines. Use lines, mesh or dots.`,
        );
      }

      const mode = rawMode === "lines" || rawMode === "mesh" || rawMode === "dots"
        ? rawMode
        : "lines";

      const rawStyle = tokenAfter(tokens, "style");
      if (!isSurfaceStyle(rawStyle)) {
        warn(
          args,
          `Unknown wave_surface style "${rawStyle}". Falling back to default style. Use ${surfaceStyleList()}.`,
        );
      }
      const styleDefaults = surfaceStyleDefaults(isSurfaceStyle(rawStyle) ? rawStyle : undefined);

      const rawQuality = tokenAfter(tokens, "quality");
      if (!isSurfaceQuality(rawQuality)) {
        warn(
          args,
          `Unknown wave_surface quality "${rawQuality}". Falling back to medium. Use ${surfaceQualityList()}.`,
        );
      }
      const defaults = surfaceQualityDefaults(isSurfaceQuality(rawQuality) ? rawQuality : undefined);

      const range = parseNamedNumber(tokens, "range", context, 3);
      const rows = Math.max(
        4,
        Math.min(128, Math.round(parseNamedNumber(tokens, "rows", context, defaults.rows))),
      );
      const cols = Math.max(
        8,
        Math.min(260, Math.round(parseNamedNumber(tokens, "cols", context, defaults.cols))),
      );
      const scale = parseNamedNumber(tokens, "scale", context, 0.46);
      const height = parseNamedNumber(tokens, "height", context, 0.5);
      const baseY = parseNamedNumber(tokens, "baseY", context, 0);
      const baseZ = parseNamedNumber(tokens, "baseZ", context, 0);
      const color = parseNamedColor(tokens, "color", context, "#67e8f9");
      const opacity = parseNamedNumber(tokens, "opacity", context, 0.86);
      const palette = tokenAfter(tokens, "palette") ?? styleDefaults.palette;
      const shade = parseNamedNumber(tokens, "shade", context, styleDefaults.shade);
      const contrast = parseNamedNumber(tokens, "contrast", context, styleDefaults.contrast);
      const brightness = parseNamedNumber(tokens, "brightness", context, styleDefaults.brightness);
      const meshOpacity = parseNamedNumber(tokens, "meshOpacity", context, mode === "mesh" ? 0.82 : 0);
      const lineOpacity = parseNamedNumber(tokens, "lineOpacity", context, mode === "mesh" ? 0.08 : opacity);
      const wireframe = parseNamedNumber(tokens, "wireframe", context, mode === "mesh" ? 1 : 0) > 0;
      const wireOpacity = parseNamedNumber(tokens, "wireOpacity", context, mode === "mesh" ? Math.max(0.1, lineOpacity) : 0);
      const pointSize = parseNamedNumber(
        tokens,
        "pointSize",
        context,
        parseNamedNumber(tokens, "size", context, styleDefaults.pointSize),
      );
      const pointOpacity = parseNamedNumber(tokens, "pointOpacity", context, styleDefaults.pointOpacity);
      const guideCount = Math.max(
        0,
        Math.round(parseNamedNumber(tokens, "guides", context, mode === "mesh" ? 10 : 12)),
      );
      const guideOpacity = parseNamedNumber(tokens, "guideOpacity", context, mode === "mesh" ? 0.08 : 0.22);
      const edgeFade = Math.max(0, Math.min(0.85, parseNamedNumber(tokens, "edgeFade", context, 0.25)));
      const currentTime = tokens.includes("animate") ? context.time : 0;

      const result = renderSampledSurface({
        id,
        expression,
        mode: mode as SurfaceRenderMode,
        range,
        rows,
        cols,
        scale,
        height,
        baseY,
        baseZ,
        time: currentTime,
        color,
        opacity,
        palette,
        shade,
        contrast,
        brightness,
        meshOpacity,
        lineOpacity,
        wireframe,
        wireOpacity,
        guides: guideCount,
        guideOpacity,
        edgeFade,
        pointSize,
        pointOpacity,
      });

      context.scene.surface(result.scene, {
        id: `${id}-surface-object`,
        objectId: id,
      });

      result.lineRows.forEach((row) => {
        context.scene.path(row.points, {
          id: row.id,
          objectId: row.objectId,
          color: typeof row.color === "string" ? row.color : color,
          opacity: row.opacity,
        });
      });

      result.guideRows.forEach((row) => {
        context.scene.path(row.points, {
          id: row.id,
          objectId: row.objectId,
          color: typeof row.color === "string" ? row.color : color,
          opacity: row.opacity,
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown expression error.";
      warn(args, `Invalid wave_surface expression "${expressionSource}". ${message}`);
    }
  },

  diagnose({ tokens, lineNumber }) {
    const diagnostics = [];
    if (!tokens[1]) diagnostics.push({ lineNumber, message: "wave_surface id missing." });
    if (!tokenRequired(tokens, "=")) {
      diagnostics.push({ lineNumber, message: "wave_surface needs expression after '='." });
    }
    return diagnostics;
  },
};

export const WAVE_PRIMITIVES: SourcePrimitive[] = [
  waveSourcePrimitive,
  interferenceSourcePrimitive,
  waveSurfaceSourcePrimitive,
];
