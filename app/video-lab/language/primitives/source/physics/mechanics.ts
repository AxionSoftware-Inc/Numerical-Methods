import { parseNamedColor, parseNamedNumber, parseNamedVec3, type VideoLabVec3 } from "../../../values";
import { tokenIndex, warn, type SourcePrimitive } from "../core/primitiveTypes";

export const forceSourcePrimitive: SourcePrimitive = {
  name: "force",
  aliases: ["vector_force"],
  category: "physics",
  createsObject: true,
  description: "Render a force arrow.",
  examples: [`force F from origin to [1,0.5,0] color red label "F"`],
  completions: [
    {
      label: "force",
      insertText: 'force ${1:F} from ${2:origin} to ${3:[1,0,0]} color ${4:red} label "${5:F}"',
      detail: "Create force arrow",
    },
  ],
  reference: {
    id: "force",
    title: "Force",
    description: "Kuch vektori arrow sifatida chiziladi.",
    examples: [`force F from [1,0,0] to [1.7,0.4,0] color red`],
  },

  compile(args) {
    const { context, tokens } = args;
    const id = tokens[1];
    if (!id) return warn(args, "force id missing.");

    const labelIndex = tokenIndex(tokens, "label");
    const label = labelIndex >= 0 ? tokens.slice(labelIndex + 1).join(" ") : undefined;
    const from = parseNamedVec3(tokens, "from", context, [0, 0, 0]);
    const to = parseNamedVec3(tokens, "to", context, [1, 0, 0]);
    const color = parseNamedColor(tokens, "color", context, "#fb7185");

    context.scene.arrow({
      id,
      objectId: id,
      from,
      to,
      color,
      opacity: parseNamedNumber(tokens, "opacity", context, 0.95),
      headSize: parseNamedNumber(tokens, "head", context, 0.12),
    });

    if (label) {
      context.scene.label(label, {
        id: `${id}-label`,
        objectId: id,
        position: [to[0] + 0.08, to[1] + 0.08, to[2]],
        color,
        scale: parseNamedNumber(tokens, "labelScale", context, 0.12),
      });
    }
  },
};

export const springSourcePrimitive: SourcePrimitive = {
  name: "spring",
  category: "physics",
  createsObject: true,
  description: "Render a simple 2D spring path.",
  examples: [`spring s from [-1,0,0] to [1,0,0] turns 10 amplitude 0.12 color cyan`],
  completions: [
    {
      label: "spring",
      insertText: "spring ${1:s} from ${2:[-1,0,0]} to ${3:[1,0,0]} turns ${4:10} amplitude ${5:0.12} color ${6:cyan}",
      detail: "Create spring",
    },
  ],
  reference: {
    id: "spring",
    title: "Spring",
    description: "Ikki nuqta orasida zig-zag spring chizadi.",
    examples: [`spring s from [-1,0,0] to [1,0,0] turns 10 amplitude 0.12`],
  },

  compile(args) {
    const { context, tokens } = args;
    const id = tokens[1];
    if (!id) return warn(args, "spring id missing.");

    const from = parseNamedVec3(tokens, "from", context, [-1, 0, 0]);
    const to = parseNamedVec3(tokens, "to", context, [1, 0, 0]);
    const turns = Math.max(2, Math.round(parseNamedNumber(tokens, "turns", context, 10)));
    const amplitude = parseNamedNumber(tokens, "amplitude", context, 0.12);
    const samples = turns * 8;
    const color = parseNamedColor(tokens, "color", context, "#67e8f9");
    const points: VideoLabVec3[] = [];
    const direction: VideoLabVec3 = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
    const length = Math.hypot(direction[0], direction[1], direction[2]) || 1;
    const normal: VideoLabVec3 = [-direction[1] / length, direction[0] / length, 0];

    for (let index = 0; index <= samples; index += 1) {
      const p = index / samples;
      const wave = Math.sin(p * turns * Math.PI * 2) * amplitude;
      points.push([
        from[0] + direction[0] * p + normal[0] * wave,
        from[1] + direction[1] * p + normal[1] * wave,
        from[2] + direction[2] * p,
      ]);
    }

    context.scene.path(points, {
      id,
      objectId: id,
      color,
      opacity: parseNamedNumber(tokens, "opacity", context, 0.95),
    });
  },
};

export const MECHANICS_PRIMITIVES: SourcePrimitive[] = [
  forceSourcePrimitive,
  springSourcePrimitive,
];
