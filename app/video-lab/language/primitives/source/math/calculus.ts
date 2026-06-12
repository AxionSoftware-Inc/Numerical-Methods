import {
  parseNamedColor,
  parseNamedNumber,
  resolveNumber,
} from "../../../values";
import { compileMathExpression } from "../../math/expression";
import {
  expressionBetween,
  firstStopIndex,
  tokenIndex,
  tokenRequired,
  warn,
  type SourcePrimitive,
} from "../core/primitiveTypes";

type Vec3 = [number, number, number];

export const tangentSourcePrimitive: SourcePrimitive = {
  name: "tangent",
  aliases: ["tanline"],
  category: "math",
  createsObject: true,
  description: "Function grafigiga berilgan x nuqtada tangent line chizadi.",
  examples: [
    `tangent tg = sin(x) at 1 color yellow`,
    `tangent line = x^2 at 0.8 length 2 color cyan`,
  ],
  completions: [
    {
      label: "tangent",
      insertText:
        "tangent ${1:tg} = ${2:sin(x)} at ${3:1} length ${4:2} color ${5:yellow}",
      detail: "Create tangent line to a function",
    },
  ],
  reference: {
    id: "tangent",
    title: "Tangent",
    description:
      "Berilgan function uchun x=a nuqtadagi urinma chiziqni chizadi.",
    examples: [
      `tangent tg = sin(x) at 1 color yellow`,
      `tangent tg = x^2 at 1 length 2 color cyan`,
      `show tg from 0 in 0.8s`,
    ],
  },

  compile(args) {
    const { context, tokens } = args;
    const id = tokens[1];

    if (!id) {
      warn(args, `tangent id missing. Example: tangent tg = sin(x) at 1.`);
      return;
    }

    const equalsIndex = tokenIndex(tokens, "=");
    const atIndex = tokenIndex(tokens, "at");

    if (equalsIndex < 0) {
      warn(args, `tangent is missing "=". Example: tangent tg = sin(x) at 1.`);
      return;
    }

    if (atIndex < 0) {
      warn(args, `tangent needs "at". Example: tangent tg = sin(x) at 1.`);
      return;
    }

    const expressionEnd = firstStopIndex(
      tokens,
      tokens.length,
      "at",
      "length",
      "color",
      "opacity",
      "scale",
      "yscale",
      "samples",
      "z",
      "point",
      "label",
    );

    const expressionSource = expressionBetween(
      tokens,
      equalsIndex + 1,
      expressionEnd,
    );

    if (!expressionSource) {
      warn(args, "tangent expression missing.");
      return;
    }

    try {
      const expression = compileMathExpression(expressionSource);
      const currentTime = context.time;

      const x0 = resolveNumber(tokens[atIndex + 1], context, 0);
      const y0 = expression.evaluate({ x: x0, y: 0, t: currentTime });

      if (!Number.isFinite(y0)) {
        warn(args, `tangent value is not finite at x=${x0}.`);
        return;
      }

      const h = parseNamedNumber(tokens, "h", context, 1e-4);
      const yLeft = expression.evaluate({ x: x0 - h, y: 0, t: currentTime });
      const yRight = expression.evaluate({ x: x0 + h, y: 0, t: currentTime });

      if (!Number.isFinite(yLeft) || !Number.isFinite(yRight)) {
        warn(args, `tangent derivative could not be estimated at x=${x0}.`);
        return;
      }

      const derivative = (yRight - yLeft) / (2 * h);

      const length = parseNamedNumber(tokens, "length", context, 2);
      const scale = parseNamedNumber(tokens, "scale", context, 0.55);
      const yScale = parseNamedNumber(tokens, "yscale", context, scale);
      const z = parseNamedNumber(tokens, "z", context, 0.035);
      const color = parseNamedColor(tokens, "color", context, "#fde047");
      const opacity = parseNamedNumber(tokens, "opacity", context, 0.95);

      const xA = x0 - length / 2;
      const xB = x0 + length / 2;
      const yA = y0 + derivative * (xA - x0);
      const yB = y0 + derivative * (xB - x0);

      const points: Vec3[] = [
        [xA * scale, yA * yScale, z],
        [xB * scale, yB * yScale, z],
      ];

      context.scene.path(points, {
        id,
        objectId: id,
        color,
        opacity,
      });

      if (tokens.includes("point")) {
        context.scene.marker({
          id: `${id}-point`,
          objectId: id,
          position: [x0 * scale, y0 * yScale, z + 0.01],
          radius: parseNamedNumber(tokens, "pointRadius", context, 0.055),
          color,
        });
      }

      const labelIndex = tokenIndex(tokens, "label");

      if (labelIndex >= 0) {
        const label = tokens.slice(labelIndex + 1).join(" ");

        if (label) {
          context.scene.label(label, {
            id: `${id}-label`,
            objectId: id,
            position: [x0 * scale + 0.12, y0 * yScale + 0.12, z + 0.02],
            color,
            scale: parseNamedNumber(tokens, "labelScale", context, 0.12),
            format: "text",
          });
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown expression error.";

      warn(args, `Invalid tangent expression "${expressionSource}". ${message}`);
    }
  },

  diagnose({ tokens, lineNumber }) {
    const diagnostics = [];

    if (!tokens[1]) {
      diagnostics.push({
        lineNumber,
        message: `Tangent id missing. Example: tangent tg = sin(x) at 1.`,
      });
    }

    if (!tokenRequired(tokens, "=")) {
      diagnostics.push({
        lineNumber,
        message: `Tangent is missing "=". Example: tangent tg = sin(x) at 1.`,
      });
    }

    if (!tokenRequired(tokens, "at")) {
      diagnostics.push({
        lineNumber,
        message: `Tangent needs "at". Example: tangent tg = sin(x) at 1.`,
      });
    }

    const equalsIndex = tokenIndex(tokens, "=");

    if (equalsIndex >= 0) {
      const expressionEnd = firstStopIndex(
        tokens,
        tokens.length,
        "at",
        "length",
        "color",
        "opacity",
        "scale",
        "yscale",
        "samples",
        "z",
        "point",
        "label",
      );

      const expressionSource = expressionBetween(
        tokens,
        equalsIndex + 1,
        expressionEnd,
      );

      if (!expressionSource) {
        diagnostics.push({
          lineNumber,
          message: `Tangent expression missing. Example: tangent tg = sin(x) at 1.`,
        });
      } else {
        try {
          compileMathExpression(expressionSource);
        } catch (error) {
          diagnostics.push({
            lineNumber,
            message: `Invalid tangent expression "${expressionSource}". ${
              error instanceof Error ? error.message : "Check syntax."
            }`,
          });
        }
      }
    }

    return diagnostics;
  },
};

export const normalSourcePrimitive: SourcePrimitive = {
  name: "normal",
  aliases: ["normalline"],
  category: "math",
  createsObject: true,
  description: "Function grafigiga berilgan x nuqtada normal line chizadi.",
  examples: [
    `normal n = sin(x) at 1 color red`,
    `normal n = x^2 at 0.8 length 2 color rose`,
  ],
  completions: [
    {
      label: "normal",
      insertText:
        "normal ${1:n} = ${2:sin(x)} at ${3:1} length ${4:2} color ${5:red}",
      detail: "Create normal line to a function",
    },
  ],
  reference: {
    id: "normal",
    title: "Normal",
    description:
      "Berilgan function uchun x=a nuqtadagi normal chiziqni chizadi. Normal tangentga perpendikulyar bo‘ladi.",
    examples: [
      `normal n = sin(x) at 1 color red`,
      `normal n = x^2 at 1 length 2 color rose`,
      `show n from 0 in 0.8s`,
    ],
  },

  compile(args) {
    const { context, tokens } = args;
    const id = tokens[1];

    if (!id) {
      warn(args, `normal id missing. Example: normal n = sin(x) at 1.`);
      return;
    }

    const equalsIndex = tokenIndex(tokens, "=");
    const atIndex = tokenIndex(tokens, "at");

    if (equalsIndex < 0) {
      warn(args, `normal is missing "=". Example: normal n = sin(x) at 1.`);
      return;
    }

    if (atIndex < 0) {
      warn(args, `normal needs "at". Example: normal n = sin(x) at 1.`);
      return;
    }

    const expressionEnd = firstStopIndex(
      tokens,
      tokens.length,
      "at",
      "length",
      "color",
      "opacity",
      "scale",
      "yscale",
      "samples",
      "z",
      "point",
      "label",
    );

    const expressionSource = expressionBetween(
      tokens,
      equalsIndex + 1,
      expressionEnd,
    );

    if (!expressionSource) {
      warn(args, "normal expression missing.");
      return;
    }

    try {
      const expression = compileMathExpression(expressionSource);
      const currentTime = context.time;

      const x0 = resolveNumber(tokens[atIndex + 1], context, 0);
      const y0 = expression.evaluate({ x: x0, y: 0, t: currentTime });

      if (!Number.isFinite(y0)) {
        warn(args, `normal value is not finite at x=${x0}.`);
        return;
      }

      const h = parseNamedNumber(tokens, "h", context, 1e-4);
      const yLeft = expression.evaluate({ x: x0 - h, y: 0, t: currentTime });
      const yRight = expression.evaluate({ x: x0 + h, y: 0, t: currentTime });

      if (!Number.isFinite(yLeft) || !Number.isFinite(yRight)) {
        warn(args, `normal derivative could not be estimated at x=${x0}.`);
        return;
      }

      const derivative = (yRight - yLeft) / (2 * h);
      const normalSlope =
        Math.abs(derivative) < 1e-9 ? 1e9 : -1 / derivative;

      const length = parseNamedNumber(tokens, "length", context, 2);
      const scale = parseNamedNumber(tokens, "scale", context, 0.55);
      const yScale = parseNamedNumber(tokens, "yscale", context, scale);
      const z = parseNamedNumber(tokens, "z", context, 0.045);
      const color = parseNamedColor(tokens, "color", context, "#fb7185");
      const opacity = parseNamedNumber(tokens, "opacity", context, 0.95);

      const xA = x0 - length / 2;
      const xB = x0 + length / 2;
      const yA = y0 + normalSlope * (xA - x0);
      const yB = y0 + normalSlope * (xB - x0);

      const points: Vec3[] = [
        [xA * scale, yA * yScale, z],
        [xB * scale, yB * yScale, z],
      ];

      context.scene.path(points, {
        id,
        objectId: id,
        color,
        opacity,
      });

      if (tokens.includes("point")) {
        context.scene.marker({
          id: `${id}-point`,
          objectId: id,
          position: [x0 * scale, y0 * yScale, z + 0.01],
          radius: parseNamedNumber(tokens, "pointRadius", context, 0.055),
          color,
        });
      }

      const labelIndex = tokenIndex(tokens, "label");

      if (labelIndex >= 0) {
        const label = tokens.slice(labelIndex + 1).join(" ");

        if (label) {
          context.scene.label(label, {
            id: `${id}-label`,
            objectId: id,
            position: [x0 * scale + 0.12, y0 * yScale - 0.12, z + 0.02],
            color,
            scale: parseNamedNumber(tokens, "labelScale", context, 0.12),
            format: "text",
          });
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown expression error.";

      warn(args, `Invalid normal expression "${expressionSource}". ${message}`);
    }
  },

  diagnose({ tokens, lineNumber }) {
    const diagnostics = [];

    if (!tokens[1]) {
      diagnostics.push({
        lineNumber,
        message: `Normal id missing. Example: normal n = sin(x) at 1.`,
      });
    }

    if (!tokenRequired(tokens, "=")) {
      diagnostics.push({
        lineNumber,
        message: `Normal is missing "=". Example: normal n = sin(x) at 1.`,
      });
    }

    if (!tokenRequired(tokens, "at")) {
      diagnostics.push({
        lineNumber,
        message: `Normal needs "at". Example: normal n = sin(x) at 1.`,
      });
    }

    const equalsIndex = tokenIndex(tokens, "=");

    if (equalsIndex >= 0) {
      const expressionEnd = firstStopIndex(
        tokens,
        tokens.length,
        "at",
        "length",
        "color",
        "opacity",
        "scale",
        "yscale",
        "samples",
        "z",
        "point",
        "label",
      );

      const expressionSource = expressionBetween(
        tokens,
        equalsIndex + 1,
        expressionEnd,
      );

      if (!expressionSource) {
        diagnostics.push({
          lineNumber,
          message: `Normal expression missing. Example: normal n = sin(x) at 1.`,
        });
      } else {
        try {
          compileMathExpression(expressionSource);
        } catch (error) {
          diagnostics.push({
            lineNumber,
            message: `Invalid normal expression "${expressionSource}". ${
              error instanceof Error ? error.message : "Check syntax."
            }`,
          });
        }
      }
    }

    return diagnostics;
  },
};
export const secantSourcePrimitive: SourcePrimitive = {
  name: "secant",
  aliases: ["secline"],
  category: "math",
  createsObject: true,
  description: "Function grafigidagi ikki nuqta orqali secant line chizadi.",
  examples: [
    `secant sc = sin(x) from 0.5 to 1.5 color green`,
    `secant sc = x^2 from 0 to 1.5 length 3 color cyan`,
  ],
  completions: [
    {
      label: "secant",
      insertText:
        "secant ${1:sc} = ${2:sin(x)} from ${3:0.5} to ${4:1.5} length ${5:3} color ${6:green}",
      detail: "Create secant line through two function points",
    },
  ],
  reference: {
    id: "secant",
    title: "Secant",
    description:
      "Berilgan function uchun ikki x nuqta orqali kesuvchi chiziqni chizadi.",
    examples: [
      `secant sc = sin(x) from 0.5 to 1.5 color green`,
      `secant sc = x^2 from 0 to 1.5 length 3 color cyan`,
      `show sc from 0 in 0.8s`,
    ],
  },

  compile(args) {
    const { context, tokens } = args;
    const id = tokens[1];

    if (!id) {
      warn(args, `secant id missing. Example: secant sc = sin(x) from 0.5 to 1.5.`);
      return;
    }

    const equalsIndex = tokenIndex(tokens, "=");
    const fromIndex = tokenIndex(tokens, "from");
    const toIndex = tokenIndex(tokens, "to");

    if (equalsIndex < 0) {
      warn(args, `secant is missing "=". Example: secant sc = sin(x) from 0.5 to 1.5.`);
      return;
    }

    if (fromIndex < 0 || toIndex < 0) {
      warn(args, `secant needs from/to. Example: secant sc = sin(x) from 0.5 to 1.5.`);
      return;
    }

    const expressionEnd = firstStopIndex(
      tokens,
      tokens.length,
      "from",
      "to",
      "length",
      "color",
      "opacity",
      "scale",
      "yscale",
      "z",
      "points",
      "point",
      "label",
    );

    const expressionSource = expressionBetween(
      tokens,
      equalsIndex + 1,
      expressionEnd,
    );

    if (!expressionSource) {
      warn(args, "secant expression missing.");
      return;
    }

    try {
      const expression = compileMathExpression(expressionSource);
      const currentTime = context.time;

      const x1 = resolveNumber(tokens[fromIndex + 1], context, 0);
      const x2 = resolveNumber(tokens[toIndex + 1], context, 1);

      if (Math.abs(x2 - x1) < 1e-9) {
        warn(args, "secant from/to values must be different.");
        return;
      }

      const y1 = expression.evaluate({ x: x1, y: 0, t: currentTime });
      const y2 = expression.evaluate({ x: x2, y: 0, t: currentTime });

      if (!Number.isFinite(y1) || !Number.isFinite(y2)) {
        warn(args, `secant values are not finite at x=${x1} or x=${x2}.`);
        return;
      }

      const slope = (y2 - y1) / (x2 - x1);
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      const length = parseNamedNumber(tokens, "length", context, Math.abs(x2 - x1));
      const scale = parseNamedNumber(tokens, "scale", context, 0.55);
      const yScale = parseNamedNumber(tokens, "yscale", context, scale);
      const z = parseNamedNumber(tokens, "z", context, 0.04);
      const color = parseNamedColor(tokens, "color", context, "#22c55e");
      const opacity = parseNamedNumber(tokens, "opacity", context, 0.95);

      const xA = midX - length / 2;
      const xB = midX + length / 2;
      const yA = midY + slope * (xA - midX);
      const yB = midY + slope * (xB - midX);

      context.scene.path(
        [
          [xA * scale, yA * yScale, z],
          [xB * scale, yB * yScale, z],
        ],
        {
          id,
          objectId: id,
          color,
          opacity,
        },
      );

      if (tokens.includes("point") || tokens.includes("points")) {
        context.scene.marker({
          id: `${id}-point-a`,
          objectId: id,
          position: [x1 * scale, y1 * yScale, z + 0.01],
          radius: parseNamedNumber(tokens, "pointRadius", context, 0.052),
          color,
        });

        context.scene.marker({
          id: `${id}-point-b`,
          objectId: id,
          position: [x2 * scale, y2 * yScale, z + 0.01],
          radius: parseNamedNumber(tokens, "pointRadius", context, 0.052),
          color,
        });
      }

      const labelIndex = tokenIndex(tokens, "label");

      if (labelIndex >= 0) {
        const label = tokens.slice(labelIndex + 1).join(" ");

        if (label) {
          context.scene.label(label, {
            id: `${id}-label`,
            objectId: id,
            position: [midX * scale + 0.12, midY * yScale + 0.12, z + 0.02],
            color,
            scale: parseNamedNumber(tokens, "labelScale", context, 0.12),
            format: "text",
          });
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown expression error.";

      warn(args, `Invalid secant expression "${expressionSource}". ${message}`);
    }
  },

  diagnose({ tokens, lineNumber }) {
    const diagnostics = [];

    if (!tokens[1]) {
      diagnostics.push({
        lineNumber,
        message: `Secant id missing. Example: secant sc = sin(x) from 0.5 to 1.5.`,
      });
    }

    if (!tokenRequired(tokens, "=")) {
      diagnostics.push({
        lineNumber,
        message: `Secant is missing "=". Example: secant sc = sin(x) from 0.5 to 1.5.`,
      });
    }

    if (!tokenRequired(tokens, "from") || !tokenRequired(tokens, "to")) {
      diagnostics.push({
        lineNumber,
        message: `Secant needs from/to. Example: secant sc = sin(x) from 0.5 to 1.5.`,
      });
    }

    const equalsIndex = tokenIndex(tokens, "=");

    if (equalsIndex >= 0) {
      const expressionEnd = firstStopIndex(
        tokens,
        tokens.length,
        "from",
        "to",
        "length",
        "color",
        "opacity",
        "scale",
        "yscale",
        "z",
        "points",
        "point",
        "label",
      );

      const expressionSource = expressionBetween(
        tokens,
        equalsIndex + 1,
        expressionEnd,
      );

      if (!expressionSource) {
        diagnostics.push({
          lineNumber,
          message: `Secant expression missing. Example: secant sc = sin(x) from 0.5 to 1.5.`,
        });
      } else {
        try {
          compileMathExpression(expressionSource);
        } catch (error) {
          diagnostics.push({
            lineNumber,
            message: `Invalid secant expression "${expressionSource}". ${
              error instanceof Error ? error.message : "Check syntax."
            }`,
          });
        }
      }
    }

    return diagnostics;
  },
};

export const CALCULUS_PRIMITIVES: SourcePrimitive[] = [
  tangentSourcePrimitive,
  normalSourcePrimitive,
  secantSourcePrimitive,
];
