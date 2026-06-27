# Operator Registry Guide

Bu fayl `@methodslab/methods-engine` ichida yangi operator family qo‘shish tartibini tushuntiradi.

## 1. Yangi operator family qo‘shish

Yangi family `packages/methods-engine/src/presets/operators.ts` ichida ro‘yxatga qo‘shiladi.

Minimal misol:

```ts
import { defineOperatorFamily, defineOperatorScheme } from "../core/operators";

export const myFamily = defineOperatorFamily({
  id: "my-operator",
  name: "My Operator",
  summary: "Short description of the operator family.",
  visualGrammar: "trajectory-flow",
  status: "planned",
  exampleIds: [],
  schemes: [
    defineOperatorScheme({
      id: "my-scheme",
      name: "My Scheme",
      formula: "x_{k+1} = T(x_k)",
      color: "#60a5fa",
      geometry: "Explain how the scheme moves geometrically.",
      status: "planned",
    }),
  ],
});
```

## 2. Scheme qo‘shish

Har operator family ichida bir nechta scheme bo‘lishi mumkin:

- `implemented` - tayyor va ishlaydigan scheme
- `planned` - registryda bor, lekin keyinroq to‘liq pipeline ulanadi

Scheme uchun kamida quyidagi maydonlar kerak:

- `id`
- `name`
- `formula`
- `color`
- `geometry`
- `status`

## 3. Visual grammar tanlash

Operator family o‘zining `visualGrammar` qiymatini oladi.

Hozir ishlatiladigan grammar’lar:

- `trajectory-flow`
- `partition-accumulation`
- `field-mesh`
- `transform-basis`
- `convergence-path`
- `landscape-descent`
- `stochastic-path`
- `curve-reconstruction`

Yangi family shu grammalardan birini ishlatishi yoki keyin yangi grammar qo‘shishi mumkin.

## 4. Registry’ni o‘qish

Registry `operatorRegistry` orqali eksport qilinadi:

```ts
import { operatorRegistry } from "@methodslab/methods-engine/presets";
```

Undan family’larni topish, ularga tegishli scheme’larni ko‘rish va custom analiz qilish mumkin.

## 5. Custom method qo‘shish

Endi custom method alohida tashqi rejim emas, har bir operator family ichida ham ishlaydi.

Foydalanuvchi formula yoki latex kiritganda tizim quyidagilarni qiladi:

1. matn normalizatsiya qilinadi
2. family keyword’lar bo‘yicha taxmin qilinadi yoki foydalanuvchi turgan family bevosita olinadi
3. shu family uchun `compileCustom...Method(...)` ishlaydi
4. formula eng yaqin executable method oilasiga compile qilinadi
5. parsed parametrlar (`theta`, `omega`, `eta`, `beta` va h.k.) ajratib olinadi
6. UI shu family’ning o‘z analyzer’ida custom method’ni preset methodlar bilan bir qatorda ishlatadi
7. benchmark sahifasi ham `formula=` query orqali shu custom method’ni qayta tiklaydi

Custom method pipeline hozir:

- registry bilan bog‘langan
- family ichida analiz qilinadigan
- benchmark bilan ham bog‘langan
- shared expression parser bilan parametrlarni hisoblay oladigan
- keyinchalik full symbolic parser/compiler bilan yanada chuqurlashtiriladigan

## 6. Formula sintaksisi

Custom compiler endi oddiy keyword qidirish bilan cheklanmaydi. U:

- plain text
- oddiy formula
- ba'zi LaTeX belgilarini (`\theta`, `\eta`, `\omega`, `\beta`, `\frac{...}{...}`)

normalizatsiya qilib, assignment'larni o‘qiy oladi.

Ishlaydigan yozish usullari:

```txt
theta = 0.5
eta = 0.02
omega: 1.15
beta = 0.9
a2 = 2/3; b1 = 1/4; b2 = 3/4; c2 = 2/3
```

Endi ba'zi family'larda update-rule assignment ham ishlaydi:

