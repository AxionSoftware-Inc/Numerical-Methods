# OperatorLab Benchmark System

`OperatorLab` benchmark tizimi barcha operator family'lar uchun bitta umumiy g'oyaga tayangan holda qurilgan:

- `family` o'z trace modeliga ega
- har family uchun `benchmark row builder` mavjud
- row'lar umumiy `BenchmarkRow` formatiga keltiriladi
- UI esa shu umumiy formatni render qiladi

## Asosiy arxitektura

- Registry / builder:
  - `app/analyzer/benchmark-utils.ts`
- UI komponentlar:
  - `app/analyzer/benchmark-ui.tsx`
- Full report route:
  - `app/analyzer/benchmarks/page.tsx`

## Umumiy model

Har benchmark qatori:

- `label`
- `selected`
- `best`
- `worst`
- `selectedMethod`
- `bestMethod`
- `worstMethod`
- `interpretation`

Bu format family-specific trace'lardan ajratilgan. Shuning uchun yangi operator family benchmark tizimiga ulanishi uchun faqat row builder kerak bo'ladi.

## Family bo'yicha mezonlar

### ODE

- final error
- max error
- invariant drift
- mean path error
- stage cost
- energy drift

### PDE

- final L2
- final Linf
- mean L2
- amplitude drift
- resolution efficiency
- stability score

### Integral

#### 1D area

- abs error
- peak local error
- sensitivity
- sample efficiency
- noise
- bias

#### Surface

- abs error
- sensitivity
- sample efficiency
- resolution use
- value span
- absolute stability

#### Volume

- abs error
- sensitivity
- sample efficiency
- resolution use
- value span
- absolute stability

### Matrix

- accuracy
- state error
- convergence speed
- stability
- large-scale fit
- data / spectrum match

### Root-finding

- residual
- root error
- bracket quality
- convergence speed
- safety
- aggressive move

### Interpolation

- max error
- RMS error
- edge behavior
- node efficiency
- smoothness
- roughness

### Optimization

- final value
- gradient norm
- distance
- best value
- convergence speed
- monotonicity

### Probability

- mean error
- variance error
- payoff stderr
- CI width
- sampling efficiency
- tail risk

## Yangi family qo'shish

Yangi operator benchmarkga ulanishi uchun:

1. Trace builder tayyor bo'lishi kerak
2. `benchmark-utils.ts` ichida yangi `build<Family>BenchmarkRows(...)` yoziladi
3. `buildBenchmarkReport(...)` ichiga route/query mapping qo'shiladi
4. Family sidebar'iga:
   - compact summary
   - `Full benchmark` link
   ulanadi

## Dizayn qoidalari

- Benchmark faqat chiroyli vizual emas, diagnostik qiymat berishi kerak
- Kamida bitta:
  - accuracy
  - efficiency
  - stability
  - structure-aware
  mezoni bo'lishi tavsiya qilinadi
- Faqat final value emas, path yoki evolution xulqi ham hisobga olinadi

## Kelajakdagi kengaytirish

- family-specific weight system
- benchmark presets
- export to JSON / CSV
- radar chart persistence
- benchmark comparison history
