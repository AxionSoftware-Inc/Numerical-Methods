import type { SurfaceIntegralTrace, VolumeIntegralTrace } from "@methodslab/methods-engine/core";
import { scalarColor, shade } from "./color";
import { addQuad, boxSegments } from "./geometry";
import type { VisualLayerSpec, VisualSceneSpec, VisualVec3 } from "./types";

type SurfaceBounds = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  zMin: number;
  zMax: number;
};

type VolumeBounds = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  maxHeight: number;
};

export type MultiIntegralSceneOptions = {
  showAnalysis?: boolean;
};

export function createSurfaceIntegralSceneSpec(trace: SurfaceIntegralTrace, options: MultiIntegralSceneOptions = {}): VisualSceneSpec {
  const bounds = surfaceBounds(trace);
  const layers: VisualLayerSpec[] = [surfaceMeshLayer(trace, bounds), surfaceSamplesLayer(trace, bounds)];
  if (options.showAnalysis ?? true) layers.push(...surfaceAnalysisLayers(trace, bounds));
  layers.push(baseGridLayer("surface-grid", 2.45));

  return {
    id: `surface:${trace.metadata.exampleId}:${trace.resolution}`,
    style: defaultMultiIntegralStyle(),
    camera: {
      position: [3.2, -4.8, 2.9],
      target: [0, 0, 0],
      fov: 46,
      minDistance: 1.8,
      maxDistance: 12,
    },
    layers,
    metadata: {
      kind: "surface",
      exampleId: trace.metadata.exampleId,
      resolution: trace.resolution,
      numericValue: trace.numericValue,
      exactValue: trace.exactValue,
      error: trace.error,
    },
  };
}

export function createVolumeIntegralSceneSpec(trace: VolumeIntegralTrace, options: MultiIntegralSceneOptions = {}): VisualSceneSpec {
  const bounds = volumeColumnBounds(trace);
  const layers: VisualLayerSpec[] = [volumeColumnsLayer(trace, bounds), volumeTopWireLayer(trace, bounds)];
  if (options.showAnalysis ?? true) layers.push(...volumeAnalysisLayers(trace, bounds));
  layers.push(volumeFrameLayer(), baseGridLayer("volume-grid", 2.55));

  return {
    id: `volume:${trace.metadata.exampleId}:${trace.resolution}`,
    style: defaultMultiIntegralStyle(),
    camera: {
      position: [3.8, -5, 3.3],
      target: [0, 0, 0],
      fov: 46,
      minDistance: 1.8,
      maxDistance: 12,
    },
    layers,
    metadata: {
      kind: "volume",
      exampleId: trace.metadata.exampleId,
      resolution: trace.resolution,
      numericValue: trace.numericValue,
      exactValue: trace.exactValue,
      error: trace.error,
    },
  };
}

function defaultMultiIntegralStyle() {
  return {
    background: "#0b2024",
    fogNear: 11,
    fogFar: 28,
  };
}

function surfaceMeshLayer(trace: SurfaceIntegralTrace, bounds: SurfaceBounds): VisualLayerSpec {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  trace.cells.forEach((cell) => {
    const base = positions.length / 3;
    cell.corners.forEach((corner) => {
      const point = normalizeSurfacePoint(corner, bounds);
      positions.push(point[0], point[1], point[2]);
      colors.push(...scalarColor(cell.value, trace.valueRange));
    });
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });

  return {
    kind: "mesh",
    id: "surface",
    objectId: "surface",
    positions,
    indices,
    colors,
    material: { vertexColors: true, doubleSided: true },
    wireframe: { color: "#e0f2fe", opacity: 0.16 },
  };
}

function surfaceSamplesLayer(trace: SurfaceIntegralTrace, bounds: SurfaceBounds): VisualLayerSpec {
  const sampleStride = Math.max(1, Math.floor(trace.cells.length / 110));
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const half = 0.012;

  trace.cells.forEach((cell, index) => {
    if (index % sampleStride !== 0) return;
    const point = normalizeSurfacePoint(cell.sample, bounds);
    addQuad(
      positions,
      colors,
      indices,
      [point[0] - half, point[1] + 0.015, point[2] - half],
      [point[0] + half, point[1] + 0.015, point[2] - half],
      [point[0] + half, point[1] + 0.015, point[2] + half],
      [point[0] - half, point[1] + 0.015, point[2] + half],
      [0.97, 0.98, 0.99],
    );
  });

  return {
    kind: "mesh",
    id: "surface-samples",
    objectId: "surface",
    positions,
    indices,
    colors,
    material: { vertexColors: true, doubleSided: true, opacity: 0.82, transparent: true },
  };
}

