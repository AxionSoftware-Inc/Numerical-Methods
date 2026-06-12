import {
    parseNamedColor,
    parseNamedNumber,
    parseNamedVec3,
    resolveNumber,
} from "../../../values";
import { compileMathExpression } from "../../math/expression";
import {
  renderSampledSurface,
  type SurfaceRenderMode,
} from "../renderers/surfaceRenderer";
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
  expressionBetween,
  firstStopIndex,
  tokenIndex,
  tokenAfter,
  tokenRequired,
  warn,
  type SourcePrimitive,
} from "../core/primitiveTypes";

type Vec3 = [number, number, number];

export const areaSourcePrimitive: SourcePrimitive = {
    name: "area",
    category: "math",
    createsObject: true,
    description: "Function ostidagi maydonni closed path sifatida yaratadi.",
    examples: [
        `area a = sin(x) from 0 to pi color yellow opacity 0.45`,
        `area p = x^2 from -1 to 1 color cyan opacity 0.35`,
    ],
    completions: [
        {
            label: "area",
            insertText:
                "area ${1:a} = ${2:sin(x)} from ${3:0} to ${4:pi} color ${5:yellow} opacity ${6:0.45}",
            detail: "Create area under graph",
        },
    ],
    reference: {
        id: "area",
        title: "Area",
        description: "Function ostidagi maydonni yopiq path sifatida ko‘rsatadi.",
        examples: [
            `area a = sin(x) from 0 to pi color yellow opacity 0.45`,
            `show a from 0 in 0.8s`,
        ],
    },

    compile(args) {
        const { context, tokens } = args;
        const id = tokens[1];

        if (!id) {
            warn(args, `area id missing. Example: area a = sin(x) from 0 to pi.`);
            return;
        }

        const equalsIndex = tokenIndex(tokens, "=");
        const fromIndex = tokenIndex(tokens, "from");
        const toIndex = tokenIndex(tokens, "to");

        if (equalsIndex < 0 || fromIndex < 0 || toIndex < 0) {
            warn(args, `area needs expression and range. Example: area a = sin(x) from 0 to pi.`);
            return;
        }

        const expressionSource = expressionBetween(
            tokens,
            equalsIndex + 1,
            Math.min(fromIndex, toIndex),
        );

        if (!expressionSource) {
            warn(args, "area expression missing.");
            return;
        }

        try {
            const expression = compileMathExpression(expressionSource);
            const from = resolveNumber(tokens[fromIndex + 1], context, 0);
            const to = resolveNumber(tokens[toIndex + 1], context, Math.PI);
            const samples = Math.max(
                24,
                Math.min(400, Math.round(parseNamedNumber(tokens, "samples", context, 144))),
            );
            const scale = parseNamedNumber(tokens, "scale", context, 0.55);
            const yScale = parseNamedNumber(tokens, "yscale", context, scale);
            const baseline = parseNamedNumber(tokens, "baseline", context, 0);
            const y = parseNamedNumber(tokens, "y", context, 0);
            const z = parseNamedNumber(tokens, "z", context, 0.02);
            const color = parseNamedColor(tokens, "color", context, "#fde047");
            const opacity = parseNamedNumber(tokens, "opacity", context, 0.45);
            const points: Vec3[] = [[from * scale, y + baseline * yScale, z]];

            for (let index = 0; index <= samples; index += 1) {
                const progress = index / samples;
                const x = from + (to - from) * progress;
                const value = expression.evaluate({ x, y: 0, t: context.time });
                points.push([x * scale, y + value * yScale, z]);
            }

            points.push([to * scale, y + baseline * yScale, z]);
            points.push([from * scale, y + baseline * yScale, z]);

            context.scene.path(points, {
                id,
                objectId: id,
                color,
                opacity,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown expression error.";
            warn(args, `Invalid area expression "${expressionSource}". ${message}`);
        }
    },

    diagnose({ tokens, lineNumber }) {
        const diagnostics = [];

        if (!tokens[1]) {
            diagnostics.push({
                lineNumber,
                message: `Area id missing. Example: area a = sin(x) from 0 to pi.`,
            });
        }

        if (!tokenRequired(tokens, "=")) {
            diagnostics.push({
                lineNumber,
                message: `Area is missing "=". Example: area a = sin(x) from 0 to pi.`,
            });
        }

        if (!tokenRequired(tokens, "from") || !tokenRequired(tokens, "to")) {
            diagnostics.push({
                lineNumber,
                message: `Area needs range. Example: area a = sin(x) from 0 to pi.`,
            });
        }

        const equalsIndex = tokenIndex(tokens, "=");
        const fromIndex = tokenIndex(tokens, "from");
        const toIndex = tokenIndex(tokens, "to");

        if (equalsIndex >= 0 && fromIndex >= 0 && toIndex >= 0) {
            const expressionSource = expressionBetween(
                tokens,
                equalsIndex + 1,
                Math.min(fromIndex, toIndex),
            );

            if (!expressionSource) {
                diagnostics.push({
                    lineNumber,
                    message: `Area expression missing. Example: area a = sin(x) from 0 to pi.`,
                });
            } else {
                try {
                    compileMathExpression(expressionSource);
                } catch (error) {
                    diagnostics.push({
                        lineNumber,
                        message: `Invalid area expression "${expressionSource}". ${
                            error instanceof Error ? error.message : "Check syntax."
                        }`,
                    });
                }
            }
        }

        return diagnostics;
    },
};

export const circleSourcePrimitive: SourcePrimitive = {
    name: "circle",
    category: "geometry",
    createsObject: true,
    description: "Circle/ellipse path yaratadi.",
    examples: [
        `circle c at center radius 1 color cyan`,
        `circle orbit at [0, 0, 0] radius 1.4 color yellow samples 128`,
    ],
    completions: [
        {
            label: "circle",
            insertText: "circle ${1:c} at ${2:center} radius ${3:1} color ${4:cyan}",
            detail: "Create circle path",
        },
    ],
    reference: {
        id: "circle",
        title: "Circle",
        description: "Markaz va radius bo‘yicha circle path yaratadi.",
        examples: [
            `circle c at center radius 1 color cyan`,
            `show c from 0 in 0.8s`,
        ],
    },

    compile(args) {
        const { context, tokens } = args;
        const id = tokens[1];

        if (!id) {
            warn(args, `circle id missing. Example: circle c at center radius 1.`);
            return;
        }

        const center = parseNamedVec3(tokens, "at", context, [0, 0, 0.03]);
        const radius = parseNamedNumber(tokens, "radius", context, 1);
        const radiusX = parseNamedNumber(tokens, "radiusX", context, radius);
        const radiusY = parseNamedNumber(tokens, "radiusY", context, radius);
        const samples = Math.max(16, Math.round(parseNamedNumber(tokens, "samples", context, 96)));
        const color = parseNamedColor(tokens, "color", context, "#67e8f9");
        const opacity = parseNamedNumber(tokens, "opacity", context, 0.95);
        const z = parseNamedNumber(tokens, "z", context, center[2]);

        const points: Vec3[] = [];

        for (let index = 0; index <= samples; index += 1) {
            const angle = (index / samples) * Math.PI * 2;
            points.push([
                center[0] + Math.cos(angle) * radiusX,
                center[1] + Math.sin(angle) * radiusY,
                z,
            ]);
        }

        context.scene.path(points, {
            id,
            objectId: id,
            color,
            opacity,
            closed: true,
        });
    },

    diagnose({ tokens, lineNumber }) {
        const diagnostics = [];

        if (!tokens[1]) {
            diagnostics.push({
                lineNumber,
                message: `Circle id missing. Example: circle c at center radius 1.`,
            });
        }

        if (!tokenRequired(tokens, "radius")) {
            diagnostics.push({
                lineNumber,
                message: `Circle is missing "radius". Example: circle c at center radius 1.`,
            });
        }

        return diagnostics;
    },
};

export const numberLineSourcePrimitive: SourcePrimitive = {
    name: "number_line",
    aliases: ["numberline"],
    category: "math",
    createsObject: true,
    description: "1D number line yaratadi.",
    examples: [
        `number_line x from -5 to 5 color cyan`,
        `number_line axis from 0 to 10 ticks 10 color white`,
    ],
    completions: [
        {
            label: "number_line",
            insertText: "number_line ${1:xaxis} from ${2:-5} to ${3:5} ticks ${4:10} color ${5:cyan}",
            detail: "Create number line",
        },
    ],
    reference: {
        id: "number-line",
        title: "Number line",
        description: "1D sonlar o‘qi uchun chiziq va tick markerlar yaratadi.",
        examples: [
            `number_line x from -5 to 5 ticks 10 color cyan`,
            `show x from 0 in 0.8s`,
        ],
    },

    compile(args) {
        const { context, tokens } = args;
        const id = tokens[1];

        if (!id) {
            warn(args, `number_line id missing. Example: number_line x from -5 to 5.`);
            return;
        }

        const fromIndex = tokenIndex(tokens, "from");
        const toIndex = tokenIndex(tokens, "to");

        if (fromIndex < 0 || toIndex < 0) {
            warn(args, `number_line needs range. Example: number_line x from -5 to 5.`);
            return;
        }

        const from = resolveNumber(tokens[fromIndex + 1], context, -5);
        const to = resolveNumber(tokens[toIndex + 1], context, 5);
        const y = parseNamedNumber(tokens, "y", context, -1.22);
        const z = parseNamedNumber(tokens, "z", context, 0.03);
        const scale = parseNamedNumber(tokens, "scale", context, 0.28);
        const ticks = Math.max(0, Math.round(parseNamedNumber(tokens, "ticks", context, 10)));
        const color = parseNamedColor(tokens, "color", context, "#67e8f9");
        const opacity = parseNamedNumber(tokens, "opacity", context, 0.95);
        const tickSize = parseNamedNumber(tokens, "tickSize", context, 0.045);

        const start: Vec3 = [from * scale, y, z];
        const end: Vec3 = [to * scale, y, z];

        context.scene.path([start, end], {
            id,
            objectId: id,
            color,
            opacity,
        });

        for (let index = 0; index <= ticks; index += 1) {
            const progress = ticks === 0 ? 0 : index / ticks;
            const value = from + (to - from) * progress;
            const x = value * scale;

            context.scene.path(
                [
                    [x, y - tickSize, z],
                    [x, y + tickSize, z],
                ],
                {
                    id: `${id}-tick-${index}`,
                    objectId: id,
                    color,
                    opacity: opacity * 0.8,
                },
            );
        }
    },

    diagnose({ tokens, lineNumber }) {
        const diagnostics = [];

        if (!tokens[1]) {
            diagnostics.push({
                lineNumber,
                message: `number_line id missing. Example: number_line x from -5 to 5.`,
            });
        }

        if (!tokenRequired(tokens, "from") || !tokenRequired(tokens, "to")) {
            diagnostics.push({
                lineNumber,
                message: `number_line needs range. Example: number_line x from -5 to 5.`,
            });
        }

        return diagnostics;
    },
};

export const parametricSourcePrimitive: SourcePrimitive = {
    name: "parametric",
    aliases: ["param"],
    category: "math",
    createsObject: true,
    description: "Parametric curve: x(t), y(t), optional z(t).",
    examples: [
        `parametric spiral x = cos(t)*t y = sin(t)*t from 0 to 6.28 color cyan`,
        `parametric c x = cos(t) y = sin(t) from 0 to 6.28 color yellow`,
    ],
    completions: [
        {
            label: "parametric",
            insertText:
                "parametric ${1:c} x = ${2:cos(t)} y = ${3:sin(t)} from ${4:0} to ${5:2*pi} color ${6:cyan}",
            detail: "Create parametric curve",
        },
    ],
    reference: {
        id: "parametric",
        title: "Parametric curve",
        description: "x(t), y(t), z(t) expressionlardan path yaratadi.",
        examples: [
            `parametric c x = cos(t) y = sin(t) from 0 to 2*pi color cyan`,
            `show c from 0 in 1s`,
        ],
    },

    compile(args) {
        const { context, tokens } = args;
        const id = tokens[1];

        if (!id) {
            warn(args, `parametric id missing.`);
            return;
        }

        const xIndex = tokenIndex(tokens, "x");
        const yIndex = tokenIndex(tokens, "y");
        const zIndex = tokenIndex(tokens, "z");
        const fromIndex = tokenIndex(tokens, "from");
        const toIndex = tokenIndex(tokens, "to");

        if (xIndex < 0 || yIndex < 0 || fromIndex < 0 || toIndex < 0) {
            warn(args, `parametric needs x, y, from and to. Example: parametric c x = cos(t) y = sin(t) from 0 to 2*pi.`);
            return;
        }

        const xEquals = tokens[xIndex + 1] === "=" ? xIndex + 2 : xIndex + 1;
        const yEquals = tokens[yIndex + 1] === "=" ? yIndex + 2 : yIndex + 1;
        const zEquals = zIndex >= 0 && tokens[zIndex + 1] === "=" ? zIndex + 2 : zIndex + 1;

        const xEnd = firstStopIndex(tokens, tokens.length, "y", "z", "from", "to", "color", "samples", "scale");
        const yEnd = firstStopIndex(tokens.slice(yEquals), tokens.length - yEquals, "z", "from", "to", "color", "samples", "scale") + yEquals;
        const zEnd =
            zIndex >= 0
                ? firstStopIndex(tokens.slice(zEquals), tokens.length - zEquals, "from", "to", "color", "samples", "scale") + zEquals
                : -1;

        try {
            const xExpression = compileMathExpression(tokens.slice(xEquals, xEnd).join(""));
            const yExpression = compileMathExpression(tokens.slice(yEquals, yEnd).join(""));
            const zExpression = zIndex >= 0 ? compileMathExpression(tokens.slice(zEquals, zEnd).join("")) : null;

            const from = resolveNumber(tokens[fromIndex + 1], context, 0);
            const to = resolveNumber(tokens[toIndex + 1], context, Math.PI * 2);
            const samples = Math.max(8, Math.min(512, Math.round(parseNamedNumber(tokens, "samples", context, 128))));
            const scale = parseNamedNumber(tokens, "scale", context, 0.55);
            const xScale = parseNamedNumber(tokens, "xscale", context, scale);
            const yScale = parseNamedNumber(tokens, "yscale", context, scale);
            const zScale = parseNamedNumber(tokens, "zscale", context, scale);
            const offset = parseNamedVec3(tokens, "at", context, [0, 0, 0.04]);
            const color = parseNamedColor(tokens, "color", context, "#67e8f9");
            const opacity = parseNamedNumber(tokens, "opacity", context, 0.95);

            const points: Vec3[] = [];

            for (let index = 0; index <= samples; index += 1) {
                const progress = index / samples;
                const t = from + (to - from) * progress;
                const x = xExpression.evaluate({ t }) * xScale + offset[0];
                const y = yExpression.evaluate({ t }) * yScale + offset[1];
                const z = (zExpression ? zExpression.evaluate({ t }) * zScale : 0) + offset[2];

                if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
                    points.push([x, y, z]);
                }
            }

            if (points.length < 2) {
                warn(args, "parametric produced too few valid points.");
                return;
            }

            context.scene.path(points, {
                id,
                objectId: id,
                color,
                opacity,
            });
        } catch (error) {
            warn(
                args,
                error instanceof Error
                    ? `Invalid parametric expression. ${error.message}`
                    : "Could not compile parametric curve.",
            );
        }
    },

    diagnose({ tokens, lineNumber }) {
        const diagnostics = [];

        if (!tokens[1]) {
            diagnostics.push({
                lineNumber,
                message: `parametric id missing. Example: parametric c x = cos(t) y = sin(t) from 0 to 2*pi.`,
            });
        }

        if (!tokenRequired(tokens, "x") || !tokenRequired(tokens, "y")) {
            diagnostics.push({
                lineNumber,
                message: `parametric needs x/y expressions. Example: parametric c x = cos(t) y = sin(t) from 0 to 2*pi.`,
            });
        }

        if (!tokenRequired(tokens, "from") || !tokenRequired(tokens, "to")) {
            diagnostics.push({
                lineNumber,
                message: `parametric needs from/to. Example: parametric c x = cos(t) y = sin(t) from 0 to 2*pi.`,
            });
        }

        return diagnostics;
    },
};

export const vectorSourcePrimitive: SourcePrimitive = {
    name: "vector",
    aliases: ["vec"],
    category: "math",
    createsObject: true,
    description: "Vector arrow yaratadi.",
    examples: [
        `vector v from origin to [1, 1, 0] color cyan`,
        `vector force from [0,0,0] to [0,1,0] color red`,
    ],
    completions: [
        {
            label: "vector",
            insertText: "vector ${1:v} from ${2:origin} to ${3:[1,1,0]} color ${4:cyan}",
            detail: "Create vector arrow",
        },
    ],
    reference: {
        id: "vector",
        title: "Vector",
        description: "Vector arrow yaratadi. arrow primitive’ga soddaroq alias.",
        examples: [
            `vector v from origin to [1, 1, 0] color cyan`,
            `show v from 0 in 0.8s`,
        ],
    },

    compile(args) {
        const { context, tokens } = args;
        const id = tokens[1];

        if (!id) {
            warn(args, `vector id missing. Example: vector v from origin to [1,1,0].`);
            return;
        }

        context.scene.arrow({
            id,
            objectId: id,
            from: parseNamedVec3(tokens, "from", context, [0, 0, 0]),
            to: parseNamedVec3(tokens, "to", context, [1, 1, 0]),
            color: parseNamedColor(tokens, "color", context, "#67e8f9"),
            opacity: parseNamedNumber(tokens, "opacity", context, 0.95),
            headSize: parseNamedNumber(tokens, "head", context, 0.105),
        });
    },

    diagnose({ tokens, lineNumber }) {
        const diagnostics = [];

        if (!tokens[1]) {
            diagnostics.push({
                lineNumber,
                message: `Vector id missing. Example: vector v from origin to [1,1,0].`,
            });
        }

        if (!tokenRequired(tokens, "from") || !tokenRequired(tokens, "to")) {
            diagnostics.push({
                lineNumber,
                message: `Vector needs from/to. Example: vector v from origin to [1,1,0].`,
            });
        }

        return diagnostics;
    },
};

export const surfaceSourcePrimitive: SourcePrimitive = {
  name: "surface",
  aliases: ["surf"],
  category: "math",
  createsObject: true,
  description: "3D mathematical surface z=f(x,y) rendered as lines or mesh.",
  examples: [
    `surface s = sin(x)*cos(y) range 3 mode mesh color cyan`,
    `surface saddle = x^2-y^2 range 2 mode mesh color red`,
    `surface ripples = sin(5*sqrt(x^2+y^2)) range 3 mode lines color white`,
  ],
  completions: [
    {
      label: "surface",
      insertText:
        "surface ${1:s} = ${2:sin(x)*cos(y)} range ${3:3} mode ${4:mesh} color ${5:cyan}",
      detail: "Create 3D math surface",
    },
    {
      label: "surface saddle",
      insertText:
        "surface ${1:saddle} = ${2:x^2-y^2} range ${3:2} mode mesh color ${4:red}",
      detail: "Create saddle surface",
    },
  ],
  reference: {
    id: "surface",
    title: "Surface",
    description: "Matematik 3D surface yaratadi: z=f(x,y). Lines yoki mesh mode ishlaydi.",
    examples: [
      `surface s = sin(x)*cos(y) range 3 mode mesh color cyan`,
      `surface saddle = x^2-y^2 range 2 mode mesh color red`,
      `surface ripples = sin(5*sqrt(x^2+y^2)) range 3 mode lines color white`,
      `show s from 0 in 1s`,
    ],
  },

  compile(args) {
    const { context, tokens } = args;
    const id = tokens[1];

    if (!id) {
      warn(args, `surface id missing. Example: surface s = sin(x)*cos(y) range 3.`);
      return;
    }

    const equalsIndex = tokenIndex(tokens, "=");

    if (equalsIndex < 0) {
      warn(args, `surface is missing "=". Example: surface s = sin(x)*cos(y) range 3.`);
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

    const expressionSource = expressionBetween(
      tokens,
      equalsIndex + 1,
      expressionEnd,
    );

    if (!expressionSource) {
      warn(args, "surface expression missing.");
      return;
    }

    try {
      const expression = compileMathExpression(expressionSource);

      const modeIndex = tokenIndex(tokens, "mode");
      const rawMode = modeIndex >= 0 ? tokens[modeIndex + 1] ?? "mesh" : "mesh";

      if (rawMode !== "lines" && rawMode !== "mesh" && rawMode !== "dots") {
        warn(
          args,
          `Unknown surface mode "${rawMode}". Falling back to mesh. Use lines, mesh or dots.`,
        );
      }

      const mode = rawMode === "lines" || rawMode === "mesh" || rawMode === "dots"
        ? rawMode
        : "mesh";

      const range = parseNamedNumber(tokens, "range", context, 3);
      const rawStyle = tokenAfter(tokens, "style");
      if (!isSurfaceStyle(rawStyle)) {
        warn(
          args,
          `Unknown surface style "${rawStyle}". Falling back to default style. Use ${surfaceStyleList()}.`,
        );
      }
      const style = isSurfaceStyle(rawStyle) ? rawStyle : undefined;
      const styleDefaults = surfaceStyleDefaults(style);
      const rawQuality = tokenAfter(tokens, "quality");
      if (!isSurfaceQuality(rawQuality)) {
        warn(
          args,
          `Unknown surface quality "${rawQuality}". Falling back to medium. Use ${surfaceQualityList()}.`,
        );
      }
      const quality = isSurfaceQuality(rawQuality) ? rawQuality : undefined;
      const defaults = surfaceQualityDefaults(quality);

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
      const paletteIndex = tokenIndex(tokens, "palette");
      const palette = paletteIndex >= 0 ? tokens[paletteIndex + 1] ?? styleDefaults.palette : styleDefaults.palette;
      const shade = parseNamedNumber(tokens, "shade", context, styleDefaults.shade);
      const contrast = parseNamedNumber(tokens, "contrast", context, styleDefaults.contrast);
      const brightness = parseNamedNumber(tokens, "brightness", context, styleDefaults.brightness);

      const color = parseNamedColor(tokens, "color", context, "#67e8f9");
      const opacity = parseNamedNumber(tokens, "opacity", context, 0.86);

      const meshOpacity = parseNamedNumber(
        tokens,
        "meshOpacity",
        context,
        mode === "mesh" ? 0.82 : 0,
      );

      const lineOpacity = parseNamedNumber(
        tokens,
        "lineOpacity",
        context,
        mode === "mesh" ? 0.08 : opacity,
      );

      const wireframe = parseNamedNumber(
        tokens,
        "wireframe",
        context,
        mode === "mesh" ? 1 : 0,
      ) > 0;

      const wireOpacity = parseNamedNumber(
        tokens,
        "wireOpacity",
        context,
        mode === "mesh" ? Math.max(0.1, lineOpacity) : 0,
      );
      const pointSize = parseNamedNumber(
        tokens,
        "pointSize",
        context,
        parseNamedNumber(tokens, "size", context, 0.026),
      );
      const pointOpacity = parseNamedNumber(
        tokens,
        "pointOpacity",
        context,
        opacity,
      );

      const guideCount = Math.max(
        0,
        Math.round(
          parseNamedNumber(tokens, "guides", context, mode === "mesh" ? 10 : 12),
        ),
      );

      const guideOpacity = parseNamedNumber(
        tokens,
        "guideOpacity",
        context,
        mode === "mesh" ? 0.08 : 0.22,
      );

      const edgeFade = Math.max(
        0,
        Math.min(0.85, parseNamedNumber(tokens, "edgeFade", context, 0.25)),
      );

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

      warn(
        args,
        `Invalid surface expression "${expressionSource}". ${message}`,
      );
    }
  },

  diagnose({ tokens, lineNumber }) {
    const diagnostics = [];

    if (!tokens[1]) {
      diagnostics.push({
        lineNumber,
        message: `Surface id missing. Example: surface s = sin(x)*cos(y) range 3.`,
      });
    }

    if (!tokenRequired(tokens, "=")) {
      diagnostics.push({
        lineNumber,
        message: `Surface is missing "=". Example: surface s = sin(x)*cos(y) range 3.`,
      });
    }

    const equalsIndex = tokenIndex(tokens, "=");

    if (equalsIndex >= 0) {
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
        "quality",
        "style",
        "palette",
        "shade",
        "contrast",
        "brightness",
      );

      const expressionSource = expressionBetween(
        tokens,
        equalsIndex + 1,
        expressionEnd,
      );

      if (!expressionSource) {
        diagnostics.push({
          lineNumber,
          message: `Surface expression missing. Example: surface s = sin(x)*cos(y) range 3.`,
        });
      } else {
        try {
          compileMathExpression(expressionSource);
        } catch (error) {
          diagnostics.push({
            lineNumber,
            message: `Invalid surface expression "${expressionSource}". ${
              error instanceof Error ? error.message : "Check syntax."
            }`,
          });
        }
      }
    }

    const mode = tokens.includes("mode")
      ? tokens[tokens.indexOf("mode") + 1]
      : undefined;

    if (
      mode !== undefined &&
      mode !== "lines" &&
      mode !== "mesh" &&
      mode !== "dots"
    ) {
      diagnostics.push({
        lineNumber,
        message: `Unknown surface mode "${mode}". Use lines, mesh or dots.`,
      });
    }

    const quality = tokens.includes("quality")
      ? tokens[tokens.indexOf("quality") + 1]
      : undefined;

    if (!isSurfaceQuality(quality)) {
      diagnostics.push({
        lineNumber,
        message: `Unknown surface quality "${quality}". Use ${surfaceQualityList()}.`,
      });
    }

    const style = tokens.includes("style")
      ? tokens[tokens.indexOf("style") + 1]
      : undefined;

    if (!isSurfaceStyle(style)) {
      diagnostics.push({
        lineNumber,
        message: `Unknown surface style "${style}". Use ${surfaceStyleList()}.`,
      });
    }

    return diagnostics;
  },
};

export const MATH_SOURCE_PRIMITIVES: SourcePrimitive[] = [
  areaSourcePrimitive,
  circleSourcePrimitive,
  numberLineSourcePrimitive,
  parametricSourcePrimitive,
  vectorSourcePrimitive,
  surfaceSourcePrimitive,
];

export const SURFACE_PRIMITIVES: SourcePrimitive[] = [
  surfaceSourcePrimitive,
];
