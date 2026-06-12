"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  Image as ImageIcon,
  Pause,
  Play,
  RotateCcw,
  Terminal,
  Video,
} from "lucide-react";
import { VisualScene } from "@methodslab/visual-engine/react";
import type { VisualSceneSpec } from "@methodslab/visual-engine/core";
import { renderFrameSpec } from "@methodslab/video-engine/core";
import {
  compileVideoLabCode,
  DEFAULT_VIDEO_LAB_CODE,
} from "./createVideoLabProject";
import { VideoLabEditor } from "./VideoLabEditor";
import { VIDEO_LAB_EXAMPLES } from "./videoLabExamples";

type ExportQuality = "1080p" | "4k";
type ViewMode = "2d" | "3d";

export function VideoLabWorkspace() {
  const workspaceRef = useRef<HTMLElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [code, setCode] = useState(DEFAULT_VIDEO_LAB_CODE);
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedExampleId, setSelectedExampleId] = useState("volume-integral");
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [editorWidth, setEditorWidth] = useState(540);
  const [exportQuality, setExportQuality] = useState<ExportQuality>("1080p");
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => initialViewModeForCode(DEFAULT_VIDEO_LAB_CODE));

  const baseCompileResult = useMemo(() => compileVideoLabCode(code), [code]);

  const baseDuration = baseCompileResult.project.timeline.duration;
  const safeTime = Math.min(time, baseDuration);

  const compileResult = useMemo(
    () => compileVideoLabCode(code, { time: safeTime }),
    [code, safeTime],
  );

  const { project, error, warnings } = compileResult;
  const duration = project.timeline.duration;

  const frame = useMemo(() => {
    return renderFrameSpec(project, safeTime);
  }, [project, safeTime]);

  const previewScene = useMemo(() => {
    return viewMode === "2d" ? withTwoDimensionalCamera(frame.scene) : withBlackViewport(frame.scene);
  }, [frame.scene, viewMode]);

  useEffect(() => {
    if (!isPlaying) return;

    let frameId = 0;
    let previous = performance.now();

    const tick = (now: number) => {
      const delta = (now - previous) / 1000;
      previous = now;

      setTime((current) => {
        const next = current + delta;

        if (next >= duration) {
          setIsPlaying(false);
          return duration;
        }

        return next;
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [duration, isPlaying]);

  function loadCode(nextCode: string, exampleId: string) {
    setCode(nextCode);
    setSelectedExampleId(exampleId);
    setTime(0);
    setIsPlaying(false);
    setIsStatusOpen(false);
    setViewMode(initialViewModeForCode(nextCode));
  }

  function restart() {
    setTime(0);
    setIsPlaying(false);
  }

  function togglePlay() {
    if (safeTime >= duration) {
      setTime(0);
      setIsPlaying(true);
      return;
    }

    setIsPlaying((value) => !value);
  }

  function startResize(startX: number) {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    const bounds = workspace.getBoundingClientRect();

    function handleMove(event: PointerEvent) {
      const nextWidth = event.clientX - bounds.left;
      const maxWidth = Math.max(420, bounds.width - 420);

      setEditorWidth(Math.max(360, Math.min(maxWidth, nextWidth)));
    }

    function handleUp() {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);

    setEditorWidth(Math.max(360, Math.min(bounds.width - 420, startX - bounds.left)));
  }

  async function exportPng() {
    const canvas = previewCanvasRef.current;
    if (!canvas || isExporting) return;

    setIsExporting(true);

    try {
      await nextAnimationFrame();
      const output = drawCanvasToExportSize(canvas, exportQuality);
      const blob = await canvasToBlob(output, "image/png");
      downloadBlob(blob, `${safeFileName(project.name)}-${formatTimeForFile(safeTime)}.png`);
    } finally {
      setIsExporting(false);
    }
  }

  async function exportVideo() {
    const sourceCanvas = previewCanvasRef.current;
    if (!sourceCanvas || isExporting) return;

    const mimeType = bestVideoMimeType();

    if (!mimeType) {
      window.alert("Video export is not supported by this browser.");
      return;
    }

    setIsExporting(true);
    setIsPlaying(false);

    const previousTime = safeTime;
    const fps = project.timeline.fps;
    const frameCount = Math.max(1, Math.ceil(duration * fps));
    const outputCanvas = createExportCanvas(exportQuality);
    const context = outputCanvas.getContext("2d");

    if (!context) {
      setIsExporting(false);
      return;
    }

    const stream = outputCanvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: exportQuality === "4k" ? 28_000_000 : 12_000_000,
    });
    const chunks: Blob[] = [];

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });

    const finished = new Promise<Blob>((resolve) => {
      recorder.addEventListener("stop", () => {
        resolve(new Blob(chunks, { type: mimeType }));
      });
    });

    try {
      recorder.start();

      for (let frameIndex = 0; frameIndex <= frameCount; frameIndex += 1) {
        const nextTime = Math.min(duration, frameIndex / fps);
        setTime(nextTime);
        await nextAnimationFrame();
        await nextAnimationFrame();
        drawCanvasIntoContext(sourceCanvas, context, outputCanvas.width, outputCanvas.height);
        await wait(1000 / fps);
      }

      recorder.stop();
      const blob = await finished;
      downloadBlob(blob, `${safeFileName(project.name)}-${exportQuality}.webm`);
    } finally {
      stream.getTracks().forEach((track) => track.stop());
      setTime(previousTime);
      setIsExporting(false);
    }
  }

  return (
    <section
      className="grid h-screen overflow-hidden bg-[#02060a] text-white"
      ref={workspaceRef}
      style={{ gridTemplateColumns: `${editorWidth}px 6px minmax(0, 1fr)` }}
    >
      <aside className="relative flex min-h-0 flex-col bg-[#02060a]">
        <div className="min-h-0 flex-1">
          <VideoLabEditor
            value={code}
            warnings={warnings}
            onChange={(nextCode) => {
              setCode(nextCode);
              setTime(0);
              setIsPlaying(false);
              setSelectedExampleId("custom");
            }}
          />
        </div>

        <StatusConsole
          code={code}
          error={error}
          fps={project.timeline.fps}
          isOpen={isStatusOpen}
          selectedExampleId={selectedExampleId}
          tracks={project.timeline.objects?.length ?? 0}
          warnings={warnings}
          onClose={() => setIsStatusOpen(false)}
          onReset={() => loadCode(DEFAULT_VIDEO_LAB_CODE, "volume-integral")}
          onSelectExample={(exampleId, nextCode) => loadCode(nextCode, exampleId)}
          onToggle={() => setIsStatusOpen((value) => !value)}
        />
      </aside>

      <button
        aria-label="Resize panels"
        className="cursor-col-resize border-x border-white/10 bg-white/[0.025] transition hover:bg-cyan-300/10"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          startResize(event.clientX);
        }}
        type="button"
      />

      <main className="relative min-h-0 overflow-hidden bg-black">
        <VisualScene
          key={`${project.id}:${viewMode}`}
          cameraMode="follow-spec"
          cameraResetKey={`${project.id}:${frame.frame}:${viewMode}`}
          spec={previewScene}
          className="absolute inset-0"
          onCanvasReady={(canvas) => {
            previewCanvasRef.current = canvas;
          }}
        />

        {error ? (
          <div className="absolute left-3 top-3 max-w-[460px] border border-red-400/20 bg-red-950/70 px-3 py-2 text-xs text-red-100 shadow-2xl backdrop-blur">
            <p className="line-clamp-2">{error}</p>
          </div>
        ) : null}

        <TransportBar
          duration={duration}
          fps={project.timeline.fps}
          isPlaying={isPlaying}
          time={safeTime}
          viewMode={viewMode}
          onChange={(value) => {
            setTime(value);
            setIsPlaying(false);
          }}
          onRestart={restart}
          onTogglePlay={togglePlay}
          exportQuality={exportQuality}
          isExporting={isExporting}
          onExportPng={exportPng}
          onExportVideo={exportVideo}
          onQualityChange={setExportQuality}
          onViewModeChange={setViewMode}
        />
      </main>
    </section>
  );
}

