import {
    parseNamedColor,
    parseNamedNumber,
    resolveNumber,
} from "../../../values";
import {
    tokenIndex,
    tokenRequired,
    warn,
    type SourcePrimitive,
} from "../core/primitiveTypes";

type ElectricCharge = {
    x: number;
    y: number;
    z: number;
    q: number;
};

export const electricFieldSourcePrimitive: SourcePrimitive = {
    name: "electric_field",
    aliases: ["efield", "electricfield"],
    category: "physics",
    createsObject: true,
    description: "Point charges asosida 2D electric field arrow grid chizadi.",
    examples: [
        `electric_field E charges [[-1,0,1],[1,0,-1]] range 3 step 0.45 color cyan`,
        `efield dipole charges [[-1,0,1],[1,0,-1]] range 3 step 0.5 color white labels`,
    ],
    completions: [
        {
            label: "electric_field",
            insertText:
                "electric_field ${1:E} charges [[${2:-1},${3:0},${4:1}],[${5:1},${6:0},${7:-1}]] range ${8:3} step ${9:0.45} color ${10:cyan}",
            detail: "Create electric field from point charges",
        },
    ],
    reference: {
        id: "electric-field",
        title: "Electric field",
        description:
            "Point charge’lar asosida 2D elektr maydon vektorlarini chizadi. Charge formati: [x, y, q].",
        examples: [
            `electric_field E charges [[-1,0,1],[1,0,-1]] range 3 step 0.45 color cyan`,
            `show E from 0 in 1s`,
        ],
    },

    compile(args) {
        const { context, tokens } = args;
        const id = tokens[1];

        if (!id) {
            warn(
                args,
                `electric_field id missing. Example: electric_field E charges [[-1,0,1],[1,0,-1]].`,
            );
            return;
        }

        const charges = parseElectricCharges(tokens, context);

        if (charges.length === 0) {
            warn(
                args,
                `electric_field needs charges. Example: electric_field E charges [[-1,0,1],[1,0,-1]].`,
            );
            return;
        }

        const modeIndex = tokenIndex(tokens, "mode");
        const mode = modeIndex >= 0 ? tokens[modeIndex + 1] ?? "plane" : "plane";

        if (mode !== "plane" && mode !== "volume") {
            warn(
                args,
                `Unknown electric_field mode "${mode}". Falling back to plane. Use plane or volume.`,
            );
        }

        const fieldMode = mode === "volume" ? "volume" : "plane";

        const layers = Math.max(
            1,
            Math.min(
                9,
                Math.round(
                    parseNamedNumber(
                        tokens,
                        "layers",
                        context,
                        fieldMode === "volume" ? 5 : 1,
                    ),
                ),
            ),
        );

        const range = Math.max(0.5, parseNamedNumber(tokens, "range", context, 3));
        const step = Math.max(0.18, parseNamedNumber(tokens, "step", context, 0.45));
        const scale = parseNamedNumber(tokens, "scale", context, 0.45);
        const fieldScale = parseNamedNumber(tokens, "fieldScale", context, 0.38);
        const softening = Math.max(
            0.05,
            parseNamedNumber(tokens, "softening", context, 0.18),
        );
        const color = parseNamedColor(tokens, "color", context, "#67e8f9");
        const opacity = parseNamedNumber(tokens, "opacity", context, 0.82);
        const z = parseNamedNumber(tokens, "z", context, 0.04);
        const headSize = parseNamedNumber(tokens, "head", context, 0.055);
        const chargeRadius = parseNamedNumber(tokens, "chargeRadius", context, 0.075);

        let arrowIndex = 0;

        const zSamples: number[] = [];

        if (fieldMode === "volume") {
            for (let layer = 0; layer < layers; layer += 1) {
                const progress = layers <= 1 ? 0.5 : layer / (layers - 1);
                zSamples.push(-range * 0.55 + progress * range * 1.1);
            }
        } else {
            zSamples.push(0);
        }

        for (let layerIndex = 0; layerIndex < zSamples.length; layerIndex += 1) {
            const pz = zSamples[layerIndex];
            const layerOpacity =
                fieldMode === "volume"
                    ? opacity * (0.32 + 0.68 * (1 - Math.abs(layerIndex / Math.max(1, zSamples.length - 1) - 0.5) * 2))
                    : opacity;

            for (let px = -range; px <= range + 1e-9; px += step) {
                for (let py = -range; py <= range + 1e-9; py += step) {
                    let ex = 0;
                    let ey = 0;
                    let ez = 0;

                    charges.forEach((charge) => {
                        const dx = px - charge.x;
                        const dy = py - charge.y;
                        const dz = pz - charge.z;
                        const r2 = dx * dx + dy * dy + dz * dz + softening * softening;
                        const r = Math.sqrt(r2);
                        const factor = charge.q / (r2 * r);

                        ex += factor * dx;
                        ey += factor * dy;
                        ez += factor * dz;
                    });

                    const magnitude = Math.hypot(ex, ey, ez);

                    if (!Number.isFinite(magnitude) || magnitude < 1e-7) {
                        continue;
                    }

                    const nx = ex / magnitude;
                    const ny = ey / magnitude;
                    const nz = ez / magnitude;

                    const visualLength =
                        fieldScale * clamp(0.18 + Math.log1p(magnitude) * 0.2, 0.16, 0.86);

                    const arrowOpacity =
                        layerOpacity * clamp(0.28 + Math.log1p(magnitude) * 0.28, 0.28, 1);

                    context.scene.arrow({
                        id: `${id}-arrow-${arrowIndex}`,
                        objectId: id,
                        from: [px * scale, py * scale, pz * scale + z],
                        to: [
                            (px + nx * visualLength) * scale,
                            (py + ny * visualLength) * scale,
                            (pz + nz * visualLength) * scale + z,
                        ],
                        color,
                        opacity: arrowOpacity,
                        headSize,
                    });

                    arrowIndex += 1;
                }
            }
        }

        charges.forEach((charge, index) => {
            const chargeColor = charge.q >= 0 ? "#fb7185" : "#60a5fa";
            const chargeLabel = charge.q >= 0 ? "+" : "−";

            const position: [number, number, number] = [
                charge.x * scale,
                charge.y * scale,
                charge.z * scale + z + 0.08,
            ];

            context.scene.marker({
                id: `${id}-charge-${index}`,
                objectId: id,
                position,
                radius: chargeRadius,
                color: chargeColor,
            });

            // Thin ring around charge so it reads better on dark background.
            context.scene.path(
                createChargeRing(position, chargeRadius * 1.45),
                {
                    id: `${id}-charge-${index}-ring`,
                    objectId: id,
                    color: "#ffffff",
                    opacity: 0.72,
                    closed: true,
                },
            );

            if (tokens.includes("labels")) {
                context.scene.label(chargeLabel, {
                    id: `${id}-charge-${index}-label`,
                    objectId: id,
                    position: [
                        position[0] - chargeRadius * 0.28,
                        position[1] - chargeRadius * 0.35,
                        position[2] + 0.04,
                    ],
                    color: "#ffffff",
                    scale: chargeRadius * 1.65,
                    format: "text",
                });
            }
        });

        if (arrowIndex === 0) {
            warn(args, "electric_field produced no arrows.");
        }
    },

    diagnose({ tokens, lineNumber }) {
        const diagnostics = [];

        if (!tokens[1]) {
            diagnostics.push({
                lineNumber,
                message:
                    `electric_field id missing. Example: electric_field E charges [[-1,0,1],[1,0,-1]].`,
            });
        }

        if (!tokenRequired(tokens, "charges")) {
            diagnostics.push({
                lineNumber,
                message:
                    `electric_field needs charges. Example: electric_field E charges [[-1,0,1],[1,0,-1]].`,
            });
        }

        const modeIndex = tokenIndex(tokens, "mode");
const mode = modeIndex >= 0 ? tokens[modeIndex + 1] : undefined;

if (mode !== undefined && mode !== "plane" && mode !== "volume") {
  diagnostics.push({
    lineNumber,
    message: `Unknown electric_field mode "${mode}". Use plane or volume.`,
  });
}

        return diagnostics;
    },
};