function volumeColumnsLayer(trace: VolumeIntegralTrace, bounds: VolumeBounds): VisualLayerSpec {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  trace.voxels.forEach((voxel) => {
    const column = normalizeVolumeColumn(voxel.center, voxel.size, bounds);
    const x0 = column.position[0] - (column.size[0] * 0.9) / 2;
    const x1 = column.position[0] + (column.size[0] * 0.9) / 2;
    const y0 = -0.86;
    const y1 = -0.86 + column.size[1];
    const z0 = column.position[2] - (column.size[2] * 0.9) / 2;
    const z1 = column.position[2] + (column.size[2] * 0.9) / 2;
    const topColor = scalarColor(voxel.value, trace.valueRange);
    const sideColor = shade(topColor, 0.68);
    const farSideColor = shade(topColor, 0.48);

    addQuad(positions, colors, indices, [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], topColor);
    addQuad(positions, colors, indices, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], sideColor);
    addQuad(positions, colors, indices, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], farSideColor);
    addQuad(positions, colors, indices, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], sideColor);
    addQuad(positions, colors, indices, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], farSideColor);
  });

  return {
    kind: "mesh",
    id: "volume-columns",
    objectId: "volume",
    positions,
    indices,
    colors,
    material: { vertexColors: true, doubleSided: true },
  };
}

function volumeTopWireLayer(trace: VolumeIntegralTrace, bounds: VolumeBounds): VisualLayerSpec {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  trace.voxels.forEach((voxel) => {
    const base = positions.length / 3;
    const x0 = voxel.center[0] - voxel.size[0] / 2;
    const x1 = voxel.center[0] + voxel.size[0] / 2;
    const y0 = voxel.center[1] - voxel.size[1] / 2;
    const y1 = voxel.center[1] + voxel.size[1] / 2;
    const top = voxel.size[2];
    const corners: VisualVec3[] = [
      [x0, y0, top],
      [x1, y0, top],
      [x1, y1, top],
      [x0, y1, top],
    ].map(([x, y, height]) => {
      const column = normalizeVolumeColumn([x, y, height / 2], [voxel.size[0], voxel.size[1], height], bounds);
      return [column.position[0], -0.86 + column.size[1] + 0.008, column.position[2]];
    });
    corners.forEach((point) => positions.push(...point));
    for (let index = 0; index < 4; index += 1) colors.push(...scalarColor(voxel.value, trace.valueRange));
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });

  return {
    kind: "mesh",
    id: "volume-top-wire",
    objectId: "volume",
    positions,
    indices,
    colors,
    fill: false,
    material: { vertexColors: true },
    wireframe: { color: "#ecfeff", opacity: 0.22 },
  };
}

function surfaceAnalysisLayers(trace: SurfaceIntegralTrace, bounds: SurfaceBounds): VisualLayerSpec[] {
  const peak = maxBy(trace.cells, (cell) => cell.value);
  const valley = minBy(trace.cells, (cell) => cell.value);
  const contribution = maxBy(trace.cells, (cell) => Math.abs(cell.contribution));
  if (!peak || !valley || !contribution) return [];

  const contributionPoint = normalizeSurfacePoint(contribution.sample, bounds);
  const layers: VisualLayerSpec[] = [
    markerLayer("surface-max", normalizeSurfacePoint(peak.sample, bounds), "#facc15", "max f"),
    markerLayer("surface-min", normalizeSurfacePoint(valley.sample, bounds), "#38bdf8", "min f"),
    {
    kind: "ring",
      id: "surface-contribution-ring",
      objectId: "surface",
      position: contributionPoint,
      color: "#fb7185",
      radius: 0.09,
      tubeRadius: 0.006,
    },
    {
      kind: "label",
      id: "surface-contribution-label",
      objectId: "surface",
      text: `max dA ${contribution.contribution.toExponential(2)}`,
      position: [contributionPoint[0], contributionPoint[1] + 0.18, contributionPoint[2]],
      color: "#fb7185",
    },
  ];
  const gradient = estimateSurfaceGradient(trace, peak.index);
  const length = Math.hypot(gradient[0], gradient[1]);
  if (length > 1e-9) {
    const point = normalizeSurfacePoint(peak.sample, bounds);
    layers.push({
      kind: "arrow",
      id: "surface-gradient",
      objectId: "surface",
      from: [point[0], point[1] + 0.11, point[2]],
      to: [point[0] + (gradient[0] / length) * 0.28, point[1] + 0.11, point[2] + (gradient[1] / length) * 0.28],
      color: "#facc15",
      opacity: 0.9,
    });
  }
  return layers;
}

