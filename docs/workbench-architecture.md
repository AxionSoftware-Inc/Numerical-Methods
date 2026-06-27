# OperatorLab Workbench Architecture

Bu hujjat `Workbench UI` boshlanishidan oldingi markaziy contract'larni qisqacha belgilaydi.

## 1. Maqsad

Workbench oddiy solver sahifasi emas.
U:

- operator trace'larini ko'rsatadi
- metodlarni solishtiradi
- composition / fused pipeline'larni boshqaradi
- bir nechta family'ni bitta tahlil modeli ichiga kiritadi

Shu sabab UI'dan oldin ikki qatlam kerak:

1. `Workbench trace contract`
2. `Workbench visual contract`

## 2. Trace contract

Joylashuvi:

- `packages/methods-engine/src/core/workbench-contract.ts`

Asosiy obyekt:

- `OperatorWorkbenchArtifact`

U quyidagilarni bir joyga jamlaydi:

- `familyId`
- `methodId`
- `exampleId`
- `trace`
- `comparisonTraces`
- `diagnostics`
- `visual`
- `summary`

Bu contract family-specific trace formatlarini Workbench uchun bitta umumiy formatga keltiradi.

## 3. Visual contract

`artifact.visual` quyidagilarni belgilaydi:

- `sceneKind`
- `visualGrammar`
- `supportsComparison`
- `supportsFocus`
- `supportsComposition`
- `defaultFocus`
- `layerToggles`

Ya'ni UI scene builder'ni o'zi taxmin qilmaydi.
Qaysi family qanday markaziy sahna bilan ko'rsatilishi contract'da aytiladi.

## 4. Scene routing

Joylashuvi:

- `packages/visual-engine/src/core/workbench-scene.ts`

`createWorkbenchSceneSpec(...)` artifact'ni olib, mos scene builder'ga yuboradi:

- `ode-trace`
- `pde-trace`
- `area-integral`
- `surface-integral`
- `volume-integral`
- `optimization-trace`
- `probability-trace`
- `operator-family-preview`

Shu qatlam Workbench UI'ni family ichki renderer tafsilotlaridan ajratadi.

## 5. Composition

Joylashuvi:

- `packages/methods-engine/src/core/composition.ts`
- `packages/visual-engine/src/core/operator-composition.ts`

Composition allaqachon first-class obyekt:

- node
- edge
- channel
- comparison metric
- validation
- composition scene

Workbench UI keyinchalik shu model ustiga quriladi.

## 6. Registry readiness

Joylashuvi:

- `packages/methods-engine/src/presets/operators.ts`
- `packages/methods-engine/src/core/workbench.ts`

Har family endi workbench capability metadata'ga ega:

- `traceScene`
- `comparison`
- `benchmark`
- `customMethod`
- `composition`
- `centralVisual`
- `readiness`
- `nextFocus`

Bu roadmap'ni kodning o'zida saqlaydi.

## 7. Keyingi UI bosqichi

Endi Workbench UI quyidagi tayyor primitive'lar ustida quriladi:

1. operator palette -> registry
2. canvas scene -> `createWorkbenchSceneSpec(...)`
3. composition canvas -> `createOperatorCompositionSceneSpec(...)`
4. diagnostics panel -> `artifact.diagnostics`
5. layer controls -> `artifact.visual.layerToggles`

Shu bilan UI qatlami engine semantics'idan emas, contract'lardan foydalanadi.
