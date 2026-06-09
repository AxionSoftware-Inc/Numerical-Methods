import type { VideoFrameSpec, VideoProjectSpec } from "./types";
import { clamp01 } from "./easing";
import { sampleCameraTrack } from "./interpolate";
import { applyObjectTracks } from "./transforms";

export function renderFrameSpec(project: VideoProjectSpec, time: number): VideoFrameSpec {
  const duration = Math.max(project.timeline.duration, 1e-9);
  const clampedTime = Math.max(0, Math.min(duration, time));
  const frame = Math.round(clampedTime * project.timeline.fps);
  const camera = sampleCameraTrack(project.timeline.camera, project.baseScene.camera, clampedTime);
  const layers = applyObjectTracks(project.baseScene.layers, project.timeline.objects, clampedTime, duration);

  return {
    frame,
    time: clampedTime,
    progress: clamp01(clampedTime / duration),
    scene: {
      ...project.baseScene,
      id: project.baseScene.id,
      camera,
      layers,
      metadata: {
        ...project.baseScene.metadata,
        videoProjectId: project.id,
        videoProjectName: project.name,
        frame,
        time: clampedTime,
        progress: clampedTime / duration,
      },
    },
  };
}

export function frameCount(project: VideoProjectSpec) {
  return Math.floor(project.timeline.duration * project.timeline.fps) + 1;
}

export function frameTimes(project: VideoProjectSpec) {
  const count = frameCount(project);
  return Array.from({ length: count }, (_, frame) => frame / project.timeline.fps);
}

export function renderFrameSequence(project: VideoProjectSpec) {
  return frameTimes(project).map((time) => renderFrameSpec(project, time));
}
