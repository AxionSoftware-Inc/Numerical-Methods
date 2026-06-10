"use client";

import { useEffect, useMemo, useState } from "react";
import { VisualScene } from "@methodslab/visual-engine/react";
import { renderFrameSpec } from "@methodslab/video-engine/core";
import {
  compileVideoLabCode,
  DEFAULT_VIDEO_LAB_CODE,
} from "./createVideoLabProject";
import { VideoLabEditor } from "./VideoLabEditor";
import { VIDEO_LAB_EXAMPLES } from "./videoLabExamples";

export function VideoLabWorkspace() {
  const [code, setCode] = useState(DEFAULT_VIDEO_LAB_CODE);
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedExampleId, setSelectedExampleId] = useState("volume-integral");

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

  return (
    <section className="grid h-[calc(100vh-48px)] max-h-[calc(100vh-48px)] grid-cols-[520px_1fr] overflow-hidden rounded-[2rem] border border-white/10 bg-[#050b0f] text-white shadow-2xl">
      <aside className="flex min-h-0 flex-col border-r border-white/10 bg-[#071014]">
        <div className="shrink-0 border-b border-white/10 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-cyan-300">
                MethodsLab Video
              </p>

              <h1 className="mt-2 text-xl font-semibold tracking-tight">
                Scientific Scene Editor
              </h1>

              <p className="mt-2 max-w-[390px] text-sm leading-6 text-slate-400">
                Natural mini-language orqali math/physics sahna yoziladi,
                preview esa real vaqt rejimida yangilanadi.
              </p>
            </div>

            <StatusPill error={error} warnings={warnings} />
          </div>
        </div>

        <ExamplesStrip
          selectedExampleId={selectedExampleId}
          onSelect={(exampleId, nextCode) => loadCode(nextCode, exampleId)}
          onReset={() => loadCode(DEFAULT_VIDEO_LAB_CODE, "volume-integral")}
        />

        <div className="flex min-h-0 flex-1 flex-col p-4">
          <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
            <label className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Scene code
            </label>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{code.split(/\r?\n/).length} lines</span>
              <span>•</span>
              <span>{project.timeline.objects?.length ?? 0} tracks</span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
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
        </div>

        <EditorFooter
          error={error}
          warnings={warnings}
          onRestart={restart}
          onReset={() => loadCode(DEFAULT_VIDEO_LAB_CODE, "volume-integral")}
        />
      </aside>

      <main className="relative min-h-0 bg-[radial-gradient(circle_at_50%_12%,rgba(34,211,238,0.08),transparent_42%),linear-gradient(180deg,#061216,#020609)]">
        <VisualScene
          cameraMode="follow-spec"
          cameraResetKey={`${project.id}:${frame.frame}`}
          spec={frame.scene}
          className="absolute inset-0"
        />

        <PreviewHeader
          projectName={project.name}
          fps={project.timeline.fps}
          time={safeTime}
          duration={duration}
        />

        {error ? (
          <div className="absolute left-6 top-6 max-w-[520px] rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100 backdrop-blur">
            <p className="font-semibold">Compile error</p>
            <p className="mt-1 text-red-100/80">{error}</p>
          </div>
        ) : null}

        <TransportBar
          duration={duration}
          fps={project.timeline.fps}
          isPlaying={isPlaying}
          time={safeTime}
          onChange={(value) => {
            setTime(value);
            setIsPlaying(false);
          }}
          onRestart={restart}
          onTogglePlay={togglePlay}
        />
      </main>
    </section>
  );
}

