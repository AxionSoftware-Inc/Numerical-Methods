import type {
  CompiledVideoProjectSpec,
  ObjectTrackSpec,
  VideoFrameSpec,
  VideoPlaybackRange,
  VideoProjectSpec,
  VideoProjectValidationIssue,
  VideoProjectValidationResult,
  VideoRenderOptions,
} from "./types";
import { clamp01 } from "./easing";
import { sampleCameraTrack } from "./interpolate";
import { applyObjectTracks } from "./transforms";

export function compileVideoProject(project: VideoProjectSpec): CompiledVideoProjectSpec {
  const validation = validateVideoProject(project);

  if (!validation.ok) {
    const message = validation.issues
      .filter((issue) => issue.level === "error")
      .map((issue) => `${issue.code}: ${issue.message}`)
      .join("\n");

    throw new Error(message || "Invalid video project.");
  }

  return {
    ...project,
    timeline: {
      ...project.timeline,
      camera: project.timeline.camera ? normalizeCameraTrack(project.timeline.camera) : undefined,
      objects: normalizeObjectTracks(project.timeline.objects ?? []),
      clips: [...(project.timeline.clips ?? [])].sort((a, b) => a.start - b.start),
    },
    metadata: {
      ...project.metadata,
      compiled: true,
    },
  };
}

export function validateVideoProject(project: VideoProjectSpec): VideoProjectValidationResult {
  const issues: VideoProjectValidationIssue[] = [];

  if (!project.id) {
    issues.push(errorIssue("PROJECT_ID_MISSING", "Video project id is required.", "id"));
  }

  if (!project.name) {
    issues.push(warningIssue("PROJECT_NAME_MISSING", "Video project name is empty.", "name"));
  }

  if (!project.baseScene) {
    issues.push(errorIssue("BASE_SCENE_MISSING", "Base scene is required.", "baseScene"));
  }

  if (!Number.isFinite(project.timeline.duration) || project.timeline.duration <= 0) {
    issues.push(errorIssue("INVALID_DURATION", "Timeline duration must be greater than 0.", "timeline.duration"));
  }

  if (!Number.isFinite(project.timeline.fps) || project.timeline.fps <= 0) {
    issues.push(errorIssue("INVALID_FPS", "Timeline fps must be greater than 0.", "timeline.fps"));
  }

  const objectIds = new Set(project.baseScene.layers.flatMap(collectObjectIds));

  for (const track of project.timeline.objects ?? []) {
    if (!track.objectId) {
      issues.push(errorIssue("TRACK_OBJECT_ID_MISSING", "Object track objectId is required.", "timeline.objects"));
      continue;
    }

    if (!objectIds.has(track.objectId)) {
      issues.push(
        warningIssue(
          "TRACK_TARGET_NOT_FOUND",
          `Object track target "${track.objectId}" was not found in base scene layers.`,
          `timeline.objects.${track.objectId}`,
        ),
      );
    }

    if (track.kind === "keyframes" && track.keyframes.length === 0) {
      issues.push(
        warningIssue(
          "EMPTY_KEYFRAME_TRACK",
          `Keyframe track for "${track.objectId}" has no keyframes.`,
          `timeline.objects.${track.objectId}.keyframes`,
        ),
      );
    }

    if (track.kind === "fade" && track.endTime <= track.startTime) {
      issues.push(
        errorIssue(
          "INVALID_FADE_RANGE",
          `Fade track for "${track.objectId}" must have endTime > startTime.`,
          `timeline.objects.${track.objectId}`,
        ),
      );
    }

    if (track.kind === "spin") {
      const start = track.startTime ?? 0;
      const end = track.endTime ?? project.timeline.duration;

      if (end <= start) {
        issues.push(
          errorIssue(
            "INVALID_SPIN_RANGE",
            `Spin track for "${track.objectId}" must have endTime > startTime.`,
            `timeline.objects.${track.objectId}`,
          ),
        );
      }
    }
  }

  for (const clip of project.timeline.clips ?? []) {
    if (clip.duration <= 0) {
      issues.push(errorIssue("INVALID_CLIP_DURATION", `Clip "${clip.id}" duration must be > 0.`, `timeline.clips.${clip.id}`));
    }
  }

  return {
    ok: issues.every((issue) => issue.level !== "error"),
    issues,
  };
}

