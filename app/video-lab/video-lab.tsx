"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import JSZip from "jszip";
import { buildVolumeIntegralTrace } from "@methodslab/methods-engine/core";
import { volumeIntegralExamples } from "@methodslab/methods-engine/presets";
import {
  composeSceneSpec,
  createAxesLayers,
  createCameraPathLayers,
  createTitleLayers,
  createVolumeIntegralSceneSpec,
} from "@methodslab/visual-engine/core";
import type { VisualLayerSpec, VisualVec3 } from "@methodslab/visual-engine/core";
import { VisualScene } from "@methodslab/visual-engine/react";
import { createOrbitCameraTrack, frameCount, renderFrameSequence, renderFrameSpec } from "@methodslab/video-engine/core";
import type { CameraKeyframe, ObjectTrackSpec, VideoProjectSpec } from "@methodslab/video-engine/core";
import { Axis3D, Braces, Camera, Download, Film, Loader2, Pause, Play, Route, RotateCcw, Tags, TimerReset } from "lucide-react";

type RenderStatus = "idle" | "recording" | "sequencing" | "done" | "unsupported" | "error";
type VideoFormat = "webm" | "mp4";
type EditorTab = "code" | "timeline" | "objects" | "help";

type SceneSlide = {
  start: number;
  end: number;
  title: string;
  latex: string;
  effect?: "cut" | "fade" | "slide" | "typewriter";
};

type SceneObjectKeyframe = {
  time: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  opacity?: number;
  easing?: "linear" | "smoothstep" | "ease-in" | "ease-out" | "ease-in-out";
};

type SceneObjectScript = {
  spin?: {
    axis: "x" | "y" | "z";
    turns: number;
    pivot?: [number, number, number];
  };
  keyframes?: SceneObjectKeyframe[];
};

type SceneScript = {
  version: 1;
  duration: number;
  fps: number;
  camera: {
    orbit: boolean;
    turns: number;
    keyframes: CameraKeyframe[];
  };
  objects: Record<string, SceneObjectScript>;
  labels: SceneLabelObject[];
  title: string;
  latex: string;
  slides: SceneSlide[];
};

type SceneLabelObject = {
  id: string;
  text: string;
  position: VisualVec3;
  color: string;
  scale: number;
  format: "text" | "latex";
};

const defaultSceneScript: SceneScript = {
  version: 1,
  duration: 10,
  fps: 30,
  camera: {
    orbit: false,
    turns: 1,
    keyframes: [],
  },
  objects: {
    volume: {
      spin: {
        axis: "y",
        turns: 1,
        pivot: [0, 0, 0],
      },
      keyframes: [
        { time: 0, position: [0, 0, 0], easing: "smoothstep" },
        { time: 2, position: [0, 0, 0], easing: "smoothstep" },
        { time: 3.5, position: [0.38, 0.04, 0.06], easing: "smoothstep" },
        { time: 7, position: [0.38, 0.04, 0.06], easing: "smoothstep" },
        { time: 9, position: [0, 0, 0], easing: "smoothstep" },
        { time: 10, position: [0, 0, 0], easing: "smoothstep" },
      ],
    },
    note: {},
    axes: {},
    cameraPath: {},
    title: {},
  },
  labels: [
    {
      id: "note",
      text: "Riemann ustunlari: kichik hajmlar yig‘indisi",
      position: [-0.92, 1.34, 1.18],
      color: "#bfdbfe",
      scale: 0.15,
      format: "text",
    },
  ],
  title: "Paraboloid ostidagi hajm",
  latex: "V=\\int\\int_D h(x,y)\\,dA",
  slides: [
    {
      start: 0,
      end: 2,
      title: "1. Integral ostidagi jism paydo bo‘ladi",
      latex: "h(x,y)=1.15-0.35(x^2+y^2)",
      effect: "typewriter",
    },
    {
      start: 2,
      end: 4,
      title: "2. Obyekt chetga suriladi, tushuntirish ochiladi",
      latex: "D=[-1,1]^2",
      effect: "slide",
    },
    {
      start: 4,
      end: 6,
      title: "3. Har katak bitta ustun hajmini beradi",
      latex: "\\Delta V=h(x_i,y_j)\\Delta A",
      effect: "typewriter",
    },
    {
      start: 6,
      end: 8.5,
      title: "4. Ustunlar yig‘indisi umumiy hajmga aylanadi",
      latex: "V\\approx\\sum h(x_i,y_j)\\Delta A",
      effect: "fade",
    },
    {
      start: 8.5,
      end: 10,
      title: "5. Obyekt markazga qaytadi",
      latex: "V=\\int\\int_D h(x,y)\\,dA",
      effect: "slide",
    },
  ],
};

const defaultSceneCode = `config:
  duration: 10
  theme: black

object volume:
  spin: y

slide "Integral ostidagi jism":
  camera: front
  latex: h(x,y)=1.15-0.35(x^2+y^2)

slide "Obyekt chetga suriladi":
  camera: zoom
  latex: D=[-1,1]^2
  animate:
    volume: move right
    note: Riemann ustunlari: kichik hajmlar yig‘indisi

slide "Har katak bitta ustun":
  latex: \\Delta V=h(x_i,y_j)\\Delta A
  effect: typewriter

slide "Yakuniy hajm":
  camera: front
  latex: V=\\int\\int_D h(x,y)\\,dA
  animate:
    volume: move center`;

