"use client";

import { useEffect, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import {
    registerVideoLabMonacoLanguage,
    VIDEO_LAB_LANGUAGE_ID,
} from "./language/monacoLanguage";
import {
    setVideoLabCompletionData,
} from "./language/monacoLanguage";
import { analyzeVideoLabCode } from "./language/intellisense";

export type VideoLabEditorProps = {
    value: string;
    warnings: string[];
    onChange: (value: string) => void;
};

export function VideoLabEditor({
    value,
    warnings,
    onChange,
}: VideoLabEditorProps) {
    const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof Monaco | null>(null);

    const handleMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        registerVideoLabMonacoLanguage(monaco);
        defineVideoLabTheme(monaco);
        monaco.editor.setTheme("methodslab-dark");

        updateMarkers(monaco, editor.getModel(), warnings);

        setTimeout(() => {
            editor.layout();
        }, 0);
    };

    useEffect(() => {
        const monaco = monacoRef.current;
        const editor = editorRef.current;

        if (!monaco || !editor) return;

        updateMarkers(monaco, editor.getModel(), warnings);
    }, [warnings]);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;

        const handle = window.setTimeout(() => {
            editor.layout();
        }, 0);

        return () => {
            window.clearTimeout(handle);
        };
    }, [value]);

    useEffect(() => {
        const analysis = analyzeVideoLabCode(value);
        setVideoLabCompletionData(analysis.completions);
    }, [value]);

    return (
        <Editor
            beforeMount={(monaco) => {
                registerVideoLabMonacoLanguage(monaco);
                defineVideoLabTheme(monaco);
            }}
            defaultLanguage={VIDEO_LAB_LANGUAGE_ID}
            height="100%"
            language={VIDEO_LAB_LANGUAGE_ID}
            options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                lineHeight: 22,
                padding: { top: 14, bottom: 14 },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                tabSize: 2,
                automaticLayout: true,
                bracketPairColorization: { enabled: true },
                guides: {
                    indentation: true,
                    bracketPairs: false,
                },
                suggest: {
                    showSnippets: true,
                    showColors: true,
                    showWords: true,
                },
                quickSuggestions: {
                    other: true,
                    comments: false,
                    strings: false,
                },
                suggestOnTriggerCharacters: true,
                acceptSuggestionOnEnter: "on",
                wordBasedSuggestions: "off",
                overviewRulerBorder: false,
                renderLineHighlight: "line",
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                smoothScrolling: true,
            }}
            theme="methodslab-dark"
            value={value}
            onChange={(nextValue) => onChange(nextValue ?? "")}
            onMount={handleMount}
        />
    );
}

function defineVideoLabTheme(monaco: typeof Monaco) {
    monaco.editor.defineTheme("methodslab-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [
            { token: "keyword", foreground: "67e8f9", fontStyle: "bold" },
            { token: "string", foreground: "fde68a" },
            { token: "string.escape", foreground: "f9a8d4" },
            { token: "number", foreground: "86efac" },
            { token: "number.array", foreground: "86efac" },
            { token: "number.hex", foreground: "fda4af" },
            { token: "type.identifier", foreground: "c084fc" },
            { token: "variable.predefined", foreground: "38bdf8" },
            { token: "comment", foreground: "64748b", fontStyle: "italic" },
            { token: "operator", foreground: "f8fafc" },
        ],
        colors: {
            "editor.background": "#02060a",
            "editor.foreground": "#e5eef8",
            "editorLineNumber.foreground": "#334155",
            "editorLineNumber.activeForeground": "#67e8f9",
            "editorCursor.foreground": "#67e8f9",
            "editor.selectionBackground": "#164e63aa",
            "editor.inactiveSelectionBackground": "#164e6355",
            "editor.lineHighlightBackground": "#ffffff08",
            "editorGutter.background": "#02060a",
            "editorWarning.foreground": "#facc15",
            "editorOverviewRuler.warningForeground": "#facc15",
            "editorMarkerNavigationWarning.background": "#854d0e",
            "editorSuggestWidget.background": "#071014",
            "editorSuggestWidget.border": "#164e63",
            "editorSuggestWidget.foreground": "#e5eef8",
            "editorSuggestWidget.selectedBackground": "#164e63aa",
            "editorHoverWidget.background": "#071014",
            "editorHoverWidget.border": "#164e63",
        },
    });
}

export function updateMarkers(
    monaco: typeof Monaco,
    model: Monaco.editor.ITextModel | null,
    warnings: string[],
) {
    if (!model) return;

    const markers: Monaco.editor.IMarkerData[] = warnings.map((warning) => {
        const match = warning.match(/^Line\s+(\d+):\s+(.+)$/);
        const parsedLineNumber = match ? Number(match[1]) : 1;
        const lineNumber = Math.max(1, Math.min(model.getLineCount(), parsedLineNumber));
        const message = match?.[2] ?? warning;
        const lineLength = model.getLineLength(lineNumber);

        return {
            severity: monaco.MarkerSeverity.Warning,
            message,
            startLineNumber: lineNumber,
            startColumn: 1,
            endLineNumber: lineNumber,
            endColumn: Math.max(2, lineLength + 1),
        };
    });

    monaco.editor.setModelMarkers(model, "methodslab-video", markers);
}