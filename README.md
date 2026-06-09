# MethodsLab

MethodsLab hozir ikki asosiy yo'nalishda ishlayapti:

- `Analyzer` -> matematik metodlarni vizual tahlil qilish
- `Video Lab` -> shu vizual sahnalardan video/animatsiya sahna qurish

## Ishga tushirish

```bash
npm install
npm run dev
```

Brauzer:

- `http://localhost:3000` -> landing
- `http://localhost:3000/analyzer` -> analyzer
- `http://localhost:3000/video-lab` -> video lab

## Routing

- [app/page.tsx](/Users/i/Documents/methodslab/app/page.tsx)
  - landing
- [app/analyzer/page.tsx](/Users/i/Documents/methodslab/app/analyzer/page.tsx)
  - analyzer entry
- [app/video-lab/video-lab.tsx](/Users/i/Documents/methodslab/app/video-lab/video-lab.tsx)
  - video lab UI, parser, preview orchestration

## Paketlar

- [packages/visual-engine](/Users/i/Documents/methodslab/packages/visual-engine)
  - 3D vizual sahna engine
- [packages/video-engine](/Users/i/Documents/methodslab/packages/video-engine)
  - timeline va render contract
- [packages/methods-engine](/Users/i/Documents/methodslab/packages/methods-engine)
  - matematik hisob va trace qatlamlari
- [packages/scene-dsl](/Users/i/Documents/methodslab/packages/scene-dsl)
  - video sahna kodini parse qiladigan modul

## Video Lab scene code

Default loyiha sodda scene code bilan ochiladi:

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

Scene code ichida ishlatish mumkin:

```txt
camera: default
camera: left
camera: right
camera: top
camera: zoom
camera: reset
```

`default` hozir sahnani tepaki burchakdan ko'rsatadi, Blender default ko'rinishiga yaqin.

## Qayerga nima yoziladi

### Yangi preview obyekt

`app/video-lab/video-lab.tsx`

- `DefaultProjectViewport(...)`
- `createNewProjectSceneSpec()`

### Yangi scene code buyruqlari

`app/video-lab/video-lab.tsx`

- `parseSceneScript(...)`
- `handleColonInstruction(...)`
- `parseActionLine(...)`
- `parseCameraLine(...)`

### Timeline va render mantig'i

`packages/video-engine/src/core/*`

### Visual layerlar

`packages/visual-engine/src/*`

## Arxitektura hujjati

To'liqroq izoh:

- [docs/video-engine-architecture.md](/Users/i/Documents/methodslab/docs/video-engine-architecture.md)

## Hozirgi holat

- default `New Project` qora fon bilan ochiladi
- default sahnada bitta 3D integral obyekt ko'rinadi
- kamera tepaki burchakdan qaraydi
- preview ichida sichqoncha bilan aylantirish va zoom ishlaydi
- orbit paytida kamera markaz atrofida yuradi, obyektning o'zi aylantirilmaydi
- markazda qo'zg'almas o'q bor
- WebM va PNG sequence export bor

## Keyingi tavsiya

Eng to'g'ri keyingi yo'nalish:

1. scene DSL'ni alohida package qilish
2. camera controller'ni reusable modulga ajratish
3. text/latex animation layerini kuchaytirish
4. keyin GUI/timeline editor qo'shish
