"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import JSZip from "jszip";
import * as THREE from "three";
import {
  CAMERA_PRESETS,
  DEFAULT_CAMERA_PRESET,
  activeSceneSlide,
  animateSlideText,
  createLabelLayers,
  defaultSceneCode,
  describeKeyframe,
  latexPreview,
  parseSceneScript,
  slideOverlayStyle,
  updateSceneNumber,
} from "@methodslab/scene-dsl/core";
import {
  composeSceneSpec,
  createAxesLayers,
  createCameraPathLayers,
  createTitleLayers,
} from "@methodslab/visual-engine/core";
import type { VisualLayerSpec, VisualSceneSpec } from "@methodslab/visual-engine/core";
import { VisualScene } from "@methodslab/visual-engine/react";
import { createOrbitCameraTrack, frameCount, renderFrameSequence, renderFrameSpec } from "@methodslab/video-engine/core";
import type { ObjectTrackSpec, VideoProjectSpec } from "@methodslab/video-engine/core";
import type { SceneObjectScript, SceneScript } from "@methodslab/scene-dsl/core";
import { Axis3D, Braces, Camera, Download, Film, Loader2, Pause, Play, Route, RotateCcw, Tags, TimerReset } from "lucide-react";

type RenderStatus = "idle" | "recording" | "sequencing" | "done" | "unsupported" | "error";
type VideoFormat = "webm" | "mp4";
type EditorTab = "code" | "timeline" | "objects" | "help";