export default function VideoLab() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [time, setTime] = useState(0);
  const [sequenceFps, setSequenceFps] = useState(6);
  const [videoFormat, setVideoFormat] = useState<VideoFormat>("webm");
  const [resolution, setResolution] = useState(12);
  const [showAxes, setShowAxes] = useState(false);
  const [showCameraPath, setShowCameraPath] = useState(false);
  const [showTitle, setShowTitle] = useState(true);
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

  const example = volumeIntegralExamples[0];
  const trace = useMemo(() => buildVolumeIntegralTrace(example, resolution), [example, resolution]);
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
    const rawScene = createVolumeIntegralSceneSpec(trace, { showAnalysis: true });
    const scene = {
      ...rawScene,
      style: {
        background: "#000000",
        fogNear: 18,
        fogFar: 42,
      },
      camera: {
        position: [0, -6.2, 1.55] as VisualVec3,
        target: [0, 0.12, 0] as VisualVec3,
        fov: 38,
        minDistance: 1.8,
        maxDistance: 12,
      },
    };
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
  }, [animatedSlide.latex, animatedSlide.title, duration, sceneScript.camera.turns, sceneScript.labels, showAxes, showCameraPath, showTitle, timeline.camera, trace]);
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
              <h1 className="text-2xl font-semibold">Timeline preview</h1>
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
          <VisualScene cameraMode="follow-spec" className="absolute inset-0" onCanvasReady={(canvas) => (canvasRef.current = canvas)} spec={frame.scene} />
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
      <p className="mt-3">{`slide "Har katak bitta ustun":`}</p>
      <p>{`  camera: front`}</p>
      <p>{`  latex: \\Delta V=h(x_i,y_j)\\Delta A`}</p>
      <p>{`  effect: typewriter`}</p>
      <p>{`  animate:`}</p>
      <p>{`    volume: move right`}</p>
      <p>{`    note: Riemann ustunlari: kichik hajmlar yig‘indisi`}</p>
      <p className="mt-3 text-[#93c5fd]">{`Vaqt va koordinata yozmasangiz ham engine default qiymatlar bilan davom etadi.`}</p>
    </div>
  );
}

function parseSceneScript(value: string): { script: SceneScript; error: string | null } {
  if (value.trim().startsWith("{")) return parseJsonSceneScript(value);
  return parseTimelineCode(value);
}

function parseTimelineCode(source: string): { script: SceneScript; error: string | null } {
  const script: SceneScript = {
    version: 1,
    duration: defaultSceneScript.duration,
    fps: defaultSceneScript.fps,
    camera: { ...defaultSceneScript.camera },
    objects: {
      volume: {},
      axes: {},
      cameraPath: {},
      title: {},
    },
    labels: [],
    title: defaultSceneScript.title,
    latex: defaultSceneScript.latex,
    slides: [],
  };
  let currentObject: string | null = null;
  let currentSlide: SceneSlide | null = null;
  let currentLabel: string | null = null;
  let currentBlock: "config" | "animate" | null = null;
  const errors: string[] = [];

  source.split(/\r?\n/).forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) return;

    if (line === "config:") {
      currentBlock = "config";
      currentObject = null;
      currentSlide = null;
      currentLabel = null;
      return;
    }
    if (line === "animate:") {
      if (!currentSlide) {
        errors.push(`Line ${lineNumber}: animate must be inside a slide block.`);
        return;
      }
      currentBlock = "animate";
      currentObject = null;
      currentLabel = null;
      return;
    }
    if (/^slide\s+.+:$/.test(line)) {
      const slide = parseSmartSlideLine(line, script);
      if (!slide) {
        errors.push(`Line ${lineNumber}: slide format should be slide "Title":`);
        return;
      }
      script.slides.push(slide);
      currentSlide = slide;
      currentObject = null;
      currentLabel = null;
      currentBlock = null;
      return;
    }
    if (line.startsWith("object ") && line.endsWith(":")) {
      const objectId = normalizeObjectId(line.slice("object ".length, -1).trim());
      if (!objectId) {
        errors.push(`Line ${lineNumber}: unknown object name.`);
        return;
      }
      script.objects[objectId] = script.objects[objectId] ?? {};
      currentObject = objectId;
      currentSlide = null;
      currentLabel = null;
      currentBlock = null;
      return;
    }
    if (line.includes(":")) {
      const handled = handleColonInstruction(line, { script, currentBlock, currentObject, currentSlide });
      if (handled) return;
    }

    if (line.startsWith("duration ")) {
      script.duration = parsePositiveNumber(line.slice("duration ".length), script.duration);
      currentObject = null;
      currentSlide = null;
      currentLabel = null;
      return;
    }
    if (line.startsWith("fps ")) {
      script.fps = parsePositiveNumber(line.slice("fps ".length), script.fps);
      currentObject = null;
      currentSlide = null;
      currentLabel = null;
      return;
    }
    if (line.startsWith("camera ")) {
      script.camera = parseCameraLine(line, script.camera);
      currentObject = null;
      currentSlide = null;
      currentLabel = null;
      return;
    }
    if (line.startsWith("label ") || line.startsWith("text ")) {
      const label = parseLabelLine(line);
      if (!label) {
        errors.push(`Line ${lineNumber}: text format should be "text note at x y z content ...".`);
        return;
      }
      script.labels = [...script.labels.filter((item) => item.id !== label.id), label];
      script.objects[label.id] = script.objects[label.id] ?? {};
      currentObject = label.id;
      currentSlide = null;
      currentLabel = label.id;
      return;
    }
    if (line.startsWith("object ")) {
      const objectId = normalizeObjectId(line.slice("object ".length).trim());
      if (!objectId) {
        errors.push(`Line ${lineNumber}: unknown object name.`);
        return;
      }
      currentObject = objectId;
      currentSlide = null;
      currentLabel = null;
      script.objects[objectId] = script.objects[objectId] ?? {};
      return;
    }
    if (line.startsWith("slide ") || line.startsWith("scene ")) {
      const slide = parseSlideLine(line, script);
      if (!slide) {
        errors.push(`Line ${lineNumber}: scene format should be "scene 0 to 2".`);
        return;
      }
      script.slides.push(slide);
      currentSlide = slide;
      currentObject = null;
      currentLabel = null;
      return;
    }
    if (line.startsWith("title ")) {
      const title = line.slice("title ".length).trim();
      if (currentSlide) currentSlide.title = title;
      else script.title = title;
      return;
    }
    if (line.startsWith("latex ")) {
      const latex = line.slice("latex ".length).trim();
      if (currentSlide) currentSlide.latex = latex;
      else script.latex = latex;
      return;
    }
    if (line.startsWith("content ")) {
      if (!currentLabel) {
        errors.push(`Line ${lineNumber}: content must be inside a text block.`);
        return;
      }
      script.labels = script.labels.map((label) => (label.id === currentLabel ? { ...label, text: line.slice("content ".length).trim() } : label));
      return;
    }
    if (line.startsWith("effect ")) {
      if (!currentSlide) {
        errors.push(`Line ${lineNumber}: effect must be inside a slide block.`);
        return;
      }
      currentSlide.effect = parseSlideEffect(line.slice("effect ".length).trim());
      return;
    }
    if (line.startsWith("spin ")) {
      if (!currentObject) {
        errors.push(`Line ${lineNumber}: spin must be inside an object block.`);
        return;
      }
      script.objects[currentObject].spin = parseSpinLine(line, script.objects[currentObject].spin);
      return;
    }
    if (line.startsWith("move ") || line.startsWith("rotate ") || line.startsWith("scale ") || line.startsWith("show ") || line.startsWith("hide ")) {
      if (!currentObject) {
        errors.push(`Line ${lineNumber}: ${line.split(/\s+/)[0]} must be inside an object block.`);
        return;
      }
      const keyframes = parseActionLine(line);
      if (!keyframes) {
        errors.push(`Line ${lineNumber}: action format should be "move at 3.5 to x y z".`);
        return;
      }
      const objectId = currentObject;
      keyframes.forEach((keyframe) => appendObjectKeyframe(script, objectId, keyframe));
      return;
    }
    if (line.startsWith("replace ")) {
      const replacement = parseReplaceLine(line);
      if (!replacement) {
        errors.push(`Line ${lineNumber}: replace format should be "replace old with new at 4".`);
        return;
      }
      [replacement.hide, replacement.show].forEach(({ objectId, keyframe }) => {
        const id = normalizeObjectId(objectId);
        if (!id) return;
        appendObjectKeyframe(script, id, keyframe);
      });
      return;
    }
    if (line.startsWith("at ")) {
      if (!currentObject) {
        errors.push(`Line ${lineNumber}: at must be inside an object block.`);
        return;
      }
      const keyframe = parseKeyframeLine(line, script.duration);
      if (!keyframe) {
        errors.push(`Line ${lineNumber}: keyframe format should start with "at 3.5 pos x y z".`);
        return;
      }
      appendObjectKeyframe(script, currentObject, keyframe);
      return;
    }

    errors.push(`Line ${lineNumber}: unknown instruction.`);
  });

  if (script.slides.length === 0) {
    script.slides = [
      {
        start: 0,
        end: Number.POSITIVE_INFINITY,
        title: script.title,
        latex: script.latex,
      },
    ];
  } else {
    distributeSlides(script);
  }

  return {
    script,
    error: errors.length > 0 ? errors.slice(0, 2).join(" ") : null,
  };
}

