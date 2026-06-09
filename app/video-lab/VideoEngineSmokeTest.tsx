"use client";

import { useMemo, useState } from "react";
import {
  createCoordinateAxesLayers,
  createFormulaLabel,
  createGridLayer,
  createTitleLayers,
  type VisualLayerSpec,
  type VisualSceneSpec,
} from "@methodslab/visual-engine/core";
import { VisualScene } from "@methodslab/visual-engine/react";
import {
  createOrbitCameraTrack,
  renderFrameSpec,
  type VideoProjectSpec,
} from "@methodslab/video-engine/core";

const DURATION = 8;
const FPS = 30;

export function VideoEngineSmokeTest() {
  const [time, setTime] = useState(0);

  const baseScene = useMemo<VisualSceneSpec>(() => {
    return {
      id: "video-lab-math-demo-base",
      style: {
        background: "#050b0f",
        fogNear: 9,
        fogFar: 30,
        exposure: 1.28,
        ambientLight: 1.12,
      },
      camera: {
        position: [3.8, -5.1, 3.1],
        target: [0, 0.08, 0],
        fov: 45,
        minDistance: 1.6,
        maxDistance: 14,
      },
      layers: [
        ...createTitleLayers("Volume Integral", "Riemann columns as a video timeline", {
          position: [-1.45, 2.46, 1.9],
          titleScale: 0.25,
          subtitleScale: 0.115,
        }),
        createFormulaLabel("\\int_a^b\\int_c^d f(x,y)\\,dx\\,dy", {
          id: "main-formula",
          objectId: "formula",
          position: [-1.42, 2.05, 1.9],
          color: "#67e8f9",
          scale: 0.14,
        }),
        createGridLayer("demo-grid", {
          size: 3.2,
          divisions: 18,
          y: -0.86,
          opacity: 0.34,
          color: "#164653",
        }),
        ...createCoordinateAxesLayers({
          idPrefix: "demo-axes",
          objectId: "axes",
          origin: [-1.55, -0.82, -1.35],
          size: 1.55,
          yLabel: "h",
          opacity: 0.72,
        }),
        ...createRiemannColumnLayers(),
        ...createAnalysisLayers(),
      ],
      metadata: {
        kind: "math-video-demo",
      },
    };
  }, []);

  const project = useMemo<VideoProjectSpec>(() => {
    return {
      id: "video-lab-math-demo",
      name: "Math Video Demo",
      baseScene,
      timeline: {
        duration: DURATION,
        fps: FPS,
        camera: createOrbitCameraTrack({
          duration: DURATION,
          radius: 5.5,
          height: 3.05,
          target: [0, 0.08, 0],
          turns: 0.62,
          easing: "ease-in-out-cubic",
        }),
        objects: [
          {
            kind: "fade",
            objectId: "formula",
            from: 0,
            to: 1,
            startTime: 0,
            endTime: 1.1,
            easing: "ease-out-cubic",
            mode: "absolute",
          },
          {
            kind: "fade",
            objectId: "columns",
            from: 0.18,
            to: 1,
            startTime: 0.35,
            endTime: 1.8,
            easing: "ease-out-cubic",
            mode: "absolute",
          },
          {
            kind: "spin",
            objectId: "columns",
            axis: "y",
            turns: 0.72,
            pivot: [0, 0, 0],
            startTime: 1.2,
            endTime: DURATION,
            easing: "ease-in-out-cubic",
            mode: "relative",
          },
          {
            kind: "fade",
            objectId: "analysis",
            from: 0,
            to: 1,
            startTime: 2.2,
            endTime: 3.3,
            easing: "ease-out-cubic",
            mode: "absolute",
          },
        ],
      },
    };
  }, [baseScene]);

  const frame = useMemo(() => renderFrameSpec(project, time), [project, time]);

  return (
    <section className="grid min-h-[760px] grid-cols-[380px_1fr] overflow-hidden rounded-[2rem] border border-white/10 bg-[#050b0f] text-white shadow-2xl">
      <aside className="border-r border-white/10 bg-white/[0.035] p-6">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-cyan-300">
          MethodsLab Video
        </p>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Math Video Runtime
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          VisualSceneSpec sahna sifatida olinadi, video-engine esa camera,
          object fade va rotation tracklarni vaqt bo‘yicha sample qiladi.
        </p>

        <div className="mt-7 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.035] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">
            Current frame
          </p>

          <div className="mt-4 space-y-3 text-sm">
            <Metric label="time" value={`${frame.time.toFixed(2)}s`} />
            <Metric label="frame" value={`#${frame.frame}`} />
            <Metric label="progress" value={`${(frame.progress * 100).toFixed(1)}%`} />
            <Metric label="fps" value={`${project.timeline.fps}`} />
          </div>
        </div>

        <label className="mt-7 block text-sm text-slate-300">
          Timeline
          <input
            className="mt-3 w-full accent-cyan-300"
            type="range"
            min={0}
            max={project.timeline.duration}
            step={1 / project.timeline.fps}
            value={time}
            onChange={(event) => setTime(Number(event.target.value))}
          />
        </label>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <ControlButton onClick={() => setTime(0)}>0s</ControlButton>
          <ControlButton onClick={() => setTime(2)}>2s</ControlButton>
          <ControlButton onClick={() => setTime(5)}>5s</ControlButton>
          <ControlButton onClick={() => setTime(project.timeline.duration)}>End</ControlButton>
        </div>

        <div className="mt-7 space-y-3">
          <TrackRow label="Formula fade" active={time >= 0 && time <= 1.1} />
          <TrackRow label="Columns reveal" active={time >= 0.35 && time <= 1.8} />
          <TrackRow label="Analysis overlay" active={time >= 2.2 && time <= 3.3} />
          <TrackRow label="Camera orbit" active={time > 0} />
        </div>
      </aside>

      <div className="relative min-h-[760px] bg-[radial-gradient(circle_at_50%_15%,rgba(34,211,238,0.08),transparent_42%),linear-gradient(180deg,#061216,#020609)]">
        <VisualScene
          cameraMode="follow-spec"
          cameraResetKey={`${project.id}:${frame.frame}`}
          spec={frame.scene}
          className="absolute inset-0"
        />

        <div className="pointer-events-none absolute right-6 top-6 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Scene</p>
          <p className="mt-1 text-sm text-cyan-100">Volume approximation</p>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono text-cyan-100">{value}</span>
    </div>
  );
}