export function renderFrameSpec(project: VideoProjectSpec, time: number): VideoFrameSpec {
  const compiled = isCompiledProject(project) ? project : compileVideoProject(project);
  const duration = Math.max(compiled.timeline.duration, 1e-9);
  const clampedTime = Math.max(0, Math.min(duration, time));
  const fps = compiled.timeline.fps;
  const frame = Math.round(clampedTime * fps);

  const camera = sampleCameraTrack(
    compiled.timeline.camera,
    compiled.baseScene.camera,
    clampedTime,
    duration,
  );

  const layers = applyObjectTracks(
    compiled.baseScene.layers,
    compiled.timeline.objects,
    clampedTime,
    duration,
  );

  const progress = clamp01(clampedTime / duration);

  return {
    frame,
    time: clampedTime,
    progress,
    scene: {
      ...compiled.baseScene,
      id: compiled.baseScene.id,
      camera,
      layers,
      metadata: {
        ...compiled.baseScene.metadata,
        videoProjectId: compiled.id,
        videoProjectName: compiled.name,
        frame,
        time: clampedTime,
        progress,
      },
    },
    metadata: {
      projectId: compiled.id,
      projectName: compiled.name,
      frame,
      time: clampedTime,
      progress,
    },
  };
}

export function frameCount(project: VideoProjectSpec, options: VideoRenderOptions = {}): number {
  const fps = options.fps ?? project.timeline.fps;
  const range = resolveRange(project, options.range);

  return Math.floor((range.end - range.start) * fps) + 1;
}

export function frameTimes(project: VideoProjectSpec, options: VideoRenderOptions = {}): number[] {
  const fps = options.fps ?? project.timeline.fps;
  const range = resolveRange(project, options.range);
  const count = frameCount(project, options);

  return Array.from({ length: count }, (_, frame) => {
    const time = range.start + frame / fps;
    return Math.min(range.end, time);
  });
}

export function renderFrameSequence(project: VideoProjectSpec, options: VideoRenderOptions = {}): VideoFrameSpec[] {
  const compiled = isCompiledProject(project) ? project : compileVideoProject(project);
  return frameTimes(compiled, options).map((time) => renderFrameSpec(compiled, time));
}

export function* renderFrameStream(
  project: VideoProjectSpec,
  options: VideoRenderOptions = {},
): Generator<VideoFrameSpec> {
  const compiled = isCompiledProject(project) ? project : compileVideoProject(project);

  for (const time of frameTimes(compiled, options)) {
    yield renderFrameSpec(compiled, time);
  }
}

function resolveRange(project: VideoProjectSpec, range?: Partial<VideoPlaybackRange>): VideoPlaybackRange {
  const duration = Math.max(project.timeline.duration, 1e-9);
  const start = Math.max(0, Math.min(duration, range?.start ?? 0));
  const end = Math.max(start, Math.min(duration, range?.end ?? duration));

  return { start, end };
}

function normalizeCameraTrack<T extends NonNullable<VideoProjectSpec["timeline"]["camera"]>>(track: T): T {
  if (track.kind === "orbit") return track;

  return {
    ...track,
    keyframes: [...track.keyframes].sort((a, b) => a.time - b.time),
  };
}

function normalizeObjectTracks(tracks: ObjectTrackSpec[]): ObjectTrackSpec[] {
  return tracks.map((track) => {
    if (track.kind !== "keyframes") return track;

    return {
      ...track,
      keyframes: [...track.keyframes].sort((a, b) => a.time - b.time),
    };
  });
}

function collectObjectIds(layer: { objectId?: string; kind: string; layers?: unknown[] }): string[] {
  const ids = layer.objectId ? [layer.objectId] : [];

  if (layer.kind === "group" && Array.isArray(layer.layers)) {
    for (const child of layer.layers) {
      ids.push(...collectObjectIds(child as { objectId?: string; kind: string; layers?: unknown[] }));
    }
  }

  return ids;
}

function isCompiledProject(project: VideoProjectSpec): project is CompiledVideoProjectSpec {
  return project.metadata?.compiled === true;
}

function errorIssue(code: string, message: string, path?: string): VideoProjectValidationIssue {
  return {
    level: "error",
    code,
    message,
    path,
  };
}

function warningIssue(code: string, message: string, path?: string): VideoProjectValidationIssue {
  return {
    level: "warning",
    code,
    message,
    path,
  };
}