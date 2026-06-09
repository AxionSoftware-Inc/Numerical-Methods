import { clamp, distance } from "./math";
import type { Point, TraceResult } from "./types";

export type SceneFrame = {
  center: Point;
  radius: number;
  cameraPosition: Point;
  minDistance: number;
  maxDistance: number;
};

export function computeSceneFrame(trace: TraceResult): SceneFrame {
  const points = [...trace.exactPath, ...trace.points, ...trace.criticalMarkers.map((marker) => marker.point)];
  const center = average(points);
  let radius = 1;

  for (const point of points) {
    radius = Math.max(radius, distance(center, point));
  }

  radius = clamp(radius, 2.2, 7.5);

  return {
    center,
    radius,
    cameraPosition: [center[0] + radius * 1.15, center[1] - radius * 1.45, center[2] + radius * 0.95],
    minDistance: Math.max(1.8, radius * 0.75),
    maxDistance: Math.max(6, radius * 2.7),
  };
}

function average(points: Point[]): Point {
  if (points.length === 0) return [0, 0, 0];
  const sum = points.reduce<Point>(
    (current, point) => [current[0] + point[0], current[1] + point[1], current[2] + point[2]],
    [0, 0, 0],
  );
  return [sum[0] / points.length, sum[1] / points.length, sum[2] / points.length];
}