function TransportBar({
  time,
  duration,
  fps,
  isPlaying,
  exportQuality,
  isExporting,
  viewMode,
  onChange,
  onExportPng,
  onExportVideo,
  onQualityChange,
  onViewModeChange,
  onRestart,
  onTogglePlay,
}: {
  time: number;
  duration: number;
  fps: number;
  isPlaying: boolean;
  exportQuality: ExportQuality;
  isExporting: boolean;
  viewMode: ViewMode;
  onChange: (value: number) => void;
  onExportPng: () => void;
  onExportVideo: () => void;
  onQualityChange: (quality: ExportQuality) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onRestart: () => void;
  onTogglePlay: () => void;
}) {
  const progress = duration <= 0 ? 0 : Math.min(1, Math.max(0, time / duration));

  return (
    <div className="absolute left-3 top-3 w-[min(520px,calc(100%-24px))] border border-white/[0.06] bg-black/[0.12] px-2 py-1.5 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-2">
        <button
          className={
            isPlaying
              ? "grid h-7 w-7 place-items-center border border-white/[0.08] bg-white/[0.035] text-yellow-100/85 transition hover:bg-white/[0.08]"
              : "grid h-7 w-7 place-items-center border border-white/[0.08] bg-white/[0.035] text-cyan-100/85 transition hover:bg-white/[0.08]"
          }
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={onTogglePlay}
          type="button"
        >
          {isPlaying ? <Pause size={13} /> : <Play size={13} />}
        </button>

        <button
          aria-label="Restart"
          className="grid h-7 w-7 place-items-center border border-white/[0.08] bg-white/[0.025] text-slate-200/75 transition hover:bg-white/[0.08]"
          onClick={onRestart}
          type="button"
        >
          <RotateCcw size={12} />
        </button>

        <div className="relative h-7 min-w-0 flex-1">
          <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/10" />
          <div
            className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-cyan-200/70"
            style={{ width: `${progress * 100}%` }}
          />
          <div
            className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 border border-cyan-100/60 bg-cyan-100/70"
            style={{ left: `${progress * 100}%` }}
          />
          <input
            className="absolute inset-0 h-7 w-full cursor-pointer appearance-none bg-transparent opacity-0"
            max={duration}
            min={0}
            step={1 / fps}
            type="range"
            value={time}
            onChange={(event) => onChange(Number(event.target.value))}
          />
        </div>

        <p className="w-[88px] text-right font-mono text-[10px] text-cyan-100/65">
          {time.toFixed(2)} / {duration.toFixed(2)}
        </p>

        <button
          aria-label="Toggle 2D or 3D view"
          className="h-7 border border-white/[0.08] bg-white/[0.025] px-2 font-mono text-[10px] text-slate-200/75 transition hover:bg-white/[0.08]"
          onClick={() => onViewModeChange(viewMode === "2d" ? "3d" : "2d")}
          type="button"
        >
          {viewMode.toUpperCase()}
        </button>

        <select
          aria-label="Export quality"
          className="h-7 border border-white/[0.08] bg-white/[0.025] px-1.5 font-mono text-[10px] text-slate-200/75 outline-none transition hover:bg-white/[0.08]"
          disabled={isExporting}
          value={exportQuality}
          onChange={(event) => onQualityChange(event.target.value as ExportQuality)}
        >
          <option value="1080p">FHD</option>
          <option value="4k">4K</option>
        </select>

        <button
          aria-label="Export PNG"
          className="grid h-7 w-7 place-items-center border border-white/[0.08] bg-white/[0.025] text-slate-200/75 transition hover:bg-white/[0.08] disabled:cursor-wait disabled:opacity-40"
          disabled={isExporting}
          onClick={onExportPng}
          type="button"
        >
          <ImageIcon size={12} />
        </button>

        <button
          aria-label="Export video"
          className="grid h-7 w-7 place-items-center border border-white/[0.08] bg-white/[0.025] text-slate-200/75 transition hover:bg-white/[0.08] disabled:cursor-wait disabled:opacity-40"
          disabled={isExporting}
          onClick={onExportVideo}
          type="button"
        >
          {isExporting ? <Download size={12} /> : <Video size={12} />}
        </button>
      </div>
    </div>
  );
}

