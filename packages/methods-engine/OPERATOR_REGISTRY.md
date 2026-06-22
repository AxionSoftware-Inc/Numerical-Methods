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

Foydalanuvchi formula yoki latex kiritganda tizim quyidagilarni qiladi:

1. matn normalizatsiya qilinadi
2. family keyword’lar bo‘yicha taxmin qilinadi
3. family ning default schemes ro‘yxati olinadi
4. custom scheme draft yaratiladi
5. UI family vizualizatsiyasini va custom formula skeleton’ini ko‘rsatadi

Custom method hozircha:

- registry bilan bog‘langan
- family ichida analiz qilinadigan
- keyinchalik parser/compiler bilan chuqurlashtiriladigan

## 6. Tavsiya etilgan kengaytirish tartibi

Yangi family qo‘shishda shu tartibdan boring:

1. family metadata qo‘shing
2. kamida 1-3 scheme yozing
3. visual grammar tanlang
4. example’larni ulang
5. custom analysis keywords’ini kerak bo‘lsa kuchaytiring
6. UI’da family card’ni ko‘rinadigan qiling

## 7. Premium preview family'lar

Hozir custom preview’da quyidagi family’lar alohida ko‘rinadi:

- `matrix / linear algebra` -> basis deformation
- `root finding` -> root curve + bracket + iteration path
- `optimization` -> landscape + descent path
- `probability / stochastic` -> ensemble paths + spread geometry
- `interpolation / approximation` -> nodes + reconstruction curve