function createChargeRing(
    center: [number, number, number],
    radius: number,
): Array<[number, number, number]> {
    const points: Array<[number, number, number]> = [];
    const samples = 48;

    for (let index = 0; index <= samples; index += 1) {
        const angle = (index / samples) * Math.PI * 2;

        points.push([
            center[0] + Math.cos(angle) * radius,
            center[1] + Math.sin(angle) * radius,
            center[2] + 0.01,
        ]);
    }

    return points;
}

function parseElectricCharges(
    tokens: string[],
    context: Parameters<typeof resolveNumber>[1],
): ElectricCharge[] {
    const chargesIndex = tokenIndex(tokens, "charges");

    if (chargesIndex < 0) {
        return [];
    }

    const stopWords = new Set([
        "range",
        "step",
        "scale",
        "fieldScale",
        "mode",
        "layers",
        "softening",
        "color",
        "opacity",
        "z",
        "head",
        "chargeRadius",
        "labels",
    ]);

    const rawParts: string[] = [];

    for (let index = chargesIndex + 1; index < tokens.length; index += 1) {
        if (stopWords.has(tokens[index])) break;
        rawParts.push(tokens[index]);
    }

    const raw = rawParts.join("");
    const matches = [...raw.matchAll(/\[([^\[\]]+)\]/g)];

    return matches
        .map((match): ElectricCharge | null => {
            const values = match[1]
                .split(",")
                .map((part) => part.trim())
                .filter(Boolean);

            if (values.length < 3) return null;

            if (values.length >= 4) {
                return {
                    x: resolveNumber(values[0], context, 0),
                    y: resolveNumber(values[1], context, 0),
                    z: resolveNumber(values[2], context, 0),
                    q: resolveNumber(values[3], context, 1),
                };
            }

            return {
                x: resolveNumber(values[0], context, 0),
                y: resolveNumber(values[1], context, 0),
                z: 0,
                q: resolveNumber(values[2], context, 1),
            };
        })
        .filter((charge): charge is ElectricCharge => charge !== null);
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

export const FIELD_PRIMITIVES: SourcePrimitive[] = [
    electricFieldSourcePrimitive,
];