function StatusConsole({
  code,
  error,
  fps,
  isOpen,
  selectedExampleId,
  tracks,
  warnings,
  onClose,
  onReset,
  onSelectExample,
  onToggle,
}: {
  code: string;
  error: string | null;
  fps: number;
  isOpen: boolean;
  selectedExampleId: string;
  tracks: number;
  warnings: string[];
  onClose: () => void;
  onReset: () => void;
  onSelectExample: (exampleId: string, code: string) => void;
  onToggle: () => void;
}) {
  const stateTone = error
    ? "text-red-200"
    : warnings.length > 0
      ? "text-yellow-100"
      : "text-emerald-200";

  return (
    <div className="relative shrink-0 border-t border-white/10 bg-[#05090d]">
      {isOpen ? (
        <div className="absolute inset-x-0 bottom-full z-50 max-h-[44vh] overflow-auto border-t border-white/10 bg-[#05090d]/95 p-3 font-mono text-xs text-slate-300 shadow-2xl backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-slate-500">status</span>
            <button
              aria-label="Close status"
              className="text-slate-500 transition hover:text-slate-200"
              onClick={onClose}
              type="button"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          <div className="space-y-1">
            {error ? <p className="text-red-200">error: {error}</p> : null}
            {warnings.length > 0
              ? warnings.map((warning) => (
                  <p className="text-yellow-100" key={warning}>
                    warning: {warning}
                  </p>
                ))
              : null}
            {!error && warnings.length === 0 ? (
              <p className="text-emerald-200">compiled successfully</p>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {VIDEO_LAB_EXAMPLES.map((example) => (
              <button
                className={
                  selectedExampleId === example.id
                    ? "border border-cyan-300/30 bg-cyan-300/10 px-2 py-1.5 text-left text-cyan-100"
                    : "border border-white/10 bg-white/[0.03] px-2 py-1.5 text-left text-slate-300 transition hover:border-cyan-300/25 hover:bg-cyan-300/[0.06]"
                }
                key={example.id}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectExample(example.id, example.code);
                }}
                type="button"
              >
                {example.title}
              </button>
            ))}
          </div>

          <button
            className="mt-2 border border-white/10 bg-white/[0.03] px-2 py-1.5 text-slate-300 transition hover:border-cyan-300/25 hover:bg-cyan-300/[0.06]"
            onClick={(event) => {
              event.stopPropagation();
              onReset();
            }}
            type="button"
          >
            reset default
          </button>
        </div>
      ) : null}

      <button
        className="flex h-9 w-full items-center justify-between gap-3 px-3 font-mono text-[11px] text-slate-400 transition hover:bg-white/[0.03]"
        onClick={onToggle}
        type="button"
      >
        <span className="flex items-center gap-2">
          <Terminal size={13} />
          <span className={stateTone}>
            {error ? (
              <AlertTriangle size={13} />
            ) : warnings.length > 0 ? (
              <AlertTriangle size={13} />
            ) : (
              <CheckCircle2 size={13} />
            )}
          </span>
          <span>{error ? "error" : warnings.length ? `${warnings.length} warnings` : "ready"}</span>
        </span>

        <span className="flex items-center gap-3 text-slate-500">
          <span>{code.split(/\r?\n/).length} lines</span>
          <span>{tracks} tracks</span>
          <span>{fps} fps</span>
        </span>
      </button>
    </div>
  );
}

