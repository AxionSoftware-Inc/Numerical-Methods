import type * as Monaco from "monaco-editor";
import type { VideoLabCompletionData } from "./intellisense";
import {
    listVideoLabPrimitiveCompletions,
    listVideoLabPrimitiveKeywords,
} from "./primitives";

let dynamicCompletionData: VideoLabCompletionData = {
    variables: [],
    objects: [],
};

export function setVideoLabCompletionData(data: VideoLabCompletionData) {
    dynamicCompletionData = data;
}

export const VIDEO_LAB_LANGUAGE_ID = "methodslab-video";

const KEYWORDS = [
    "scene",
    "duration",
    "fps",
    "camera",
    "orbit",
    "radius",
    "height",
    "turns",
    "write",
    "show",
    "reveal",
    "normal",
    "secant",
    "fade",
    "fadeout",
    "fade-out",
    "hide",
    "highlight",
    "indicate",
    "spin",
    "move",
    "scale",
    "rotate",
    "wait",
    "from",
    "to",
    "at",
    "in",
    "for",
    "color",
    "opacity",
    "size",
    "count",
    "label",
    "points",
    "origin",
    "object",
    "tangent",
    ...listVideoLabPrimitiveKeywords(),
];

const COLORS = [
    "white",
    "slate",
    "gray",
    "cyan",
    "sky",
    "blue",
    "teal",
    "green",
    "emerald",
    "yellow",
    "amber",
    "orange",
    "red",
    "rose",
    "pink",
    "purple",
    "violet",
];

const POSITIONS = [
    "origin",
    "center",
    "top",
    "bottom",
    "left",
    "right",
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
    "title",
    "subtitle",
    "formula",
    "note",
    "grid",
];

const DIRECTIONS = ["up", "down", "left", "right", "front", "back", "x", "y", "z"];

const COMPLETIONS: Array<{
    label: string;
    insertText: string;
    detail: string;
}> = [
        {
            label: "scene",
            insertText: 'scene "${1:Scene Name}"',
            detail: "Set scene name",
        },
        {
            label: "normal",
            insertText: "normal ${1:n} = ${2:sin(x)} at ${3:1} length ${4:4} color ${5:red}",
            detail: "Create normal line",
        },
        {
  label: "secant",
  insertText: "secant ${1:sc} = ${2:sin(x)} from ${3:0.5} to ${4:1.5} length ${5:3} color ${6:green}",
  detail: "Create secant line",
},
        {
            label: "duration",
            insertText: "duration = ${1:8}",
            detail: "Set scene duration",
        },
        {
            label: "fps",
            insertText: "fps = ${1:30}",
            detail: "Set frames per second",
        },
        {
            label: "camera orbit",
            insertText: "camera orbit radius ${1:5.5} height ${2:3.05} turns ${3:0.62}",
            detail: "Orbit camera",
        },
        {
            label: "camera preset surface",
            insertText: "camera preset ${1:surface}",
            detail: "Use a camera preset",
        },
        {
            label: "title",
            insertText: 'title "${1:Title}"',
            detail: "Create title text",
        },
        {
            label: "subtitle",
            insertText: 'subtitle "${1:Subtitle}"',
            detail: "Create subtitle text",
        },
        {
            label: "formula",
            insertText: 'formula ${1:f} = "${2:\\\\int_a^b f(x) dx}" at formula color ${3:cyan}',
            detail: "Create LaTeX formula",
        },
        {
            label: "text",
            insertText: 'text ${1:note} = "${2:Text}" at ${3:bottom-left} color ${4:yellow}',
            detail: "Create text object",
        },
        {
            label: "grid",
            insertText: "grid",
            detail: "Create grid",
        },
        {
            label: "axes",
            insertText: "axes",
            detail: "Create coordinate axes",
        },
        {
            label: "riemann",
            insertText: "riemann ${1:columns} count ${2:7}",
            detail: "Create Riemann columns",
        },
        {
            label: "graph",
            insertText: "graph ${1:g} = ${2:sin(x)} from ${3:-pi} to ${4:pi} color ${5:cyan}",
            detail: "Create function graph",
        },
        {
            label: "tangent",
            insertText: "tangent ${1:tg} = ${2:sin(x)} at ${3:1} length ${4:4} color ${5:yellow}",
            detail: "Create tangent line",
        },
        {
            label: "box",
            insertText: "box ${1:cube} at ${2:center} size ${3:1} color ${4:sky}",
            detail: "Create box",
        },
        {
            label: "plane",
            insertText: "plane ${1:base} at ${2:grid} size ${3:2.4} ${4:2.4} color ${5:teal} opacity ${6:0.18}",
            detail: "Create plane",
        },
        {
            label: "path",
            insertText: "path ${1:motion} points ${2:[0,0,0]} ${3:[1,1,0]} color ${4:yellow}",
            detail: "Create path",
        },
        {
            label: "point",
            insertText: 'point ${1:p} at ${2:center} label "${3:label}"',
            detail: "Create point/marker",
        },
        {
            label: "arrow",
            insertText: "arrow ${1:v} from ${2:origin} to ${3:[1,1,0]} color ${4:cyan}",
            detail: "Create arrow",
        },
        {
            label: "write",
            insertText: "write ${1:target} in ${2:1s}",
            detail: "Write/reveal target",
        },
        {
            label: "show",
            insertText: "show ${1:target} from ${2:0} in ${3:0.8s}",
            detail: "Fade in target",
        },
        {
            label: "fadeout",
            insertText: "fadeout ${1:target} in ${2:0.6s}",
            detail: "Fade out target",
        },
        {
            label: "hide",
            insertText: "hide ${1:target}",
            detail: "Hide target",
        },
        {
            label: "highlight",
            insertText: "highlight ${1:target} in ${2:0.75s}",
            detail: "Highlight target",
        },
        {
            label: "spin",
            insertText: "spin ${1:target} ${2:y} ${3:0.72} turns in ${4:2.5s}",
            detail: "Spin target",
        },
        {
            label: "move",
            insertText: "move ${1:target} ${2:up} ${3:0.4} in ${4:1s}",
            detail: "Move target by direction",
        },
        {
            label: "move to",
            insertText: "move ${1:target} to ${2:center} in ${3:1s}",
            detail: "Move target to position",
        },
        {
            label: "scale",
            insertText: "scale ${1:target} ${2:1.2} in ${3:0.8s}",
            detail: "Scale target",
        },
        {
            label: "rotate",
            insertText: "rotate ${1:target} ${2:y} ${3:180deg} in ${4:1s}",
            detail: "Rotate target",
        },
        {
            label: "wait",
            insertText: "wait ${1:0.4s}",
            detail: "Pause timeline",
        },
    ];