```txt
xnext = x - eta * gx
ynext = y - eta * gy + beta * vy
```

Yoki root finding uchun:

```txt
xnext = x - lambda * fx / df
```

Parametr expression'lari oldingi assignment'larga tayana oladi:

```txt
eta = 0.04
beta = 0.8
omega = eta / (1 - beta)
```

## 7. ODE uchun haqiqiy custom RK2

`diff eq / ode` family ichida foydalanuvchi 2-stage explicit RK methodni to‘g‘ridan-to‘g‘ri bera oladi.

Misol:

```txt
a2 = 2/3
b1 = 1/4
b2 = 3/4
c2 = 2/3
```

Bu yozuv `Custom RK2 Tableau` sifatida compile qilinadi va analyzer uni preset methodlar kabi ishlatadi.

Mazmuni:

- `a2` - ikkinchi stage sampling nuqtasi
- `c2` - vaqt bo‘yicha ikkinchi stage siljishi
- `b1`, `b2` - final blend og‘irliklari

Shu bilan user preset’da yo‘q RK2 variantlarini ham sinab ko‘rishi mumkin.

## 8. Formula-executable family'lar

Hozir quyidagi custom pipeline bosqichlari mavjud:

- `matched`
  family va method oilasi topiladi, lekin default executor ishlaydi
- `parametric-executable`
  default executor ishlaydi, lekin parametrlar formula ichidan override qilinadi
- `formula-executable`
  formula ichidagi update-rule to‘g‘ridan-to‘g‘ri executable qadamga aylanadi

Hozir `formula-executable` holati ayniqsa quyidagilarda foydali:

- `optimization`
  `xnext`, `ynext` orqali
- `root finding`
  `xnext` orqali

Masalan optimization uchun context symbol'lari:

- `x`, `y`
- `gx`, `gy`
- `vx`, `vy`
- `eta`
- `beta`
- `stepScale`

Root finding uchun:

- `x`
- `fx`
- `df` yoki `dfx`
- `xprev`, `fprev`
- `a`, `b`, `fa`, `fb`
- `mid`

## 9. Tavsiya etilgan kengaytirish tartibi

Yangi family qo‘shishda shu tartibdan boring:

1. family metadata qo‘shing
2. kamida 1-3 scheme yozing
3. visual grammar tanlang
4. example’larni ulang
5. custom analysis keywords’ini kerak bo‘lsa kuchaytiring
6. UI’da family card’ni ko‘rinadigan qiling

## 10. Family-specific custom compiler

Hozir quyidagi compiler funksiyalar mavjud:

- `compileCustomOdeMethod(...)`
- `compileCustomPdeMethod(...)`
- `compileCustomAreaIntegralMethod(...)`
- `compileCustomSurfaceIntegralMethod(...)`
- `compileCustomVolumeIntegralMethod(...)`
- `compileCustomMatrixMethod(...)`
- `compileCustomRootFindingMethod(...)`
- `compileCustomInterpolationMethod(...)`
- `compileCustomOptimizationMethod(...)`
- `compileCustomProbabilityMethod(...)`

Bu compiler’lar formula matnini o‘qib:

- eng yaqin method oilasini tanlaydi
- kerak bo‘lsa parametrlarni parse qiladi
- executable method spec qaytaradi
- analyzer va benchmark’ga bir xil methodni ulaydi

Shared parser eksportlari:

- `analyzeCustomFormula(...)`
- `compileScalarExpression(...)`
- `lookupAssignment(...)`

Yangi family custom compiler yozayotganda shu parser helper'larini ishlatish tavsiya qilinadi.

## 11. Premium preview family'lar

Hozir custom preview’da quyidagi family’lar alohida ko‘rinadi:

- `matrix / linear algebra` -> basis deformation
- `root finding` -> root curve + bracket + iteration path
- `optimization` -> landscape + descent path
- `probability / stochastic` -> ensemble paths + spread geometry
- `interpolation / approximation` -> nodes + reconstruction curve