function withBlackViewport(scene: VisualSceneSpec): VisualSceneSpec {
  return {
    ...scene,
    style: {
      ...scene.style,
      background: "#000000",
      fogNear: 999,
      fogFar: 1000,
    },
  };
}

function withTwoDimensionalCamera(scene: VisualSceneSpec): VisualSceneSpec {
  return {
    ...withBlackViewport(scene),
    camera: {
      ...scene.camera,
      position: [0, 0, 5.6],
      target: [0, 0, 0],
      fov: 34,
      projection: "orthographic",
      orthographicSize: 3.1,
      minDistance: 1.5,
      maxDistance: 16,
      near: 0.01,
      far: 1000,
    },
  };
}

function initialViewModeForCode(code: string): ViewMode {
  if (/\bcamera\s+preset\s+(2d|front)\b/.test(code)) {
    return "2d";
  }

  if (/\bcamera\s+(orbit|preset\s+(surface|field|top|close))\b/.test(code)) {
    return "3d";
  }

  if (/\b(surface|wave_surface|riemann|plane|box|electric_field)\b/.test(code)) {
    return "3d";
  }

  if (/\b(graph|area|number_line|wave|interference|tangent|normal|secant|field|particle|trajectory)\b/.test(code)) {
    return "2d";
  }

  return "3d";
}

function exportSize(quality: ExportQuality): { width: number; height: number } {
  if (quality === "4k") {
    return { width: 3840, height: 2160 };
  }

  return { width: 1920, height: 1080 };
}

function createExportCanvas(quality: ExportQuality): HTMLCanvasElement {
  const size = exportSize(quality);
  const canvas = document.createElement("canvas");

  canvas.width = size.width;
  canvas.height = size.height;

  return canvas;
}

function drawCanvasToExportSize(
  sourceCanvas: HTMLCanvasElement,
  quality: ExportQuality,
): HTMLCanvasElement {
  const outputCanvas = createExportCanvas(quality);
  const context = outputCanvas.getContext("2d");

  if (context) {
    drawCanvasIntoContext(sourceCanvas, context, outputCanvas.width, outputCanvas.height);
  }

  return outputCanvas;
}

function drawCanvasIntoContext(
  sourceCanvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  context.fillStyle = "#02060a";
  context.fillRect(0, 0, width, height);

  const sourceAspect = sourceCanvas.width / Math.max(1, sourceCanvas.height);
  const targetAspect = width / height;
  const drawWidth = sourceAspect > targetAspect ? width : height * sourceAspect;
  const drawHeight = sourceAspect > targetAspect ? width / sourceAspect : height;
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(sourceCanvas, x, y, drawWidth, drawHeight);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Could not export canvas."));
      }
    }, type);
  });
}

function bestVideoMimeType(): string | null {
  const options = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];

  return options.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function safeFileName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "methodslab-scene";
}

function formatTimeForFile(time: number): string {
  return `${time.toFixed(2).replace(".", "-")}s`;
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