export function registerVideoLabMonacoLanguage(monaco: typeof Monaco) {
    const alreadyRegistered = monaco.languages
        .getLanguages()
        .some((language) => language.id === VIDEO_LAB_LANGUAGE_ID);

    if (!alreadyRegistered) {
        monaco.languages.register({ id: VIDEO_LAB_LANGUAGE_ID });
    }

    monaco.languages.setLanguageConfiguration(VIDEO_LAB_LANGUAGE_ID, {
        comments: {
            lineComment: "#",
        },
        brackets: [
            ["[", "]"],
            ["(", ")"],
        ],
        autoClosingPairs: [
            { open: '"', close: '"' },
            { open: "'", close: "'" },
            { open: "[", close: "]" },
            { open: "(", close: ")" },
        ],
        surroundingPairs: [
            { open: '"', close: '"' },
            { open: "'", close: "'" },
            { open: "[", close: "]" },
            { open: "(", close: ")" },
        ],
    });

    monaco.languages.setMonarchTokensProvider(VIDEO_LAB_LANGUAGE_ID, {
        keywords: KEYWORDS,
        colors: COLORS,
        positions: POSITIONS,
        directions: DIRECTIONS,

        tokenizer: {
            root: [
                [/#.*$/, "comment"],
                [/\/\/.*$/, "comment"],

                [/"([^"\\]|\\.)*$/, "string.invalid"],
                [/"/, "string", "@string_double"],

                [/'([^'\\]|\\.)*$/, "string.invalid"],
                [/'/, "string", "@string_single"],

                [/\[[^\]]*\]/, "number.array"],

                [/[+-]?\d+(\.\d+)?(ms|s|deg|rad)?/, "number"],

                [/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/, "number.hex"],

                [
                    /[a-zA-Z_][\w-]*/,
                    {
                        cases: {
                            "@keywords": "keyword",
                            "@colors": "type.identifier",
                            "@positions": "variable.predefined",
                            "@directions": "variable.predefined",
                            "@default": "identifier",
                        },
                    },
                ],

                [/=/, "operator"],
            ],

            string_double: [
                [/[^\\"]+/, "string"],
                [/\\./, "string.escape"],
                [/"/, "string", "@pop"],
            ],

            string_single: [
                [/[^\\']+/, "string"],
                [/\\./, "string.escape"],
                [/'/, "string", "@pop"],
            ],
        },
    });

    monaco.languages.registerCompletionItemProvider(VIDEO_LAB_LANGUAGE_ID, {
        triggerCharacters: [" ", ".", "="],
        provideCompletionItems: (model, position) => {
            const word = model.getWordUntilPosition(position);

            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            };

            const suggestions: Monaco.languages.CompletionItem[] = [
                ...COMPLETIONS.map((item) => ({
                    label: item.label,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: item.insertText,
                    insertTextRules:
                        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: item.detail,
                    range,
                })),

                ...listVideoLabPrimitiveCompletions().map((item) => ({
                    label: item.label,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: item.insertText,
                    insertTextRules:
                        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: item.detail,
                    range,
                })),

                ...COLORS.map((color) => ({
                    label: color,
                    kind: monaco.languages.CompletionItemKind.Color,
                    insertText: color,
                    detail: "Color",
                    range,
                })),

                ...POSITIONS.map((positionName) => ({
                    label: positionName,
                    kind: monaco.languages.CompletionItemKind.Variable,
                    insertText: positionName,
                    detail: "Named position",
                    range,
                })),

                ...DIRECTIONS.map((direction) => ({
                    label: direction,
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: direction,
                    detail: "Direction",
                    range,
                })),

                ...dynamicCompletionData.variables.map((variable) => ({
                    label: variable,
                    kind: monaco.languages.CompletionItemKind.Variable,
                    insertText: variable,
                    detail: "Variable",
                    range,
                })),

                ...dynamicCompletionData.objects.map((objectId) => ({
                    label: objectId,
                    kind: monaco.languages.CompletionItemKind.Reference,
                    insertText: objectId,
                    detail: "Scene object",
                    range,
                })),
            ];


            return { suggestions };
        },
    });
}