function ControlButton({
  children,
  onClick,
}: {
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-cyan-100"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function TrackRow({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
      <span className="text-slate-300">{label}</span>
      <span
        className={
          active
            ? "rounded-full bg-cyan-300/15 px-2 py-1 text-xs text-cyan-200"
            : "rounded-full bg-white/5 px-2 py-1 text-xs text-slate-500"
        }
      >
        {active ? "active" : "idle"}
      </span>
    </div>
  );
}

function createRiemannColumnLayers(): VisualLayerSpec[] {
  const layers: VisualLayerSpec[] = [];
  const count = 7;
  const spacing = 0.34;

  for (let ix = 0; ix < count; ix += 1) {
    for (let iz = 0; iz < count; iz += 1) {
      const x = (ix - (count - 1) / 2) * spacing;
      const z = (iz - (count - 1) / 2) * spacing;
      const distance = Math.hypot(x, z);
      const height = 0.24 + Math.max(0, 1.1 - distance * 0.62);
      const hue = height > 0.9 ? "#facc15" : height > 0.62 ? "#38bdf8" : "#0ea5e9";

      layers.push({
        kind: "box-outline",
        id: `column-${ix}-${iz}`,
        objectId: "columns",
        position: [x, -0.86 + height / 2, z],
        size: [spacing * 0.78, height, spacing * 0.78],
        color: hue,
        opacity: 0.74,
        metadata: {
          height,
          ix,
          iz,
        },
      });
    }
  }

  return layers;
}

function createAnalysisLayers(): VisualLayerSpec[] {
  return [
    {
      kind: "marker",
      id: "peak-marker",
      objectId: "analysis",
      position: [0, 0.54, 0],
      color: "#facc15",
      radius: 0.065,
      label: "max contribution",
      labelOffset: [0.15, 0.22, 0.02],
      renderOrder: 8,
    },
    {
      kind: "ring",
      id: "peak-ring",
      objectId: "analysis",
      position: [0, 0.54, 0],
      color: "#fb7185",
      radius: 0.18,
      tubeRadius: 0.008,
      renderOrder: 8,
    },
    {
      kind: "arrow",
      id: "analysis-arrow",
      objectId: "analysis",
      from: [-0.72, 0.35, -0.48],
      to: [-0.1, 0.54, -0.08],
      color: "#fb7185",
      opacity: 0.92,
      headSize: 0.105,
      renderOrder: 8,
    },
  ];
}