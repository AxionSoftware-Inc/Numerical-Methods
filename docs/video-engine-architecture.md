# MethodsLab Video Engine Architecture

Bu loyiha hozir ikki qatlamga bo'lingan:

1. `packages/video-engine`
   - timeline, keyframe, frame render kontrakti
   - `renderFrameSpec`, `renderFrameSequence`, `createOrbitCameraTrack`
   - video pipeline logikasi shu yerda
2. `app/video-lab`
  - product UI
  - scene code editor
  - preview viewport
  - export tugmalari
3. `packages/scene-dsl`
  - scene code parser
  - default scene code
  - kamera presetlari
  - slide/text helperlar

## Hozirgi oqim

`scene code` -> `@methodslab/scene-dsl` -> `SceneScript` -> `createObjectTracks(...)` -> `VideoProjectSpec` -> `renderFrameSpec(...)` -> preview/render

Qisqasi:

- foydalanuvchi bitta sahna faylini yozadi
- parser uni ichki obyekt/kamera/slayd formatiga aylantiradi
- video engine shu formatdan frame-frame sahna hosil qiladi
- preview shu frame sahnani ko'rsatadi

## Asosiy fayllar

### UI va editor

- [app/video-lab/video-lab.tsx](/Users/i/Documents/methodslab/app/video-lab/video-lab.tsx)
  - video labning asosiy ekrani
  - `New Project`
  - code editor
  - preview
  - render/export

### Video engine

- [packages/video-engine/src/core/index.ts](/Users/i/Documents/methodslab/packages/video-engine/src/core/index.ts)
  - public exports
- [packages/video-engine/src/core/render.ts](/Users/i/Documents/methodslab/packages/video-engine/src/core/render.ts)
  - timeline -> frame hisoblash
- [packages/video-engine/src/core/timeline.ts](/Users/i/Documents/methodslab/packages/video-engine/src/core/timeline.ts)
  - keyframe interpolation va timeline contract

### Visual engine

- [packages/visual-engine/src/core](/Users/i/Documents/methodslab/packages/visual-engine/src/core)
  - sahna layerlari va spec contract
- [packages/visual-engine/src/react](/Users/i/Documents/methodslab/packages/visual-engine/src/react)
  - React render adapter

### Scene DSL

- [packages/scene-dsl/src/core/index.ts](/Users/i/Documents/methodslab/packages/scene-dsl/src/core/index.ts)
- [packages/scene-dsl/src/core/parser.ts](/Users/i/Documents/methodslab/packages/scene-dsl/src/core/parser.ts)
- [packages/scene-dsl/src/core/types.ts](/Users/i/Documents/methodslab/packages/scene-dsl/src/core/types.ts)

## Scene code sintaksisi

Minimal sahna:

```txt
config:
  duration: 10
  camera: default

object volume:

slide "Yangi sahna":
  camera: default
  latex:
```

## Kamera presetlari

Kodda ishlatish mumkin:

```txt
camera: default
camera: left
camera: right
camera: top
camera: zoom
camera: reset
```

Maqsadi:

- `default` -> Blenderga o'xshash tepaki burchak
- `left` -> chap tomondan
- `right` -> o'ng tomondan
- `top` -> tepadan
- `zoom` -> yaqin fokus
- `reset` -> defaultga qaytish

## Qayerga nima yoziladi

### 1. Yangi obyekt yoki default demo ko'rinishi

`app/video-lab/video-lab.tsx`

Qarang:

- `DefaultProjectViewport(...)`
- `createNewProjectSceneSpec()`

### 2. Yangi script buyruqlari

`app/video-lab/video-lab.tsx`

Qarang:

- `parseSceneScript(...)`
- `createObjectTracks(...)`
- `DefaultProjectViewport(...)`

Masalan yangi `fade`, `wait`, `morph` buyruqlari endi `packages/scene-dsl` ichiga qo'shiladi.

### 3. Timeline interpolation yoki render mantig'i

`packages/video-engine/src/core/*`

Bu yerda:

- vaqt
- keyframe
- easing
- frame sampling

kabi narsalar yashaydi.

### 4. Vizual layerlar

`packages/visual-engine/src/*`

Bu yerda:

- mesh
- line
- label
- stage
- camera helper

kabi render qatlamlari rivojlantiriladi.

## Hozirgi kuchli tomon

- bitta scene code butun preview va renderni boshqaradi
- kamera presetlari sodda
- default project darhol ko'rinadi
- render WebM va PNG sequence bor
- keyinchalik GUI qo'shish oson

## Hozirgi kamchiliklar

1. Parser ajratildi, lekin hali `scene-dsl` ichida fayllar yanada mayda bo'linishi mumkin.
2. Default viewport interaktiv, lekin bu interaction hali alohida reusable camera controller moduliga ajralmagan.
3. Matn/LaTeX animatsiya engine hali sodda, Manim darajasidagi entrance/exit animatsiyalar yo'q.
4. Non-default sahnalarda preview adapteri va default viewport interaction mantig'ini bir xil contractga tushirish kerak.
5. Keyingi bosqichda `camera controller`, `text motion`, `transition library` alohida paketlarga bo'linishi kerak.

## Tavsiya etilgan keyingi bo'linish

Keyinroq mana bunday qilish yaxshi:

```txt
packages/
  visual-engine/
  video-engine/
  scene-dsl/
  text-engine/
```

## Kengaytirish yo'li

Agar siz o'zingiz davom ettirmoqchi bo'lsangiz, eng xavfsiz yo'l:

1. avval scene code buyruqlarini ko'paytirish
2. keyin text/latex animatsiyalarini kuchaytirish
3. keyin camera controller'ni reusable modulga ajratish
4. undan keyin timeline editor yoki GUI qurish

Shu yo'l bilan loyiha tartibli kengayadi va keyin alohida productga ko'chirish oson bo'ladi.
