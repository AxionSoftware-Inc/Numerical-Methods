# @methodslab/methods-engine

Independent math and trace engine for MethodsLab.

This package contains method contracts, numerical examples, integration traces,
energy/stability analysis, and presets. It does not import React, Three.js, or
browser rendering APIs.

## Public Imports

```ts
import { buildTrace, buildIntegrationTrace } from "@methodslab/methods-engine/core";
import { methods, examples, integrationMethods } from "@methodslab/methods-engine/presets";
```

## Boundary

- Use this package to compute structured traces and analysis data.
- Use `@methodslab/visual-engine` to render those traces.
