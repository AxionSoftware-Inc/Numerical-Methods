# @methodslab/visual-engine

Reusable visual renderer for OperatorLab traces.

This package owns rendering, viewport controls, hit testing, and scene adapters.
It does not define numerical methods or mathematical presets. Those live in
`@methodslab/methods-engine`.

The engine is split into two layers:

- `@methodslab/visual-engine/core`: React-free visual scene contracts, colors, geometry helpers, and scene spec builders.
- `@methodslab/visual-engine/react`: React/Three renderer adapters and custom viewport controls.

`core` returns serializable `VisualSceneSpec` objects. That contract is the bridge for later product/video renderers.

## Public Imports

```ts
import { buildTrace } from "@methodslab/methods-engine/core";
import { methods, examples } from "@methodslab/methods-engine/presets";
import { createVolumeIntegralSceneSpec } from "@methodslab/visual-engine/core";
import { MethodScene, VisualViewportControls } from "@methodslab/visual-engine/react";
```

## Boundary

- `@methodslab/methods-engine`: math contracts, operators, examples, traces, analysis.
- `@methodslab/visual-engine/core`: renderer-independent scene specs and visual geometry builders.
- `@methodslab/visual-engine/react`: React/WebGL scenes, 2D/3D renderers, custom viewport controls.

The 3D viewport controls are implemented inside this package through
`VisualViewportControls`; the renderer does not import external viewport
control helpers.

## Interaction Model

- Primary drag: configured per scene as pan or orbit
- Right drag or modifier drag: alternate action
- Wheel: configured per scene as orbit or pan
- Shift + wheel: pan
- Ctrl/Meta + wheel: zoom
- Double click in method scene: reset camera
- Hover numeric markers in method scene: inspect trace values
