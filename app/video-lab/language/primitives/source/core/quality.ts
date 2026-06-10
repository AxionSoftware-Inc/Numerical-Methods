export type SurfaceQuality = "low" | "medium" | "high" | "ultra";

export function surfaceQualityDefaults(value: string | undefined): {
  rows: number;
  cols: number;
} {
  if (value === "low") {
    return { rows: 28, cols: 64 };
  }

  if (value === "high") {
    return { rows: 54, cols: 150 };
  }

  if (value === "ultra") {
    return { rows: 72, cols: 200 };
  }

  return { rows: 40, cols: 100 };
}

export function isSurfaceQuality(value: string | undefined): boolean {
  return (
    value === undefined ||
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "ultra"
  );
}

export function surfaceQualityList(): string {
  return "low, medium, high or ultra";
}
