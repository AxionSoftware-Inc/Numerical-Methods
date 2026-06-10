export type SurfaceStyleDefaults = {
  palette: string;
  shade: number;
  contrast: number;
  brightness: number;

  meshOpacity: number;
  lineOpacity: number;

  wireframe: boolean;
  wireOpacity: number;

  guides: number;
  guideOpacity: number;
  edgeFade: number;

  pointSize: number;
  pointOpacity: number;
};

export function surfaceStyleDefaults(style: string | undefined): SurfaceStyleDefaults {
  if (style === "clean") {
    return {
      palette: "cyan",
      shade: 0.85,
      contrast: 1,
      brightness: 1,
      meshOpacity: 0.72,
      lineOpacity: 0.08,
      wireframe: false,
      wireOpacity: 0,
      guides: 6,
      guideOpacity: 0.05,
      edgeFade: 0.22,
      pointSize: 0.026,
      pointOpacity: 0.88,
    };
  }

  if (style === "neon") {
    return {
      palette: "cyan",
      shade: 1,
      contrast: 1.28,
      brightness: 1.08,
      meshOpacity: 0.82,
      lineOpacity: 0.04,
      wireframe: true,
      wireOpacity: 0.1,
      guides: 8,
      guideOpacity: 0.06,
      edgeFade: 0.28,
      pointSize: 0.028,
      pointOpacity: 0.96,
    };
  }

  if (style === "premium") {
    return {
      palette: "cyan",
      shade: 1,
      contrast: 1.22,
      brightness: 1.04,
      meshOpacity: 0.86,
      lineOpacity: 0.03,
      wireframe: true,
      wireOpacity: 0.08,
      guides: 8,
      guideOpacity: 0.05,
      edgeFade: 0.24,
      pointSize: 0.028,
      pointOpacity: 0.95,
    };
  }

  if (style === "fire") {
    return {
      palette: "fire",
      shade: 1,
      contrast: 1.35,
      brightness: 1,
      meshOpacity: 0.92,
      lineOpacity: 0.02,
      wireframe: true,
      wireOpacity: 0.06,
      guides: 0,
      guideOpacity: 0.04,
      edgeFade: 0.15,
      pointSize: 0.028,
      pointOpacity: 0.95,
    };
  }

  if (style === "paper") {
    return {
      palette: "white",
      shade: 0.7,
      contrast: 0.9,
      brightness: 1.05,
      meshOpacity: 0.68,
      lineOpacity: 0.16,
      wireframe: true,
      wireOpacity: 0.12,
      guides: 10,
      guideOpacity: 0.08,
      edgeFade: 0.15,
      pointSize: 0.024,
      pointOpacity: 0.86,
    };
  }

  if (style === "dark-lab") {
    return {
      palette: "violet",
      shade: 1,
      contrast: 1.25,
      brightness: 1,
      meshOpacity: 0.84,
      lineOpacity: 0.04,
      wireframe: true,
      wireOpacity: 0.08,
      guides: 8,
      guideOpacity: 0.06,
      edgeFade: 0.28,
      pointSize: 0.028,
      pointOpacity: 0.94,
    };
  }

  return {
    palette: "color",
    shade: 1,
    contrast: 1,
    brightness: 1,
    meshOpacity: 0.82,
    lineOpacity: 0.08,
    wireframe: true,
    wireOpacity: 0.08,
    guides: 8,
    guideOpacity: 0.06,
    edgeFade: 0.25,
    pointSize: 0.026,
    pointOpacity: 0.92,
  };
}

export function isSurfaceStyle(value: string | undefined): boolean {
  return (
    value === undefined ||
    value === "clean" ||
    value === "neon" ||
    value === "premium" ||
    value === "paper" ||
    value === "dark-lab" ||
    value === "fire"
  );
}

export function surfaceStyleList(): string {
  return "clean, neon, premium, paper, dark-lab or fire";
}