function ExamplesStrip({
  selectedExampleId,
  onSelect,
  onReset,
}: {
  selectedExampleId: string;
  onSelect: (exampleId: string, code: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="shrink-0 border-b border-white/10 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
          Examples
        </p>

        <button
          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-cyan-100"
          onClick={onReset}
          type="button"
        >
          Reset
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {VIDEO_LAB_EXAMPLES.map((example) => {
          const active = selectedExampleId === example.id;

          return (
            <button
              className={
                active
                  ? "min-w-[150px] rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-left text-cyan-100"
                  : "min-w-[150px] rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-left text-slate-300 transition hover:border-cyan-300/25 hover:bg-cyan-300/[0.06] hover:text-cyan-100"
              }
              key={example.id}
              onClick={() => onSelect(example.id, example.code)}
              type="button"
            >
              <p className="text-sm font-medium">{example.title}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-4 text-slate-500">
                {example.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatusPill({
  error,
  warnings,
}: {
  error: string | null;
  warnings: string[];
}) {
  if (error) {
    return (
      <span className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-100">
        Error
      </span>
    );
  }

  if (warnings.length > 0) {
    return (
      <span className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1.5 text-xs text-yellow-100">
        {warnings.length} warning
      </span>
    );
  }

  return (
    <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs text-emerald-100">
      Ready
    </span>
  );
}

function EditorFooter({
  error,
  warnings,
  onRestart,
  onReset,
}: {
  error: string | null;
  warnings: string[];
  onRestart: () => void;
  onReset: () => void;
}) {
  return (
    <div className="shrink-0 border-t border-white/10 p-4">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
        {error ? (
          <div className="text-sm text-red-100">
            <p className="font-medium">Compile failed</p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-red-100/75">
              {error}
            </p>
          </div>
        ) : warnings.length > 0 ? (
          <div className="text-sm text-yellow-100">
            <p className="font-medium">Warnings</p>
            <ul className="mt-1 space-y-1 text-xs leading-5 text-yellow-100/75">
              {warnings.slice(0, 2).map((warning) => (
                <li className="line-clamp-1" key={warning}>
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-sm text-emerald-100">
            <p className="font-medium">Compiled successfully</p>
            <p className="mt-1 text-xs text-emerald-100/70">
              Scene pipeline is ready.
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm transition hover:border-cyan-300/30 hover:bg-cyan-300/10"
          onClick={onReset}
          type="button"
        >
          Reset code
        </button>

        <button
          className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/15"
          onClick={onRestart}
          type="button"
        >
          Restart
        </button>
      </div>

      <details className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-400">
        <summary className="cursor-pointer text-slate-300">
          Quick syntax
        </summary>

        <div className="mt-2 space-y-1 font-mono leading-5 text-cyan-100/90">
          <p>formula f = &quot;x^2&quot; at formula color cyan</p>
          <p>box cube at center size 1 color sky</p>
          <p>move cube up 0.4 in 1s</p>
          <p>rotate cube y 180deg in 1s</p>
        </div>
      </details>
    </div>
  );
}

function PreviewHeader({
  projectName,
  time,
  duration,
  fps,
}: {
  projectName: string;
  time: number;
  duration: number;
  fps: number;
}) {
  return (
    <div className="pointer-events-none absolute right-6 top-6 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
        Preview
      </p>
      <p className="mt-1 text-sm text-cyan-100">{projectName}</p>
      <p className="mt-1 font-mono text-xs text-slate-500">
        {time.toFixed(2)}s / {duration.toFixed(2)}s · {fps}fps
      </p>
    </div>
  );
}

function TransportBar({
  time,
  duration,
  fps,
  isPlaying,
  onChange,
  onRestart,
  onTogglePlay,
}: {
  time: number;
  duration: number;
  fps: number;
  isPlaying: boolean;
  onChange: (value: number) => void;
  onRestart: () => void;
  onTogglePlay: () => void;
}) {
  return (
    <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          className={
            isPlaying
              ? "rounded-xl border border-yellow-300/30 bg-yellow-300/10 px-5 py-2 text-sm text-yellow-100 transition hover:bg-yellow-300/15"
              : "rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/15"
          }
          onClick={onTogglePlay}
          type="button"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>

        <button
          className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-cyan-300/30 hover:bg-cyan-300/10"
          onClick={onRestart}
          type="button"
        >
          Restart
        </button>

        <div className="min-w-0 flex-1">
          <input
            className="w-full accent-cyan-300"
            max={duration}
            min={0}
            step={1 / fps}
            type="range"
            value={time}
            onChange={(event) => onChange(Number(event.target.value))}
          />
        </div>

        <p className="w-[130px] text-right font-mono text-xs text-cyan-100">
          {time.toFixed(2)} / {duration.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