function handleColonInstruction(
  line: string,
  context: {
    script: SceneScript;
    currentBlock: "config" | "animate" | null;
    currentObject: string | null;
    currentSlide: SceneSlide | null;
  },
) {
  const separator = line.indexOf(":");
  if (separator < 0) return false;
  const key = line.slice(0, separator).trim();
  const value = line.slice(separator + 1).trim();

  if (context.currentBlock === "config") {
    if (key === "duration") context.script.duration = parsePositiveNumber(value, context.script.duration);
    if (key === "fps") context.script.fps = parsePositiveNumber(value, context.script.fps);
    return true;
  }

  if (context.currentObject) {
    if (key === "spin") {
      context.script.objects[context.currentObject].spin = parseSpinLine(`spin ${value}`, context.script.objects[context.currentObject].spin);
      return true;
    }
  }

  if (context.currentSlide && context.currentBlock === "animate") {
    applySlideAnimation(context.script, context.currentSlide, key, value);
    return true;
  }

  if (context.currentSlide) {
    if (key === "camera") {
      applyCameraPreset(context.script, context.currentSlide.start, value);
      return true;
    }
    if (key === "latex") {
      context.currentSlide.latex = stripQuotes(value);
      return true;
    }
    if (key === "title") {
      context.currentSlide.title = stripQuotes(value);
      return true;
    }
    if (key === "effect") {
      context.currentSlide.effect = parseSlideEffect(value);
      return true;
    }
    if (key === "duration") {
      context.currentSlide.end = context.currentSlide.start + parseDuration(value, context.currentSlide.end - context.currentSlide.start);
      return true;
    }
  }

  return false;
}

function parseSmartSlideLine(line: string, script: SceneScript): SceneSlide | null {
  const match = line.match(/^slide\s+"(.+)"\s*:$/) ?? line.match(/^slide\s+(.+)\s*:$/);
  if (!match) return null;
  const previous = script.slides.at(-1);
  const start = previous && Number.isFinite(previous.end) ? previous.end : 0;
  return {
    start,
    end: start + 2,
    title: stripQuotes(match[1]),
    latex: script.latex,
    effect: "slide",
  };
}

function distributeSlides(script: SceneScript) {
  if (script.slides.length === 0) return;
  const autoStep = script.duration / script.slides.length;
  let cursor = 0;
  script.slides = script.slides.map((slide) => {
    const explicitDuration = slide.end - slide.start !== 2 ? slide.end - slide.start : autoStep;
    const next = {
      ...slide,
      start: cursor,
      end: cursor + explicitDuration,
    };
    cursor = next.end;
    return next;
  });
}

function applySlideAnimation(script: SceneScript, slide: SceneSlide, objectId: string, action: string) {
  const id = normalizeObjectId(objectId) ?? objectId;
  if (action.startsWith("move ")) {
    appendObjectKeyframe(script, id, {
      time: slide.end,
      position: namedPosition(action.slice("move ".length).trim()) ?? [0, 0, 0],
      easing: "smoothstep",
    });
    return;
  }
  addTextLabel(script, id, action);
}