function volumeAnalysisLayers(trace: VolumeIntegralTrace, bounds: VolumeBounds): VisualLayerSpec[] {
  const tallest = maxBy(trace.voxels, (voxel) => voxel.value);
  const contribution = maxBy(trace.voxels, (voxel) => Math.abs(voxel.contribution));
  if (!tallest || !contribution) return [];

  const tallestColumn = normalizeVolumeColumn(tallest.center, tallest.size, bounds);
  const top: VisualVec3 = [
    tallestColumn.position[0],
    tallestColumn.position[1] + tallestColumn.size[1] / 2,
    tallestColumn.position[2],
  ];
  const layers: VisualLayerSpec[] = [
    markerLayer("volume-max", top, "#fde047", `max h ${tallest.value.toFixed(2)}`),
    {
    kind: "box-outline",
      id: "volume-max-outline",
      objectId: "volume",
      position: tallestColumn.position,
      size: [tallestColumn.size[0] * 1.06, tallestColumn.size[1] * 1.02, tallestColumn.size[2] * 1.06],
      color: "#facc15",
      opacity: 0.9,
    },
  ];

  const contributionColumn = normalizeVolumeColumn(contribution.center, contribution.size, bounds);
  const contributionTop: VisualVec3 = [
    contributionColumn.position[0],
    contributionColumn.position[1] + contributionColumn.size[1] / 2,
    contributionColumn.position[2],
  ];
  const sameColumn =
    Math.abs(contributionTop[0] - top[0]) < 1e-6 &&
    Math.abs(contributionTop[1] - top[1]) < 1e-6 &&
    Math.abs(contributionTop[2] - top[2]) < 1e-6;
  if (!sameColumn) {
    layers.push(
      {
        kind: "ring",
        id: "volume-contribution-ring",
        objectId: "volume",
        position: contributionTop,
        color: "#fb7185",
        radius: 0.09,
        tubeRadius: 0.006,
      },
      {
        kind: "label",
        id: "volume-contribution-label",
        objectId: "volume",
        text: `max h*dA ${contribution.contribution.toExponential(2)}`,
        position: [contributionTop[0] + 0.16, contributionTop[1] + 0.19, contributionTop[2] - 0.05],
        color: "#fb7185",
      },
    );
  }
  return layers;
}

function markerLayer(id: string, position: VisualVec3, color: string, label: string): VisualLayerSpec {
  return {
    kind: "marker",
    id,
    objectId: id.startsWith("volume") ? "volume" : "surface",
    position,
    color,
    radius: 0.042,
    label,
    labelOffset: [0.13, 0.19, 0.04],
  };
}

function volumeFrameLayer(): VisualLayerSpec {
  const height = 1.72;
  const baseY = -0.86;
  return {
    kind: "lines",
    id: "volume-frame",
    objectId: "volume",
    segments: boxSegments([0, baseY + height / 2, 0], [2.35, height, 2.35]),
    color: "#dbeafe",
    opacity: 0.34,
  };
}

function baseGridLayer(id: string, size: number): VisualLayerSpec {
  return {
    kind: "grid",
    id,
    objectId: "grid",
    size,
    divisions: 12,
    color: "#38616d",
    opacity: 0.22,
    y: -0.72,
  };
}