export default function VideoLab() {
  const [projectOpen, setProjectOpen] = useState(false);
  const [projectName, setProjectName] = useState("Untitled Project");
  const [isPlaying, setIsPlaying] = useState(true);
  const [time, setTime] = useState(0);
  const [sequenceFps, setSequenceFps] = useState(6);
  const [videoFormat, setVideoFormat] = useState<VideoFormat>("webm");
  const [resolution, setResolution] = useState(12);
  const [showAxes, setShowAxes] = useState(false);
  const [showCameraPath, setShowCameraPath] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [scriptText, setScriptText] = useState(defaultSceneCode);
  const [editorTab, setEditorTab] = useState<EditorTab>("code");
  const [renderStatus, setRenderStatus] = useState<RenderStatus>("idle");
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderMessage, setRenderMessage] = useState("Ready to render WebM");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const parsedScript = useMemo(() => parseSceneScript(scriptText), [scriptText]);
  const sceneScript = parsedScript.script;
  const duration = sceneScript.duration;
  const fps = sceneScript.fps;
  const activeSlide = useMemo(() => activeSceneSlide(sceneScript, time), [sceneScript, time]);
  const animatedSlide = useMemo(() => animateSlideText(activeSlide, time), [activeSlide, time]);
  const slideStyle = useMemo(() => slideOverlayStyle(activeSlide, time), [activeSlide, time]);

  const timeline = useMemo(
    () => ({
        duration,
        fps,
        camera:
          sceneScript.camera.keyframes.length > 0
            ? { keyframes: sceneScript.camera.keyframes }
            : sceneScript.camera.orbit
              ? createOrbitCameraTrack({
                  duration,
                  turns: sceneScript.camera.turns,
                  radius: 5.7,
                  height: 3.1,
                  target: [0, 0, 0],
                  samples: 13,
                  fov: 44,
                  easing: "smoothstep",
                  distanceLimits: {
                    minDistance: 1.8,
                    maxDistance: 12,
                  },
                })
              : undefined,
        objects: createObjectTracks(sceneScript),
      }),
    [duration, fps, sceneScript],
  );
  const baseScene = useMemo(() => {
    const scene = createNewProjectSceneSpec();
    const extraLayers = [
      ...(showAxes ? createAxesLayers() : []),
      ...(showCameraPath
        ? createCameraPathLayers(
            (timeline.camera ?? createOrbitCameraTrack({ duration, turns: sceneScript.camera.turns, radius: 5.7, height: 3.1, samples: 13 })).keyframes.flatMap((keyframe) =>
              keyframe.position ? [[keyframe.position[0] * 0.28, 1.36, keyframe.position[1] * 0.28]] : [],
            ),
          )
        : []),
      ...createLabelLayers(sceneScript.labels),
      ...(showTitle ? createTitleLayers(animatedSlide.title, animatedSlide.latex) : []),
    ];
    return composeSceneSpec(scene, extraLayers, {
      id: `${scene.id}:objects:${showAxes ? "a" : "-"}${showCameraPath ? "p" : "-"}${showTitle ? "t" : "-"}`,
      metadata: {
        sceneObjects: extraLayers.length,
      },
    });
  }, [animatedSlide.latex, animatedSlide.title, duration, sceneScript.camera.turns, sceneScript.labels, showAxes, showCameraPath, showTitle, timeline.camera]);
  const project = useMemo<VideoProjectSpec>(
    () => ({
      id: "paraboloid-orbit",
      name: "Paraboloid volume orbit",
      baseScene,
      timeline,
      metadata: {
        source: "MethodsLab video lab",
      },
    }),
    [baseScene, timeline],
  );
  const frame = useMemo(() => renderFrameSpec(project, time), [project, time]);
  const totalFrames = frameCount(project);
  const sequenceFrameTotal = Math.floor(duration * sequenceFps) + 1;
  const isRendering = renderStatus === "recording" || renderStatus === "sequencing";
  const isDefaultProjectScene = scriptText.trim() === defaultSceneCode.trim();

  function openNewProject() {
    setProjectOpen(true);
    setProjectName("Untitled Project");
    setScriptText(defaultSceneCode);
    setTime(0);
    setIsPlaying(false);
    setShowAxes(false);
    setShowCameraPath(false);
    setShowTitle(false);
  }

  useEffect(() => {
    if (!isPlaying || isRendering) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;
      setTime((current) => {
        const next = current + delta;
        return next > duration ? next % duration : next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration, isPlaying, isRendering]);

  function reset() {
    setTime(0);
    setIsPlaying(false);
  }

  function updateScriptNumber(path: "duration" | "fps", value: number) {
    setScriptText((current) => updateSceneNumber(current, path, value));
    if (path === "duration") setTime((current) => Math.min(current, value));
  }

  async function renderVideo() {
    const canvas = canvasRef.current;
    if (!canvas || !("captureStream" in canvas) || typeof MediaRecorder === "undefined") {
      setRenderStatus("unsupported");
      setRenderMessage("This browser cannot record canvas video here");
      return;
    }

    const mimeType = pickSupportedMimeType(videoFormat);
    const outputFormat = mimeType.includes("mp4") ? "mp4" : "webm";
    const chunks: Blob[] = [];
    const stream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: 8_000_000,
    });

    setIsPlaying(false);
    setTime(0);
    setRenderProgress(0);
    setRenderStatus("recording");
    setRenderMessage(outputFormat === videoFormat ? `Rendering ${outputFormat.toUpperCase()}...` : "MP4 is not supported here, rendering WebM instead...");
    await waitForAnimationFrames(2);

    return new Promise<void>((resolve) => {
      let raf = 0;
      const startedAt = performance.now();
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => {
        cancelAnimationFrame(raf);
        stopStream(stream);
        setRenderStatus("error");
        setRenderMessage("Video recorder failed");
        resolve();
      };
      recorder.onstop = () => {
        cancelAnimationFrame(raf);
        stopStream(stream);
        const blob = new Blob(chunks, { type: mimeType || "video/webm" });
        downloadBlob(blob, `methodslab-${project.id}.${outputFormat}`);
        setRenderStatus("done");
        setRenderProgress(1);
        setRenderMessage(`Saved ${formatMegabytes(blob.size)} video`);
        setTime(0);
        resolve();
      };

      recorder.start(250);
      const tick = (now: number) => {
        const elapsed = (now - startedAt) / 1000;
        const nextTime = Math.min(duration, elapsed);
        setTime(nextTime);
        setRenderProgress(nextTime / duration);
        if (nextTime < duration) {
          raf = requestAnimationFrame(tick);
          return;
        }
        setTimeout(() => recorder.stop(), 350);
      };
      raf = requestAnimationFrame(tick);
    });
  }

  async function renderPngSequence() {
    const canvas = canvasRef.current;
    if (!canvas) {
      setRenderStatus("unsupported");
      setRenderMessage("Canvas is not ready yet");
      return;
    }

    setIsPlaying(false);
    setRenderStatus("sequencing");
    setRenderProgress(0);
    setRenderMessage("Rendering deterministic PNG frames...");

    try {
      const zip = new JSZip();
      const sequenceProject: VideoProjectSpec = {
        ...project,
        timeline: {
          ...project.timeline,
          fps: sequenceFps,
        },
      };
      const frames = renderFrameSequence(sequenceProject);
      for (let index = 0; index < frames.length; index += 1) {
        const currentFrame = frames[index];
        setTime(currentFrame.time);
        setRenderProgress(index / Math.max(frames.length - 1, 1));
        await waitForAnimationFrames(2);
        const blob = canvasToPng(canvas);
        zip.file(`frames/frame-${String(currentFrame.frame).padStart(5, "0")}.png`, blob);
      }
      zip.file(
        "manifest.json",
        JSON.stringify(
          {
            project: project.name,
            fps: project.timeline.fps,
            sequenceFps,
            duration: project.timeline.duration,
            frames: frames.length,
            width: canvas.width,
            height: canvas.height,
          },
          null,
          2,
        ),
      );
      setRenderMessage("Packing PNG sequence...");
      const archive = await zip.generateAsync({ type: "blob" }, (metadata) => {
        setRenderProgress(metadata.percent / 100);
      });
      downloadBlob(archive, `methodslab-${project.id}-frames.zip`);
      setRenderStatus("done");
      setRenderProgress(1);
      setRenderMessage(`Saved ${frames.length} PNG frames (${formatMegabytes(archive.size)})`);
      setTime(0);
    } catch {
      setRenderStatus("error");
      setRenderMessage("PNG sequence export failed");
    }
  }

  if (!projectOpen) {
    return (
      <main className="grid min-h-screen lg:grid-cols-[380px_1fr]">
        <section className="flex items-center bg-[#f4f7f8] px-6 py-10 text-[#152026]">
          <div className="w-full max-w-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5c717c]">MethodsLab Video Studio</p>
            <h1 className="mt-3 text-3xl font-semibold">New project</h1>
            <p className="mt-4 text-sm leading-7 text-[#50626b]">Yangi video loyiha ochiladi va ichida bitta sokin 3D integral sahnasi bilan boshlanadi.</p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={openNewProject}
                className="flex h-11 items-center justify-center rounded bg-[#14222b] px-4 text-sm font-medium text-white"
              >
                New Project
              </button>
              <Link
                href="/analyzer"
                className="flex h-11 items-center justify-center rounded border border-[#cfd9dd] bg-white px-4 text-sm font-medium hover:bg-[#eef4f5]"
              >
                Analyzer
              </Link>
            </div>
          </div>
        </section>
        <section className="relative min-h-[48vh] bg-black">
          <DefaultProjectViewport className="absolute inset-0" />
        </section>
      </main>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-[#f4f7f8] text-[#152026]">
      <section className="grid h-screen grid-rows-[minmax(0,52vh)_minmax(0,48vh)] overflow-hidden lg:grid-cols-[minmax(600px,44vw)_1fr] lg:grid-rows-1">
        <aside className="order-2 min-h-0 overflow-y-auto border-t border-[#d8e0e3] bg-[#fbfcfc] p-5 lg:order-1 lg:h-screen lg:border-r lg:border-t-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded bg-[#14222b] text-white">
              <Film size={21} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5c717c]">MethodsLab Video Engine</p>
              <h1 className="text-2xl font-semibold">{projectName}</h1>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href="/analyzer"
              className="flex h-9 items-center justify-center gap-2 rounded border border-[#cfd9dd] bg-white px-3 text-sm font-medium hover:bg-[#eef4f5]"
            >
              Visualizer
            </Link>
            <button type="button" className="flex h-9 items-center justify-center gap-2 rounded bg-[#14222b] px-3 text-sm font-medium text-white">
              <Film size={16} />
              Video
            </button>
          </div>

          <div className="mt-6 space-y-5">
            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <Camera size={17} />
                Camera track
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlaying((value) => !value)}
                  disabled={isRendering}
                  className="flex h-9 items-center justify-center gap-2 rounded bg-[#0f766e] px-3 text-sm font-medium text-white"
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  {isPlaying ? "Pause" : "Play"}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  disabled={isRendering}
                  className="flex h-9 items-center justify-center gap-2 rounded border border-[#cfd9dd] px-3 text-sm font-medium hover:bg-[#eef4f5]"
                >
                  <RotateCcw size={16} />
                  Reset
                </button>
              </div>

              <label htmlFor="time" className="mt-5 flex items-center justify-between text-sm font-semibold text-[#31424b]">
                Timeline
                <span className="font-mono text-[#0f766e]">
                  {time.toFixed(2)}s / {duration.toFixed(1)}s
                </span>
              </label>
              <input
                id="time"
                type="range"
                min="0"
                max={duration}
                step={1 / fps}
                value={time}
                onChange={(event) => {
                  setTime(Number(event.target.value));
                  setIsPlaying(false);
                }}
                disabled={isRendering}
                className="mt-4 w-full accent-[#0f766e]"
              />
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <Download size={17} />
                Render output
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVideoFormat("webm")}
                  disabled={isRendering}
                  className={`h-9 rounded border px-3 text-sm font-medium ${
                    videoFormat === "webm" ? "border-[#14222b] bg-[#14222b] text-white" : "border-[#cfd9dd] hover:bg-[#eef4f5]"
                  }`}
                >
                  WebM
                </button>
                <button
                  type="button"
                  onClick={() => setVideoFormat("mp4")}
                  disabled={isRendering}
                  className={`h-9 rounded border px-3 text-sm font-medium ${
                    videoFormat === "mp4" ? "border-[#14222b] bg-[#14222b] text-white" : "border-[#cfd9dd] hover:bg-[#eef4f5]"
                  }`}
                >
                  MP4
                </button>
              </div>
              <button
                type="button"
                onClick={renderVideo}
                disabled={isRendering}
                className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded bg-[#14222b] px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {renderStatus === "recording" ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                {renderStatus === "recording" ? "Rendering..." : `Render ${videoFormat.toUpperCase()}`}
              </button>
              <button
                type="button"
                onClick={renderPngSequence}
                disabled={isRendering}
                className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded border border-[#0f766e] px-3 text-sm font-medium text-[#0f766e] hover:bg-[#e8f7f4] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {renderStatus === "sequencing" ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                {renderStatus === "sequencing" ? "Exporting frames..." : "Export PNG sequence"}
              </button>
              <div className="mt-4 h-2 overflow-hidden rounded bg-[#dce4e7]">
                <div className="h-full rounded bg-[#0f766e]" style={{ width: `${Math.round(renderProgress * 100)}%` }} />
              </div>
              <p className="mt-3 text-sm leading-6 text-[#50626b]">{renderMessage}</p>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <TimerReset size={17} />
                Project settings
              </div>
              <ControlSlider disabled={isRendering} label="Duration" max={18} min={2} step={1} suffix="s" value={duration} onChange={(value) => updateScriptNumber("duration", value)} />
              <ControlSlider disabled={isRendering} label="Preview FPS" max={60} min={6} step={6} value={fps} onChange={(value) => updateScriptNumber("fps", value)} />
              <ControlSlider disabled={isRendering} label="PNG FPS" max={30} min={3} step={3} value={sequenceFps} onChange={setSequenceFps} />
              <ControlSlider disabled={isRendering} label="Resolution" max={24} min={6} step={1} value={resolution} onChange={setResolution} />
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="text-sm font-semibold text-[#31424b]">Scene objects</div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <ToggleButton active={showAxes} disabled={isRendering} icon={<Axis3D size={16} />} label="Axes" onClick={() => setShowAxes((value) => !value)} />
                <ToggleButton
                  active={showCameraPath}
                  disabled={isRendering}
                  icon={<Route size={16} />}
                  label="Path"
                  onClick={() => setShowCameraPath((value) => !value)}
                />
                <ToggleButton active={showTitle} disabled={isRendering} icon={<Tags size={16} />} label="Title" onClick={() => setShowTitle((value) => !value)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Metric label="Frame" value={`${frame.frame}`} />
              <Metric label="Frames" value={`${totalFrames}`} />
              <Metric label="Progress" value={`${Math.round(frame.progress * 100)}%`} />
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="text-sm font-semibold text-[#31424b]">Engine contract</div>
              <div className="mt-3 space-y-2 font-mono text-[13px] leading-6 text-[#20303a]">
                <p>VisualSceneSpec → TimelineSpec → VideoFrameSpec</p>
                <p>camera keyframes: {project.timeline.camera?.keyframes.length ?? 0}</p>
                <p>object tracks: {project.timeline.objects?.length ?? 0}</p>
                <p>scene layers: {frame.scene.layers.length}</p>
                <p>slides: {sceneScript.slides.length}</p>
                <p>png frames: {sequenceFrameTotal}</p>
              </div>
            </div>

            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31424b]">
                <Braces size={17} />
                Scene code
              </div>
              <button
                type="button"
                onClick={() => setScriptText(defaultSceneCode)}
                disabled={isRendering}
                className="mt-3 h-8 rounded border border-[#cfd9dd] px-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#31424b] hover:bg-[#eef4f5]"
              >
                Load short demo
              </button>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {(["code", "timeline", "objects", "help"] as EditorTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setEditorTab(tab)}
                    className={`h-8 rounded border px-2 text-xs font-semibold uppercase tracking-[0.08em] ${
                      editorTab === tab ? "border-[#14222b] bg-[#14222b] text-white" : "border-[#cfd9dd] hover:bg-[#eef4f5]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              {editorTab === "code" ? (
                <textarea
                  value={scriptText}
                  onChange={(event) => setScriptText(event.target.value)}
                  onKeyDown={(event) => handleEditorKeyDown(event, setScriptText)}
                  disabled={isRendering}
                  spellCheck={false}
                  wrap="off"
                  className="mt-3 h-80 w-full resize-none overflow-auto whitespace-pre rounded border border-[#cfd9dd] bg-[#071115] p-3 font-mono text-xs leading-5 text-[#d7e3ea] outline-none focus:border-[#0f766e]"
                />
              ) : null}
              {editorTab === "timeline" ? <TimelineSummary script={sceneScript} /> : null}
              {editorTab === "objects" ? <ObjectSummary script={sceneScript} /> : null}
              {editorTab === "help" ? <ScriptHelp /> : null}
              <p className={`mt-2 text-sm ${parsedScript.error ? "text-[#b91c1c]" : "text-[#50626b]"}`}>
                {parsedScript.error ?? "One readable scene file controls objects, keyframes, slides, camera, and export timing."}
              </p>
            </div>
          </div>
        </aside>

        <div className="relative order-1 min-h-0 overflow-hidden bg-black lg:order-2">
          {isDefaultProjectScene ? (
            <DefaultProjectViewport className="absolute inset-0" onCanvasReady={(canvas) => (canvasRef.current = canvas)} />
          ) : (
            <VisualScene cameraMode="follow-spec" className="absolute inset-0" onCanvasReady={(canvas) => (canvasRef.current = canvas)} spec={frame.scene} />
          )}
          <div className="pointer-events-none absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-2 text-xs font-medium">
            <span className="rounded bg-[#38bdf8] px-2 py-1 text-[#082f49]">preview</span>
            <span className="rounded bg-[#e2e8f0] px-2 py-1 text-[#334155]">{project.name}</span>
            <span className="rounded bg-[#fef3c7] px-2 py-1 text-[#713f12]">frame {frame.frame}</span>
          </div>
          {showTitle ? (
            <div className="pointer-events-none absolute left-4 top-16 max-w-[min(460px,calc(100%-2rem))] text-[#e2e8f0] transition-[opacity,transform] duration-300" style={slideStyle}>
              <div className="text-lg font-semibold">{animatedSlide.title}</div>
              <div className="mt-2 font-mono text-xl text-[#fde047]">{latexPreview(animatedSlide.latex)}</div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function ToggleButton({
  active,
  disabled,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-9 items-center justify-center gap-2 rounded border px-2 text-sm font-medium ${
        active ? "border-[#0f766e] bg-[#e8f7f4] text-[#0f766e]" : "border-[#cfd9dd] hover:bg-[#eef4f5]"
      } disabled:cursor-not-allowed disabled:opacity-70`}
    >
      {icon}
      {label}
    </button>
  );
}

function DefaultProjectViewport({ className, onCanvasReady }: { className?: string; onCanvasReady?: (canvas: HTMLCanvasElement | null) => void }) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth || 1, mount.clientHeight || 1, false);
    renderer.setClearColor("#000000");
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    mount.appendChild(renderer.domElement);
    onCanvasReady?.(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, (mount.clientWidth || 1) / (mount.clientHeight || 1), 0.01, 100);
    const defaultPreset = CAMERA_PRESETS[DEFAULT_CAMERA_PRESET];
    const presetTarget = defaultPreset.target ?? [0, 0, 0];
    const presetPosition = defaultPreset.position ?? [4.8, 3.9, 5.2];
    const target = new THREE.Vector3(...presetTarget);
    const spherical = new THREE.Spherical().setFromVector3(new THREE.Vector3(...presetPosition).sub(target));
    const pointer = {
      active: false,
      x: 0,
      y: 0,
    };
    const cameraPosition = new THREE.Vector3();

    const applyCamera = () => {
      spherical.phi = THREE.MathUtils.clamp(spherical.phi, 0.2, Math.PI - 0.2);
      spherical.radius = THREE.MathUtils.clamp(spherical.radius, 2.2, 13);
      cameraPosition.setFromSpherical(spherical).add(target);
      camera.position.copy(cameraPosition);
      camera.lookAt(target);
      camera.updateProjectionMatrix();
    };

    camera.fov = defaultPreset.fov ?? 40;
    applyCamera();

    scene.add(new THREE.AmbientLight(0xffffff, 1.3));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(5, 6, 7);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x7dd3fc, 1.2);
    fill.position.set(-4, 2, 4);
    scene.add(fill);

    const grid = new THREE.GridHelper(3.2, 12, "#334155", "#1f2937");
    grid.position.y = -0.82;
    scene.add(grid);

    const frame = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(2.2, 2.1, 2.2)),
      new THREE.LineBasicMaterial({ color: "#94a3b8", transparent: true, opacity: 0.3 }),
    );
    frame.position.set(0, -0.1, 0);
    scene.add(frame);

    const originAxes = new THREE.AxesHelper(1.28);
    originAxes.position.set(0, -0.82, 0);
    scene.add(originAxes);

    const originDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 18, 18),
      new THREE.MeshStandardMaterial({ color: "#e2e8f0", emissive: "#94a3b8", emissiveIntensity: 0.16 }),
    );
    originDot.position.set(0, -0.82, 0);
    scene.add(originDot);

    const heights = [
      [0.82, 1.02, 0.82],
      [1.02, 1.24, 1.02],
      [0.82, 1.02, 0.82],
    ];
    const palette = ["#38bdf8", "#5eead4", "#fde047"];
    heights.forEach((row, rowIndex) => {
      row.forEach((height, columnIndex) => {
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, height, 0.42),
          new THREE.MeshStandardMaterial({
            color: palette[rowIndex === 1 && columnIndex === 1 ? 2 : rowIndex === 1 || columnIndex === 1 ? 1 : 0],
            roughness: 0.45,
            metalness: 0.06,
          }),
        );
        box.position.set((columnIndex - 1) * 0.58, -0.82 + height / 2, (rowIndex - 1) * 0.58);
        scene.add(box);
      });
    });

    const handlePointerDown = (event: PointerEvent) => {
      pointer.active = true;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.style.cursor = "grabbing";
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!pointer.active) return;
      const deltaX = event.clientX - pointer.x;
      const deltaY = event.clientY - pointer.y;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      spherical.theta -= deltaX * 0.008;
      spherical.phi -= deltaY * 0.008;
      applyCamera();
    };

    const handlePointerUp = (event: PointerEvent) => {
      pointer.active = false;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      renderer.domElement.style.cursor = "grab";
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      spherical.radius *= event.deltaY > 0 ? 1.08 : 0.92;
      applyCamera();
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointerleave", handlePointerUp);
    renderer.domElement.addEventListener("wheel", handleWheel, { passive: false });
    renderer.domElement.style.cursor = "grab";

    const resizeObserver = new ResizeObserver(() => {
      const width = mount.clientWidth || 1;
      const height = mount.clientHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(mount);

    let frameId = 0;
    const render = () => {
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointerleave", handlePointerUp);
      renderer.domElement.removeEventListener("wheel", handleWheel);
      renderer.dispose();
      renderer.domElement.remove();
      onCanvasReady?.(null);
    };
  }, [onCanvasReady]);

  return <div ref={mountRef} className={className} />;
}