function applyCameraPreset(script: SceneScript, time: number, preset: string) {
  const camera = cameraPreset(preset);
  if (!camera) return;
  script.camera = {
    orbit: false,
    turns: script.camera.turns,
    keyframes: [...script.camera.keyframes, { time, ...camera, easing: "smoothstep" as const }].sort((a, b) => a.time - b.time),
  };
}

function addTextLabel(script: SceneScript, id: string, text: string) {
  const label = {
    id,
    text: stripQuotes(text),
    position: defaultLabelPosition(id),
    color: parseColor("sky"),
    scale: 0.15,
    format: "text" as const,
  };
  script.labels = [...script.labels.filter((item) => item.id !== id), label];
  script.objects[id] = script.objects[id] ?? {};
}

function cameraPreset(value: string): Pick<CameraKeyframe, "position" | "target" | "fov"> | null {
  const presets: Record<string, Pick<CameraKeyframe, "position" | "target" | "fov">> = {
    front: { position: [0, -6.2, 1.55], target: [0, 0.12, 0], fov: 38 },
    zoom: { position: [0.8, -4.8, 1.45], target: [0.18, 0.18, 0.04], fov: 34 },
    top: { position: [0, -0.2, 6.2], target: [0, 0, 0], fov: 42 },
    reset: { position: [0, -6.2, 1.55], target: [0, 0.12, 0], fov: 38 },
  };
  return presets[value] ?? presets.front;
}

