# @methodslab/visual-engine

Reusable visual math engine for turning numerical methods into trace layers.

## Public imports

```ts
import { buildTrace, defineExample, defineMethod } from "@methodslab/visual-engine/core";
import { examples, methods } from "@methodslab/visual-engine/presets";
import { MethodScene } from "@methodslab/visual-engine/react";
```

The React adapter owns its canvas and uses a direct Three.js renderer. It does
not depend on React Three Fiber or Drei.

## Interaction model

- Drag: pan
- Right drag or Shift/Alt/Meta + drag: rotate
- Two-finger touchpad scroll / wheel: orbit
- Shift + wheel: pan
- Pinch or Ctrl/Meta + wheel: zoom
- Touch: one finger pans, two fingers zoom/pan
- Double click: reset camera to the auto-framed view
- Hover numeric markers: inspect point, exact value, and error data

## Core idea

Every method returns the same `TraceResult` shape:

- `points` and `exactPath`
- `steps` and `stages`
- `errors`
- `stabilityRegion`
- `jacobianDeformation`
- `localErrorSurface`
- `criticalMarkers`
- `metrics` and `metadata`

The core layer does not import React, Three.js, or React Three Fiber.

## User-defined method

```ts
import { addScaled, defineMethod } from "@methodslab/visual-engine/core";

const customEuler = defineMethod({
  id: "custom-euler",
  name: "Custom Euler",
  formula: "y(n+1) = y(n) + h f(y(n))",
  stability: "R(z) = 1 + z",
  stabilityPolynomial: [1, 1],
  color: "#f8d66d",
  geometry: "Single tangent step.",
  computeStep: (point, t, h, field) => {
    const k1 = field(point, t);
    return {
      next: addScaled(point, k1, h),
      stages: [{ label: "k1", sample: point, vectorEnd: addScaled(point, k1, h), color: "#fef3c7" }],
    };
  },
});
```

## User-defined example

```ts
import { defineExample } from "@methodslab/visual-engine/core";

const oscillator = defineExample({
  id: "oscillator",
  name: "Oscillator",
  shortName: "Oscillator",
  equation: "x' = v, v' = -x",
  initial: [1, 0, 0],
  endTime: Math.PI * 4,
  defaultStep: 0.2,
  minStep: 0.05,
  maxStep: 0.7,
  exact: (t) => [Math.cos(t), -Math.sin(t), 0],
  exactFlow: ([x, v, z], _t, h) => [x * Math.cos(h) + v * Math.sin(h), v * Math.cos(h) - x * Math.sin(h), z],
  field: ([x, v]) => [v, -x, 0],
  metricLabel: "Energy",
  metric: ([x, v]) => (x * x + v * v) / 2,
  criticalMarkers: [{ label: "equilibrium", point: [0, 0, 0], kind: "equilibrium", severity: 0.7 }],
  criticalSearch: {
    enabled: true,
    xRange: [-1.2, 1.2],
    yRange: [-1.2, 1.2],
    z: 0,
    samples: 41,
    threshold: 0.05,
    zWeight: 0,
  },
  interpretation: "Phase-space rotation.",
  fieldScale: 0.2,
  gridZ: -1,
});
```
