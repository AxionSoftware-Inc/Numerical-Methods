import { parseNamedColor, parseNamedNumber, parseNamedVec3, type VideoLabVec3 } from "../../../values";
import { tokenIndex, warn, type SourcePrimitive } from "../core/primitiveTypes";

export const particleSourcePrimitive: SourcePrimitive = {
  name: "particle",
  aliases: ["charge"],
  category: "physics",
  createsObject: true,
  description: "Render a particle marker.",
  examples: [`particle p at origin color yellow label "m"`],
  completions: [
    {
      label: "particle",
      insertText: 'particle ${1:p} at ${2:origin} color ${3:yellow} label "${4:m}"',
      detail: "Create particle",
    },
  ],
  reference: {
    id: "particle",
    title: "Particle",
    description: "Nuqta zarracha markerini yaratadi.",
    examples: [`particle m at [1,0,0] color yellow label "m"`],
  },

  compile(args) {
    const { context, tokens } = args;
    const id = tokens[1];
    if (!id) return warn(args, "particle id missing. Example: particle p at origin.");

    const labelIndex = tokenIndex(tokens, "label");
    const label = labelIndex >= 0 ? tokens.slice(labelIndex + 1).join(" ") : undefined;

    context.scene.marker({
      id,
      objectId: id,
      position: parseNamedVec3(tokens, "at", context, [0, 0, 0]),
      radius: parseNamedNumber(tokens, "radius", context, 0.07),
      color: parseNamedColor(tokens, "color", context, "#fde047"),
      label,
    });
  },
};

export const trajectorySourcePrimitive: SourcePrimitive = {
  name: "trajectory",
  aliases: ["traj"],
  category: "physics",
  createsObject: true,
  description: "Render a projectile-style trajectory path.",
  examples: [`trajectory path from [0,0,0] velocity [1,1,0] time 2 color cyan`],
  completions: [
    {
      label: "trajectory",
      insertText: "trajectory ${1:path} from ${2:[0,0,0]} velocity ${3:[1,1,0]} time ${4:2} color ${5:cyan}",
      detail: "Create trajectory",
    },
  ],
  reference: {
    id: "trajectory",
    title: "Trajectory",
    description: "Boshlang‘ich nuqta va velocity asosida parabolic path chizadi.",
    examples: [`trajectory path from [0,0,0] velocity [1,1,0] time 2`],
  },

  compile(args) {
    const { context, tokens } = args;
    const id = tokens[1];
    if (!id) return warn(args, "trajectory id missing.");

    const from = parseNamedVec3(tokens, "from", context, [0, 0, 0]);
    const velocity = parseNamedVec3(tokens, "velocity", context, [1, 1, 0]);
    const duration = parseNamedNumber(tokens, "time", context, 2);
    const gravity = parseNamedNumber(tokens, "gravity", context, 0.8);
    const samples = Math.max(8, Math.round(parseNamedNumber(tokens, "samples", context, 64)));
    const color = parseNamedColor(tokens, "color", context, "#67e8f9");
    const points: VideoLabVec3[] = [];

    for (let index = 0; index <= samples; index += 1) {
      const t = (index / samples) * duration;
      points.push([
        from[0] + velocity[0] * t,
        from[1] + velocity[1] * t - gravity * t * t * 0.5,
        from[2] + velocity[2] * t,
      ]);
    }

    context.scene.path(points, { id, objectId: id, color, opacity: 0.95 });
  },
};

export const PARTICLE_PRIMITIVES: SourcePrimitive[] = [
  particleSourcePrimitive,
  trajectorySourcePrimitive,
];