function parseDuration(value: string, fallback: number) {
  const numeric = Number(value.replace(/s$/u, ""));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function stripQuotes(value: string) {
  return value.replace(/^["']|["']$/g, "");
}

function parseJsonSceneScript(value: string): { script: SceneScript; error: string | null } {
  try {
    const parsed = JSON.parse(value) as Partial<SceneScript>;
    return {
      script: {
        version: 1,
        duration: numberOrDefault(parsed.duration, defaultSceneScript.duration),
        fps: numberOrDefault(parsed.fps, defaultSceneScript.fps),
        camera: {
          orbit: Boolean(parsed.camera?.orbit),
          turns: numberOrDefault(parsed.camera?.turns, defaultSceneScript.camera.turns),
          keyframes: parseCameraKeyframes(parsed.camera?.keyframes),
        },
        objects: {
          ...Object.fromEntries(Object.entries(parsed.objects ?? {}).map(([id, object]) => [id, parseObjectScript(object, defaultSceneScript.objects[id] ?? {})])),
          volume: parseObjectScript(parsed.objects?.volume, defaultSceneScript.objects.volume),
          axes: parseObjectScript(parsed.objects?.axes, defaultSceneScript.objects.axes),
          cameraPath: parseObjectScript(parsed.objects?.cameraPath, defaultSceneScript.objects.cameraPath),
          title: parseObjectScript(parsed.objects?.title, defaultSceneScript.objects.title),
        },
        labels: parseLabels(parsed.labels),
        title: typeof parsed.title === "string" ? parsed.title : defaultSceneScript.title,
        latex: typeof parsed.latex === "string" ? parsed.latex : defaultSceneScript.latex,
        slides: parseSlides(parsed.slides, parsed.title, parsed.latex),
      },
      error: null,
    };
  } catch {
    return { script: defaultSceneScript, error: "Script syntax error. Using default scene script." };
  }
}

function parseObjectScript(value: unknown, fallback: SceneObjectScript): SceneObjectScript {
  if (!value || typeof value !== "object") return fallback;
  const object = value as SceneObjectScript;
  return {
    spin: parseSpin(object.spin, fallback.spin),
    keyframes: parseObjectKeyframes(object.keyframes, fallback.keyframes),
  };
}

function appendObjectKeyframe(script: SceneScript, objectId: string, keyframe: SceneObjectKeyframe) {
  script.objects[objectId] = script.objects[objectId] ?? {};
  const existing = script.objects[objectId].keyframes ?? [];
  const sameTimeIndex = existing.findIndex((item) => Math.abs(item.time - keyframe.time) < 1e-9);
  if (sameTimeIndex >= 0) {
    existing[sameTimeIndex] = mergeSceneKeyframes(existing[sameTimeIndex], keyframe);
    script.objects[objectId].keyframes = [...existing].sort((a, b) => a.time - b.time);
    return;
  }
  script.objects[objectId].keyframes = [...existing, keyframe].sort((a, b) => a.time - b.time);
}

function mergeSceneKeyframes(base: SceneObjectKeyframe, next: SceneObjectKeyframe): SceneObjectKeyframe {
  return {
    time: base.time,
    position: next.position ?? base.position,
    rotation: next.rotation ?? base.rotation,
    scale: next.scale ?? base.scale,
    opacity: next.opacity ?? base.opacity,
    easing: next.easing ?? base.easing,
  };
}

function parseSpin(value: unknown, fallback: SceneObjectScript["spin"]) {
  if (!value || typeof value !== "object") return fallback;
  const spin = value as SceneObjectScript["spin"];
  if (!spin) return fallback;
  const axis = spin.axis === "x" || spin.axis === "y" || spin.axis === "z" ? spin.axis : fallback?.axis ?? "y";
  return {
    axis,
    turns: numberOrDefault(spin.turns, fallback?.turns ?? 0),
    pivot: parseVec3(spin.pivot, fallback?.pivot),
  };
}

function parseObjectKeyframes(value: unknown, fallback: SceneObjectKeyframe[] | undefined): SceneObjectKeyframe[] | undefined {
  if (!Array.isArray(value)) return fallback;
  return value
    .map<SceneObjectKeyframe | null>((item) => {
      if (!item || typeof item !== "object") return null;
      const keyframe = item as SceneObjectKeyframe;
      return {
        time: numberOrDefault(keyframe.time, 0),
        position: parseVec3(keyframe.position),
        rotation: parseVec3(keyframe.rotation),
        scale: parseVec3(keyframe.scale),
        opacity: typeof keyframe.opacity === "number" ? keyframe.opacity : undefined,
        easing: parseEasing(keyframe.easing),
      };
    })
    .filter((item): item is SceneObjectKeyframe => item !== null)
    .sort((a, b) => a.time - b.time);
}

function parseVec3(value: unknown, fallback?: [number, number, number]) {
  if (!Array.isArray(value) || value.length !== 3) return fallback;
  const tuple = value.map((item) => Number(item));
  if (tuple.some((item) => !Number.isFinite(item))) return fallback;
  return tuple as [number, number, number];
}

function parseEasing(value: unknown): SceneObjectKeyframe["easing"] {
  return value === "linear" || value === "smoothstep" || value === "ease-in" || value === "ease-out" || value === "ease-in-out" ? value : undefined;
}

function parseSlideEffect(value: unknown): SceneSlide["effect"] {
  return value === "cut" || value === "fade" || value === "slide" || value === "typewriter" ? value : "cut";
}

function parseCameraKeyframes(value: unknown): CameraKeyframe[] {
  if (!Array.isArray(value)) return [];
  return value
    .map<CameraKeyframe | null>((item) => {
      if (!item || typeof item !== "object") return null;
      const keyframe = item as CameraKeyframe;
      return {
        time: numberOrDefault(keyframe.time, 0),
        position: parseVec3(keyframe.position),
        target: parseVec3(keyframe.target),
        fov: typeof keyframe.fov === "number" ? keyframe.fov : undefined,
        minDistance: typeof keyframe.minDistance === "number" ? keyframe.minDistance : undefined,
        maxDistance: typeof keyframe.maxDistance === "number" ? keyframe.maxDistance : undefined,
        easing: parseEasing(keyframe.easing),
      };
    })
    .filter((item): item is CameraKeyframe => item !== null)
    .sort((a, b) => a.time - b.time);
}

function parseLabels(value: unknown): SceneLabelObject[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const label = item as SceneLabelObject;
      if (typeof label.id !== "string" || typeof label.text !== "string") return null;
      return {
        id: label.id,
        text: label.text,
        position: parseVec3(label.position, [0, 0, 0]) ?? [0, 0, 0],
        color: typeof label.color === "string" ? label.color : "#f8fafc",
        scale: typeof label.scale === "number" ? label.scale : 0.16,
        format: label.format === "latex" ? "latex" : "text",
      };
    })
    .filter((item): item is SceneLabelObject => item !== null);
}

function parsePositiveNumber(value: string, fallback: number) {
  const parsed = Number(value.trim().split(/\s+/)[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseTimeToken(value: string | undefined, duration: number) {
  if (!value) return Number.NaN;
  const named: Record<string, number> = {
    start: 0,
    begin: 0,
    early: duration * 0.25,
    middle: duration * 0.35,
    mid: duration * 0.35,
    late: duration * 0.7,
    end: duration,
    finish: duration,
  };
  return named[value] ?? Number(value);
}

function parseCameraLine(line: string, fallback: SceneScript["camera"]): SceneScript["camera"] {
  const parts = line.split(/\s+/);
  const range = parseRange(parts[1]);
  if (parts[1] === "at") {
    const keyframe = parseCameraAtLine(parts);
    return {
      orbit: false,
      turns: fallback.turns,
      keyframes: keyframe ? [...fallback.keyframes, keyframe].sort((a, b) => a.time - b.time) : fallback.keyframes,
    };
  }
  if (range) {
    const keyframes = parseCameraRangeLine(parts, range);
    return {
      orbit: false,
      turns: fallback.turns,
      keyframes: keyframes ? [...fallback.keyframes, ...keyframes].sort((a, b) => a.time - b.time) : fallback.keyframes,
    };
  }
  if (parts[1] === "orbit") {
    return {
      orbit: true,
      turns: parsePositiveNumber(parts[2] ?? "", fallback.turns),
      keyframes: [],
    };
  }
  if (parts[1] === "rotate") {
    const angle = parseAngle(parts[2] ?? "0");
    return {
      orbit: true,
      turns: angle / (Math.PI * 2),
      keyframes: [],
    };
  }
  if (parts[1] === "fixed" || parts[1] === "off") {
    return {
      orbit: false,
      turns: fallback.turns,
      keyframes: [],
    };
  }
  if (parts[1] === "move") {
    const keyframe = parseCameraMoveLine(parts);
    return {
      orbit: false,
      turns: fallback.turns,
      keyframes: keyframe ? [...fallback.keyframes, keyframe].sort((a, b) => a.time - b.time) : fallback.keyframes,
    };
  }
  return fallback;
}

function parseCameraAtLine(parts: string[]): CameraKeyframe | null {
  const hasTime = Number.isFinite(Number(parts[2]));
  const time = hasTime ? Number(parts[2]) : 0;
  const moveIndex = parts.indexOf("move");
  const position = moveIndex >= 0 ? parseVec3Expression(parts, moveIndex + 1) : parseVec3FromTokens(parts, hasTime ? 3 : 2);
  if (!position) return null;
  const keyframe: CameraKeyframe = { time, position };
  const lookIndex = parts.indexOf("look");
  const fovIndex = parts.indexOf("fov");
  keyframe.target = lookIndex >= 0 ? parseVec3Expression(parts, lookIndex + 1) : undefined;
  keyframe.fov = fovIndex >= 0 ? numberOrDefault(Number(parts[fovIndex + 1]), 44) : undefined;
  keyframe.easing = "smoothstep";
  return keyframe;
}

function parseCameraRangeLine(parts: string[], range: [number, number]): CameraKeyframe[] | null {
  const fromIndex = parts.indexOf("from");
  const toIndex = parts.indexOf("to");
  const from = fromIndex >= 0 ? parseVec3FromTokens(parts, fromIndex + 1) : undefined;
  const to = toIndex >= 0 ? parseVec3FromTokens(parts, toIndex + 1) : undefined;
  if (!from || !to) return null;
  const lookIndex = parts.indexOf("look");
  const fovIndex = parts.indexOf("fov");
  const easeIndex = parts.indexOf("ease");
  const target = lookIndex >= 0 ? parseVec3FromTokens(parts, lookIndex + 1) : undefined;
  const fov = fovIndex >= 0 ? numberOrDefault(Number(parts[fovIndex + 1]), 44) : undefined;
  const easing = easeIndex >= 0 ? parseEasing(parts[easeIndex + 1]) : "smoothstep";
  return [
    { time: range[0], position: from, target, fov, easing },
    { time: range[1], position: to, target, fov, easing },
  ];
}

function parseCameraMoveLine(parts: string[]): CameraKeyframe | null {
  const atIndex = parts.indexOf("at");
  const time = Number(parts[atIndex + 1]);
  if (atIndex < 0 || !Number.isFinite(time)) return null;
  const keyframe: CameraKeyframe = { time };
  const posIndex = parts.indexOf("pos");
  const lookIndex = parts.indexOf("look");
  const fovIndex = parts.indexOf("fov");
  const easeIndex = parts.indexOf("ease");
  keyframe.position = posIndex >= 0 ? parseVec3Expression(parts, posIndex + 1) : undefined;
  keyframe.target = lookIndex >= 0 ? parseVec3Expression(parts, lookIndex + 1) : undefined;
  keyframe.fov = fovIndex >= 0 ? numberOrDefault(Number(parts[fovIndex + 1]), 44) : undefined;
  keyframe.easing = easeIndex >= 0 ? parseEasing(parts[easeIndex + 1]) : undefined;
  return keyframe.position || keyframe.target || keyframe.fov ? keyframe : null;
}

function normalizeObjectId(value: string): string | null {
  if (!value) return null;
  if (value === "camera-path") return "cameraPath";
  return value;
}

function parseLabelLine(line: string): SceneLabelObject | null {
  const parts = line.split(/\s+/);
  const id = normalizeObjectId(parts[1] ?? "");
  const atIndex = parts.indexOf("at");
  if (!id) return null;
  const position = atIndex >= 0 ? parseVec3FromTokens(parts, atIndex + 1) : defaultLabelPosition(id);
  if (!position) return null;
  const colorIndex = parts.indexOf("color");
  const scaleIndex = parts.indexOf("scale");
  const formatIndex = parts.indexOf("format");
  const textIndex = parts.indexOf("text");
  const contentIndex = parts.indexOf("content");
  const bodyIndex = textIndex >= 0 ? textIndex : contentIndex;
  return {
    id,
    text: bodyIndex >= 0 ? parts.slice(bodyIndex + 1).join(" ") : id,
    position,
    color: parseColor(colorIndex >= 0 ? parts[colorIndex + 1] : undefined),
    scale: scaleIndex >= 0 ? numberOrDefault(Number(parts[scaleIndex + 1]), 0.16) : 0.16,
    format: formatIndex >= 0 && parts[formatIndex + 1] === "latex" ? "latex" : "text",
  };
}

function defaultLabelPosition(id: string): VisualVec3 {
  if (id === "note") return [-0.92, 1.34, 1.18];
  return [-1, 1.32, 1.18];
}

function parseColor(value: string | undefined) {
  if (!value) return "#f8fafc";
  const palette: Record<string, string> = {
    sky: "#bfdbfe",
    yellow: "#fde047",
    white: "#f8fafc",
    green: "#86efac",
    pink: "#f9a8d4",
    teal: "#5eead4",
  };
  return palette[value] ?? value;
}

function parseActionLine(line: string): SceneObjectKeyframe[] | null {
  const parts = line.split(/\s+/);
  const action = parts[0];
  const range = parseRange(parts[1]);
  if (range) return parseRangeAction(parts, action, range);
  const atIndex = parts.indexOf("at");
  const time = Number(parts[atIndex + 1]);
  if (atIndex < 0 || !Number.isFinite(time)) return null;
  const keyframe: SceneObjectKeyframe = { time };
  const toIndex = parts.indexOf("to");

  if (action === "move") keyframe.position = parseVec3FromTokens(parts, toIndex + 1);
  if (action === "rotate") keyframe.rotation = parseVec3FromTokens(parts, toIndex + 1);
  if (action === "scale") keyframe.scale = parseVec3FromTokens(parts, toIndex + 1);
  if (action === "show") keyframe.opacity = 1;
  if (action === "hide") keyframe.opacity = 0;

  const easeIndex = parts.indexOf("ease");
  keyframe.easing = easeIndex >= 0 ? parseEasing(parts[easeIndex + 1]) : undefined;
  return keyframe.position || keyframe.rotation || keyframe.scale || keyframe.opacity !== undefined ? [keyframe] : null;
}

function parseRangeAction(parts: string[], action: string, range: [number, number]): SceneObjectKeyframe[] | null {
  const fromIndex = parts.indexOf("from");
  const toIndex = parts.indexOf("to");
  const from = fromIndex >= 0 ? parseVec3FromTokens(parts, fromIndex + 1) : undefined;
  const to = toIndex >= 0 ? parseVec3FromTokens(parts, toIndex + 1) : undefined;
  if (!from || !to) return null;
  const easeIndex = parts.indexOf("ease");
  const easing = easeIndex >= 0 ? parseEasing(parts[easeIndex + 1]) : "smoothstep";
  const first: SceneObjectKeyframe = { time: range[0], easing };
  const second: SceneObjectKeyframe = { time: range[1], easing };
  if (action === "move") {
    first.position = from;
    second.position = to;
  } else if (action === "rotate") {
    first.rotation = from;
    second.rotation = to;
  } else if (action === "scale") {
    first.scale = from;
    second.scale = to;
  } else {
    return null;
  }
  return [first, second];
}

function parseReplaceLine(line: string): { hide: { objectId: string; keyframe: SceneObjectKeyframe }; show: { objectId: string; keyframe: SceneObjectKeyframe } } | null {
  const parts = line.split(/\s+/);
  const withIndex = parts.indexOf("with");
  const atIndex = parts.indexOf("at");
  const oldObject = parts[1];
  const newObject = parts[withIndex + 1];
  const time = Number(parts[atIndex + 1]);
  if (!oldObject || withIndex < 0 || !newObject || atIndex < 0 || !Number.isFinite(time)) return null;
  const easeIndex = parts.indexOf("ease");
  const easing = easeIndex >= 0 ? parseEasing(parts[easeIndex + 1]) : "smoothstep";
  return {
    hide: { objectId: oldObject, keyframe: { time, opacity: 0, easing } },
    show: { objectId: newObject, keyframe: { time, opacity: 1, easing } },
  };
}

function parseSlideLine(line: string, script: SceneScript): SceneSlide | null {
  if (line === "scene" || line === "slide") {
    const previous = script.slides.at(-1);
    const start = previous && Number.isFinite(previous.end) ? previous.end : 0;
    return {
      start,
      end: start + 2,
      title: defaultSceneScript.title,
      latex: defaultSceneScript.latex,
    };
  }
  const match =
    line.match(/^(?:scene|slide)\s+(-?\d+(?:\.\d+)?)\s+to\s+(-?\d+(?:\.\d+)?)$/) ??
    line.match(/^slide\s+(-?\d+(?:\.\d+)?)\s*\.\.\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return {
    start,
    end,
    title: defaultSceneScript.title,
    latex: defaultSceneScript.latex,
  };
}

function parseSpinLine(line: string, fallback: SceneObjectScript["spin"]): SceneObjectScript["spin"] {
  const parts = line.split(/\s+/);
  const axis = parts[1] === "x" || parts[1] === "y" || parts[1] === "z" ? parts[1] : fallback?.axis ?? "y";
  const turns = numberOrDefault(Number(parts[2]), fallback?.turns ?? 1);
  const pivotIndex = parts.indexOf("pivot");
  return {
    axis,
    turns,
    pivot: pivotIndex >= 0 ? parseVec3FromTokens(parts, pivotIndex + 1, fallback?.pivot) : fallback?.pivot,
  };
}

function parseKeyframeLine(line: string, duration: number): SceneObjectKeyframe | null {
  const parts = line.split(/\s+/);
  const time = parseTimeToken(parts[1], duration);
  if (!Number.isFinite(time)) return null;
  const keyframe: SceneObjectKeyframe = { time };
  const action = parts[2];

  if (action === "move" || action === "position") {
    keyframe.position = parseVec3Expression(parts, 3);
    keyframe.easing = parseLineEasing(parts);
    return keyframe.position ? keyframe : null;
  }
  if (action === "rotate" || action === "rotation") {
    keyframe.rotation = parseVec3Expression(parts, 3, "angle");
    keyframe.easing = parseLineEasing(parts);
    return keyframe.rotation ? keyframe : null;
  }
  if (action === "scale") {
    keyframe.scale = parseVec3Expression(parts, 3);
    keyframe.easing = parseLineEasing(parts);
    return keyframe.scale ? keyframe : null;
  }
  if (action === "show" || action === "hide") {
    keyframe.opacity = action === "show" ? 1 : 0;
    keyframe.easing = parseLineEasing(parts);
    return keyframe;
  }

  for (let index = 2; index < parts.length; index += 1) {
    const token = parts[index];
    if (token === "pos" || token === "position") {
      keyframe.position = parseVec3FromTokens(parts, index + 1);
      index += 3;
    } else if (token === "rot" || token === "rotation") {
      keyframe.rotation = parseVec3FromTokens(parts, index + 1);
      index += 3;
    } else if (token === "scale") {
      keyframe.scale = parseVec3FromTokens(parts, index + 1);
      index += 3;
    } else if (token === "opacity") {
      keyframe.opacity = numberOrDefault(Number(parts[index + 1]), 1);
      index += 1;
    } else if (token === "ease" || token === "easing") {
      keyframe.easing = parseEasing(parts[index + 1]);
      index += 1;
    }
  }

  return keyframe.position || keyframe.rotation || keyframe.scale || keyframe.opacity !== undefined ? keyframe : null;
}

function parseVec3FromTokens(parts: string[], start: number, fallback?: [number, number, number]) {
  const tuple = [Number(parts[start]), Number(parts[start + 1]), Number(parts[start + 2])];
  if (tuple.some((item) => !Number.isFinite(item))) return fallback;
  return tuple as [number, number, number];
}

function parseVec3Expression(parts: string[], start: number, mode: "number" | "angle" = "number", fallback?: [number, number, number]) {
  const named = mode === "number" ? namedPosition(parts[start]) : undefined;
  if (named) return named;
  const direct = parseVec3FromTokens(parts, start);
  if (direct) return mode === "angle" ? (direct.map((value) => value) as [number, number, number]) : direct;
  const tuple: [number, number, number] = fallback ?? [0, 0, 0];
  let found = false;
  for (let index = start; index < parts.length - 1; index += 1) {
    const axis = parts[index];
    if (axis !== "x" && axis !== "y" && axis !== "z") continue;
    const value = mode === "angle" ? parseAngle(parts[index + 1]) : Number(parts[index + 1]);
    if (!Number.isFinite(value)) continue;
    tuple[axis === "x" ? 0 : axis === "y" ? 1 : 2] = value;
    found = true;
    index += 1;
  }
  return found ? tuple : fallback;
}

function namedPosition(value: string | undefined): VisualVec3 | undefined {
  const positions: Record<string, VisualVec3> = {
    center: [0, 0, 0],
    right: [0.38, 0.04, 0.06],
    left: [-0.38, 0.04, 0.06],
    up: [0, 0.28, 0],
    down: [0, -0.2, 0],
    front: [0, 0.04, 0.38],
    back: [0, 0.04, -0.38],
  };
  return value ? positions[value] : undefined;
}

function parseAngle(value: string) {
  const normalized = value.trim().toLowerCase();
  const number = Number(normalized.replace(/(degrees|degree|deg|grad|radians|radian|rad)$/u, ""));
  if (!Number.isFinite(number)) return 0;
  if (normalized.endsWith("deg") || normalized.endsWith("degree") || normalized.endsWith("degrees") || normalized.endsWith("grad")) {
    return (number * Math.PI) / 180;
  }
  return number;
}

function parseLineEasing(parts: string[]) {
  const easeIndex = parts.indexOf("ease");
  return easeIndex >= 0 ? parseEasing(parts[easeIndex + 1]) : "smoothstep";
}

function parseRange(value: string | undefined): [number, number] | null {
  const match = value?.match(/^(-?\d+(?:\.\d+)?)\.\.(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const start = Number(match[1]);
  const end = Number(match[2]);
  return Number.isFinite(start) && Number.isFinite(end) && end >= start ? [start, end] : null;
}

function numberOrDefault(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
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

function updateSceneNumber(source: string, path: "duration" | "fps", value: number) {
  if (source.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(source) as Record<string, unknown>;
      parsed[path] = value;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return source;
    }
  }
  const lines = source.split(/\r?\n/);
  const lineIndex = lines.findIndex((line) => line.trim().startsWith(`${path} `));
  if (lineIndex >= 0) {
    const indent = lines[lineIndex].match(/^\s*/)?.[0] ?? "";
    lines[lineIndex] = `${indent}${path} ${value}`;
    return lines.join("\n");
  }
  return `${path} ${value}\n${source}`;
}

function parseSlides(value: unknown, title: unknown, latex: unknown): SceneSlide[] {
  if (!Array.isArray(value)) {
    return [
      {
        start: 0,
        end: Number.POSITIVE_INFINITY,
        title: typeof title === "string" ? title : defaultSceneScript.title,
        latex: typeof latex === "string" ? latex : defaultSceneScript.latex,
      },
    ];
  }
  const slides = value
    .map<SceneSlide | null>((item) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Partial<SceneSlide>;
      return {
        start: numberOrDefault(candidate.start, 0),
        end: numberOrDefault(candidate.end, Number.POSITIVE_INFINITY),
        title: typeof candidate.title === "string" ? candidate.title : defaultSceneScript.title,
        latex: typeof candidate.latex === "string" ? candidate.latex : defaultSceneScript.latex,
        effect: parseSlideEffect(candidate.effect),
      };
    })
    .filter((item): item is SceneSlide => item !== null)
    .sort((a, b) => a.start - b.start);
  return slides.length > 0 ? slides : defaultSceneScript.slides;
}

function activeSceneSlide(script: SceneScript, time: number) {
  return (
    script.slides.find((slide) => time >= slide.start && time < slide.end) ??
    script.slides.at(-1) ?? {
      start: 0,
      end: Number.POSITIVE_INFINITY,
      title: script.title,
      latex: script.latex,
    }
  );
}

function animateSlideText(slide: SceneSlide, time: number) {
  const progress = Math.max(0, Math.min(1, (time - slide.start) / Math.max(slide.end - slide.start, 1e-9)));
  if (slide.effect !== "typewriter") return slide;
  return {
    ...slide,
    title: sliceByProgress(slide.title, Math.max(0.08, progress)),
    latex: sliceByProgress(slide.latex, Math.max(0.18, progress)),
  };
}

function slideOverlayStyle(slide: SceneSlide, time: number): CSSProperties {
  const progress = Math.max(0, Math.min(1, (time - slide.start) / Math.max(slide.end - slide.start, 1e-9)));
  const entrance = Math.min(1, progress / 0.22);
  if (slide.effect === "fade") {
    return { opacity: entrance };
  }
  if (slide.effect === "slide") {
    return {
      opacity: entrance,
      transform: `translate3d(${(1 - entrance) * -18}px, ${(1 - entrance) * 8}px, 0)`,
    };
  }
  return { opacity: 1, transform: "translate3d(0, 0, 0)" };
}

function sliceByProgress(value: string, progress: number) {
  return value.slice(0, Math.max(1, Math.ceil(value.length * progress)));
}

function createLabelLayers(labels: SceneLabelObject[]): VisualLayerSpec[] {
  return labels.map((label) => ({
    kind: "label",
    id: `script-label-${label.id}`,
    objectId: label.id,
    text: label.text,
    position: label.position,
    color: label.color,
    scale: label.scale,
    format: label.format,
  }));
}

function latexPreview(text: string) {
  return text
    .replaceAll("\\int", "∫")
    .replaceAll("\\sum", "∑")
    .replaceAll("\\,", " ")
    .replaceAll("\\pi", "π")
    .replaceAll("\\Delta", "Δ")
    .replaceAll("\\approx", "≈")
    .replaceAll("\\cdot", "·")
    .replaceAll("\\times", "×")
    .replace(/_\{([^{}]+)\}/g, "_$1")
    .replace(/\^\{([^{}]+)\}/g, "^$1")
    .replace(/[{}]/g, "");
}

function describeKeyframe(keyframe: SceneObjectKeyframe) {
  const parts = [
    keyframe.position ? `pos=[${keyframe.position.join(", ")}]` : null,
    keyframe.rotation ? `rot=[${keyframe.rotation.join(", ")}]` : null,
    keyframe.scale ? `scale=[${keyframe.scale.join(", ")}]` : null,
    keyframe.opacity !== undefined ? `opacity=${keyframe.opacity}` : null,
    keyframe.easing ? `ease=${keyframe.easing}` : null,
  ].filter(Boolean);
  return parts.join(" ");
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