function surfaceBounds(trace: SurfaceIntegralTrace): SurfaceBounds {
  const x = trace.cells.flatMap((cell) => [cell.x0, cell.x1]);
  const y = trace.cells.flatMap((cell) => [cell.y0, cell.y1]);
  const z = trace.cells.flatMap((cell) => cell.corners.map((corner) => corner[2]));
  return {
    xMin: Math.min(...x),
    xMax: Math.max(...x),
    yMin: Math.min(...y),
    yMax: Math.max(...y),
    zMin: Math.min(...z),
    zMax: Math.max(...z),
  };
}

function normalizeSurfacePoint(point: [number, number, number], bounds: SurfaceBounds): VisualVec3 {
  const x = ((point[0] - bounds.xMin) / Math.max(bounds.xMax - bounds.xMin, 1e-12) - 0.5) * 2.4;
  const y = ((point[1] - bounds.yMin) / Math.max(bounds.yMax - bounds.yMin, 1e-12) - 0.5) * 2.4;
  const z = ((point[2] - bounds.zMin) / Math.max(bounds.zMax - bounds.zMin, 1e-12) - 0.5) * 1.18;
  return [x, z, y];
}

function volumeColumnBounds(trace: VolumeIntegralTrace): VolumeBounds {
  const xMin = Math.min(...trace.voxels.map((voxel) => voxel.center[0] - voxel.size[0] / 2));
  const xMax = Math.max(...trace.voxels.map((voxel) => voxel.center[0] + voxel.size[0] / 2));
  const yMin = Math.min(...trace.voxels.map((voxel) => voxel.center[1] - voxel.size[1] / 2));
  const yMax = Math.max(...trace.voxels.map((voxel) => voxel.center[1] + voxel.size[1] / 2));
  const maxHeight = Math.max(...trace.voxels.map((voxel) => voxel.size[2]), 1e-9);
  return { xMin, xMax, yMin, yMax, maxHeight };
}

function normalizeVolumeColumn(center: [number, number, number], size: [number, number, number], bounds: VolumeBounds) {
  const x = ((center[0] - bounds.xMin) / Math.max(bounds.xMax - bounds.xMin, 1e-12) - 0.5) * 2.35;
  const z = ((center[1] - bounds.yMin) / Math.max(bounds.yMax - bounds.yMin, 1e-12) - 0.5) * 2.35;
  const height = Math.max(0.012, (size[2] / bounds.maxHeight) * 1.72);
  const sx = (size[0] / Math.max(bounds.xMax - bounds.xMin, 1e-12)) * 2.35;
  const sz = (size[1] / Math.max(bounds.yMax - bounds.yMin, 1e-12)) * 2.35;
  return {
    position: [x, -0.86 + height / 2, z] as VisualVec3,
    size: [sx, height, sz] as VisualVec3,
  };
}

function estimateSurfaceGradient(trace: SurfaceIntegralTrace, index: number): [number, number] {
  const cell = trace.cells[index];
  if (!cell) return [0, 0];
  const sameRow = trace.cells.filter((item) => Math.abs(item.sample[1] - cell.sample[1]) < 1e-9);
  const sameColumn = trace.cells.filter((item) => Math.abs(item.sample[0] - cell.sample[0]) < 1e-9);
  const left = sameRow.filter((item) => item.sample[0] < cell.sample[0]).at(-1);
  const right = sameRow.find((item) => item.sample[0] > cell.sample[0]);
  const down = sameColumn.filter((item) => item.sample[1] < cell.sample[1]).at(-1);
  const up = sameColumn.find((item) => item.sample[1] > cell.sample[1]);
  const gx = left && right ? (right.value - left.value) / Math.max(right.sample[0] - left.sample[0], 1e-12) : 0;
  const gy = down && up ? (up.value - down.value) / Math.max(up.sample[1] - down.sample[1], 1e-12) : 0;
  return [gx, gy];
}

function maxBy<T>(items: T[], value: (item: T) => number) {
  return items.reduce<T | null>((best, item) => (best === null || value(item) > value(best) ? item : best), null);
}

function minBy<T>(items: T[], value: (item: T) => number) {
  return items.reduce<T | null>((best, item) => (best === null || value(item) < value(best) ? item : best), null);
}
