import type { VideoLabCommand } from "../../commands";
import {
  parseNamedColor,
  parseNamedNumber,
  resolveNumber,
} from "../../values";
import { compileMathExpression, sampleExpression } from "./expression";

export const graphCommand: VideoLabCommand = {
  name: "graph",
  category: "math",
  description: "Sample y = f(x) and render it as a visual path.",
  examples: [
    `graph g = sin(x) from -3.14 to 3.14 color cyan`,
    `graph p = x^2 from -2 to 2 color yellow`,
    `graph line = 0.5*x + 1 from -3 to 3 color red`,
  ],

  compile({ context, tokens, lineNumber }) {
    const id = tokens[1];

    if (!id) {
      context.warnings.push(`Line ${lineNumber}: graph id missing. Example: graph g = sin(x) from -pi to pi.`);
      return;
    }

    const equalsIndex = tokens.indexOf("=");
    const fromIndex = tokens.indexOf("from");
    const toIndex = tokens.indexOf("to");

    if (equalsIndex < 0) {
      context.warnings.push(`Line ${lineNumber}: graph is missing "=". Example: graph g = sin(x) from -pi to pi.`);
      return;
    }

    if (fromIndex < 0 || toIndex < 0) {
      context.warnings.push(`Line ${lineNumber}: graph needs range. Example: graph g = sin(x) from -pi to pi.`);
      return;
    }

    const expressionEnd = Math.min(fromIndex, toIndex);
    const expressionSource = tokens.slice(equalsIndex + 1, expressionEnd).join("");

    if (!expressionSource) {
      context.warnings.push(`Line ${lineNumber}: graph expression missing.`);
      return;
    }

    try {
      const expression = compileMathExpression(expressionSource);
      const from = resolveNumber(tokens[fromIndex + 1], context, -Math.PI);
      const to = resolveNumber(tokens[toIndex + 1], context, Math.PI);
      const samples = Math.max(
        24,
        Math.min(512, Math.round(parseNamedNumber(tokens, "samples", context, 144))),
      );
      const scale = parseNamedNumber(tokens, "scale", context, 0.55);
      const yScale = parseNamedNumber(tokens, "yscale", context, scale);
      const y = parseNamedNumber(tokens, "y", context, 0);
      const z = parseNamedNumber(tokens, "z", context, 0.04);
      const color = parseNamedColor(tokens, "color", context, "#67e8f9");
      const opacity = parseNamedNumber(tokens, "opacity", context, 0.95);

      const points = sampleExpression({
        expression,
        from,
        to,
        samples,
        scale,
        yScale,
        z,
      }).map(([x, pointY, pointZ]) => [x, pointY + y, pointZ] as [number, number, number]);

      if (points.length < 2) {
        context.warnings.push(`Line ${lineNumber}: graph produced too few valid points.`);
        return;
      }

      context.scene.path(points, {
        id,
        objectId: id,
        color,
        opacity,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown expression error.";

      context.warnings.push(
        `Line ${lineNumber}: Invalid graph expression "${expressionSource}". ${message}`,
      );
    }
  },

  diagnose({ tokens, lineNumber }) {
    const diagnostics = [];

    if (!tokens[1]) {
      diagnostics.push({
        lineNumber,
        message: `Graph id missing. Example: graph g = sin(x) from -pi to pi.`,
      });
    }

    if (!tokens.includes("=")) {
      diagnostics.push({
        lineNumber,
        message: `Graph is missing "=". Example: graph g = sin(x) from -pi to pi.`,
      });
    }

    if (!tokens.includes("from") || !tokens.includes("to")) {
      diagnostics.push({
        lineNumber,
        message: `Graph needs range. Example: graph g = sin(x) from -pi to pi.`,
      });
    }

    const equalsIndex = tokens.indexOf("=");
    const fromIndex = tokens.indexOf("from");
    const toIndex = tokens.indexOf("to");

    if (equalsIndex >= 0 && fromIndex >= 0 && toIndex >= 0) {
      const expressionSource = tokens
        .slice(equalsIndex + 1, Math.min(fromIndex, toIndex))
        .join("");

      if (!expressionSource) {
        diagnostics.push({
          lineNumber,
          message: `Graph expression missing. Example: graph g = sin(x) from -pi to pi.`,
        });
      } else {
        try {
          compileMathExpression(expressionSource);
        } catch (error) {
          diagnostics.push({
            lineNumber,
            message: `Invalid graph expression "${expressionSource}". ${
              error instanceof Error ? error.message : "Check syntax."
            }`,
          });
        }
      }
    }

    return diagnostics;
  },

  completions: [
    {
      label: "graph",
      insertText: "graph ${1:g} = ${2:sin(x)} from ${3:-pi} to ${4:pi} color ${5:cyan}",
      detail: "Create sampled function graph",
    },
    {
      label: "graph parabola",
      insertText: "graph ${1:p} = ${2:x^2} from ${3:-2} to ${4:2} color ${5:yellow}",
      detail: "Create parabola graph",
    },
  ],
};
