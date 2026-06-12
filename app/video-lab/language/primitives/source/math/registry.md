1. secantSourcePrimitiveni qo‘sh

Fayl:

app/video-lab/language/primitives/source/math/calculus.ts

normalSourcePrimitivedan keyin, CALCULUS_PRIMITIVESdan oldin qo‘y:

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

      const x1 = resolveNumber(tokens[fromIndex + 1], context, 0);
      const x2 = resolveNumber(tokens[toIndex + 1], context, 1);

      if (Math.abs(x2 - x1) < 1e-9) {
        warn(args, "secant from/to values must be different.");
        return;
      }

      const y1 = expression.evaluate({ x: x1 });
      const y2 = expression.evaluate({ x: x2 });

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
2. CALCULUS_PRIMITIVESga qo‘sh

Pastdagi array:

export const CALCULUS_PRIMITIVES: SourcePrimitive[] = [
  tangentSourcePrimitive,
  normalSourcePrimitive,
  secantSourcePrimitive,
];
3. Editor fallback
intellisense.ts

OBJECT_COMMANDSga:

"secant",
symbols.ts

OBJECT_COMMANDSga:

"secant",
monacoLanguage.ts

KEYWORDSga:

"secant",

COMPLETIONSga:

{
  label: "secant",
  insertText: "secant ${1:sc} = ${2:sin(x)} from ${3:0.5} to ${4:1.5} length ${5:3} color ${6:green}",
  detail: "Create secant line",
},
4. Tekshir
npm run lint
npx tsc --noEmit
npm run build