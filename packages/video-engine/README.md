# @methodslab/video-engine

Timeline and frame-spec engine for OperatorLab visuals.

This package does not render React, Three, canvas, or video files directly. It
turns a renderer-independent `VisualSceneSpec` into deterministic frame specs
over time. Interactive preview and future video export adapters can consume the
same output.

## Boundary

- `@methodslab/visual-engine/core`: scene and layer contract.
- `@methodslab/video-engine/core`: timeline, keyframes, easing, camera tracks, frame sampling.
- App or export adapters: render frames to WebGL, PNG sequence, WebM, MP4, etc.