function TimelineSummary({ script }: { script: SceneScript }) {
  const keyframes = Object.entries(script.objects).flatMap(([id, object]) =>
    (object.keyframes ?? []).map((keyframe) => ({
      objectId: id,
      keyframe,
    })),
  );
  return (
    <div className="mt-3 max-h-72 overflow-y-auto rounded border border-[#cfd9dd] bg-[#f8fafb] p-3 text-sm">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#6b7f89]">Slides</div>
      <div className="mt-2 space-y-2">
        {script.slides.map((slide) => (
          <div key={`${slide.start}-${slide.end}-${slide.title}`} className="rounded border border-[#dce4e7] bg-white p-2">
            <div className="font-mono text-xs text-[#0f766e]">
              {slide.start}s → {slide.end}s
            </div>
            <div className="mt-1 font-medium text-[#20303a]">{slide.title}</div>
            <div className="mt-1 font-mono text-xs text-[#6b7280]">{latexPreview(slide.latex)}</div>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-[#94a3b8]">effect {slide.effect ?? "cut"}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 font-mono text-xs uppercase tracking-[0.12em] text-[#6b7f89]">Object keyframes</div>
      <div className="mt-2 space-y-2">
        {keyframes.map(({ objectId, keyframe }, index) => (
          <div key={`${objectId}-${keyframe.time}-${index}`} className="rounded border border-[#dce4e7] bg-white p-2">
            <span className="font-mono text-[#0f766e]">{keyframe.time}s</span>
            <span className="ml-2 font-medium">{objectId}</span>
            <span className="ml-2 font-mono text-xs text-[#6b7280]">{describeKeyframe(keyframe)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ObjectSummary({ script }: { script: SceneScript }) {
  return (
    <div className="mt-3 grid gap-2">
      {Object.entries(script.objects).map(([id, object]) => (
        <div key={id} className="rounded border border-[#dce4e7] bg-[#f8fafb] p-3 text-sm">
          <div className="font-semibold text-[#20303a]">{id}</div>
          <div className="mt-2 font-mono text-xs leading-5 text-[#50626b]">
            <div>spin: {object.spin ? `${object.spin.turns} turn(s) around ${object.spin.axis}` : "none"}</div>
            <div>keyframes: {object.keyframes?.length ?? 0}</div>
            {(object.keyframes ?? []).slice(0, 4).map((keyframe) => (
              <div key={`${id}-${keyframe.time}`} className="text-[#64748b]">
                {keyframe.time}s {describeKeyframe(keyframe)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ScriptHelp() {
  return (
    <div className="mt-3 rounded border border-[#cfd9dd] bg-[#071115] p-3 font-mono text-xs leading-5 text-[#d7e3ea]">
      <p>{`config:`}</p>
      <p>{`  duration: 10`}</p>
      <p>{`  theme: black`}</p>
      <p className="mt-3">{`object volume:`}</p>
      <p>{`slide "Yangi sahna":`}</p>
      <p>{`  camera: front`}</p>
      <p>{`  latex:`}</p>
      <p className="mt-3 text-[#93c5fd]">{`Default loyiha bitta sokin obyekt bilan ochiladi. Keyin animate yoki text bloklarini qo'shib borasiz.`}</p>
    </div>
  );
}

function handleEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>, setValue: (updater: (current: string) => string) => void) {
  if (event.key !== "Tab") return;
  event.preventDefault();
  const target = event.currentTarget;
  const start = target.selectionStart;
  const end = target.selectionEnd;
  setValue((current) => `${current.slice(0, start)}  ${current.slice(end)}`);
  requestAnimationFrame(() => {
    target.selectionStart = start + 2;
    target.selectionEnd = start + 2;
  });
}

function createNewProjectSceneSpec(): VisualSceneSpec {
  return {
    id: "video-project-default-scene",
    style: {
      background: "#000000",
      fogNear: 14,
      fogFar: 30,
    },
    camera: {
      position: [4.6, 3.6, 4.8],
      target: [0, 0.2, 0],
      fov: 40,
      minDistance: 1.8,
      maxDistance: 12,
    },
    layers: [
      createProjectVolumeMeshLayer(),
      createProjectVolumeFrameLayer(),
      {
        kind: "grid",
        id: "project-grid",
        objectId: "grid",
        size: 3.2,
        divisions: 12,
        color: "#1f2937",
        opacity: 0.42,
        y: -0.82,
      },
    ],
    metadata: {
      kind: "project-scene",
    },
  };
}

function createProjectVolumeMeshLayer(): VisualLayerSpec {
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  const columns = [
    { x: -0.58, z: -0.58, h: 0.82, color: [0.18, 0.72, 0.98] as const },
    { x: 0, z: -0.58, h: 1.02, color: [0.24, 0.78, 0.98] as const },
    { x: 0.58, z: -0.58, h: 0.82, color: [0.18, 0.72, 0.98] as const },
    { x: -0.58, z: 0, h: 1.02, color: [0.38, 0.88, 0.72] as const },
    { x: 0, z: 0, h: 1.24, color: [0.96, 0.84, 0.28] as const },
    { x: 0.58, z: 0, h: 1.02, color: [0.38, 0.88, 0.72] as const },
    { x: -0.58, z: 0.58, h: 0.82, color: [0.18, 0.72, 0.98] as const },
    { x: 0, z: 0.58, h: 1.02, color: [0.24, 0.78, 0.98] as const },
    { x: 0.58, z: 0.58, h: 0.82, color: [0.18, 0.72, 0.98] as const },
  ];

  columns.forEach((column) => {
    pushBoxColumn(positions, indices, colors, column.x, column.z, 0.46, column.h, column.color);
  });

  return {
    kind: "mesh",
    id: "project-volume",
    objectId: "volume",
    positions,
    indices,
    colors,
    material: {
      vertexColors: true,
      doubleSided: true,
    },
    wireframe: {
      color: "#dbeafe",
      opacity: 0.16,
    },
  };
}

function createProjectVolumeFrameLayer(): VisualLayerSpec {
  return {
    kind: "box-outline",
    id: "project-volume-frame",
    objectId: "volume",
    position: [0, -0.1, 0],
    size: [2.2, 2.1, 2.2],
    color: "#94a3b8",
    opacity: 0.28,
  };
}

function pushBoxColumn(
  positions: number[],
  indices: number[],
  colors: number[],
  centerX: number,
  centerZ: number,
  footprint: number,
  height: number,
  color: readonly [number, number, number],
) {
  const base = positions.length / 3;
  const x0 = centerX - footprint / 2;
  const x1 = centerX + footprint / 2;
  const z0 = centerZ - footprint / 2;
  const z1 = centerZ + footprint / 2;
  const y0 = -0.82;
  const y1 = y0 + height;
  const side = color.map((channel) => channel * 0.66) as [number, number, number];
  const far = color.map((channel) => channel * 0.5) as [number, number, number];
  const faces = [
    { quad: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], tint: color },
    { quad: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], tint: side },
    { quad: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], tint: far },
    { quad: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], tint: side },
    { quad: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], tint: far },
  ] as const;

  faces.forEach((face, faceIndex) => {
    face.quad.forEach((point) => {
      positions.push(point[0], point[1], point[2]);
      colors.push(face.tint[0], face.tint[1], face.tint[2]);
    });
    const offset = base + faceIndex * 4;
    indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
  });
}

function createObjectTracks(script: SceneScript): ObjectTrackSpec[] {
  const tracks: ObjectTrackSpec[] = [];
  Object.entries(script.objects).forEach(([objectId, object]) => {
    addObjectTracks(tracks, objectId, object);
  });
  return tracks;
}

function addObjectTracks(tracks: ObjectTrackSpec[], objectId: string, object: SceneObjectScript) {
  if (object.spin?.turns) {
    tracks.push({
      kind: "spin",
      objectId,
      axis: object.spin.axis,
      turns: object.spin.turns,
      pivot: object.spin.pivot,
    });
  }
  if (object.keyframes && object.keyframes.length > 0) {
    tracks.push({
      kind: "keyframes",
      objectId,
      keyframes: object.keyframes.map((keyframe) => ({
        time: keyframe.time,
        easing: keyframe.easing,
        transform: {
          position: keyframe.position,
          rotation: keyframe.rotation,
          scale: keyframe.scale,
          opacity: keyframe.opacity,
        },
      })),
    });
  }
}

function ControlSlider({
  disabled = false,
  label,
  max,
  min,
  onChange,
  step,
  suffix = "",
  value,
}: {
  disabled?: boolean;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  suffix?: string;
  value: number;
}) {
  return (
    <label className="mt-4 block text-sm font-semibold text-[#31424b]">
      <span className="flex items-center justify-between">
        {label}
        <span className="font-mono text-[#0f766e]">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled}
        className="mt-3 w-full accent-[#0f766e]"
      />
    </label>
  );
}

function pickSupportedMimeType(format: VideoFormat) {
  const options =
    format === "mp4"
      ? ["video/mp4;codecs=h264", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]
      : ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  return options.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function waitForAnimationFrames(count: number) {
  return new Promise<void>((resolve) => {
    let remaining = count;
    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function canvasToPng(canvas: HTMLCanvasElement) {
  return dataUrlToBlob(canvas.toDataURL("image/png"));
}

function dataUrlToBlob(dataUrl: string) {
  const [header, payload] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] ?? "image/png";
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

function stopStream(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function formatMegabytes(size: number) {
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[#dce4e7] bg-white p-3">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7f89]">{label}</div>
      <div className="mt-2 font-mono text-xl font-semibold text-[#152026]">{value}</div>
    </div>
  );
}
