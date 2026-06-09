import type { SurfaceIntegralTrace, VolumeIntegralTrace } from "@methodslab/methods-engine/core";
import { scalarColor, shade } from "./color";
import { addQuad, boxSegments } from "./geometry";
import type { VisualLayerSpec, VisualSceneSpec, VisualVec3 } from "./types";
import {
  createBoundingBoxLayer,
  createGridLayer,
  createLabelLayer,
  createMarkerLayer,
} from "./scene-objects";

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

type NormalizedColumn = {
  position: VisualVec3;
  size: VisualVec3;
};

export type MultiIntegralSceneOptions = {
  showAnalysis?: boolean;
  showGrid?: boolean;
  showFrame?: boolean;
};

export function createSurfaceIntegralSceneSpec(
  trace: SurfaceIntegralTrace,
  options: MultiIntegralSceneOptions = {},
): VisualSceneSpec {
  const bounds = surfaceBounds(trace);

  const layers: VisualLayerSpec[] = [
    surfaceMeshLayer(trace, bounds),
    surfaceSamplesLayer(trace, bounds),
  ];

  if (options.showAnalysis ?? true) {
    layers.push(...surfaceAnalysisLayers(trace, bounds));
  }

  if (options.showGrid ?? true) {
    layers.push(createGridLayer("surface-grid", { size: 2.45, y: -0.78 }));
  }

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

export function createVolumeIntegralSceneSpec(
  trace: VolumeIntegralTrace,
  options: MultiIntegralSceneOptions = {},
): VisualSceneSpec {
  const bounds = volumeColumnBounds(trace);

  const layers: VisualLayerSpec[] = [
    volumeColumnsLayer(trace, bounds),
    volumeTopWireLayer(trace, bounds),
  ];

  if (options.showAnalysis ?? true) {
    layers.push(...volumeAnalysisLayers(trace, bounds));
  }

  if (options.showFrame ?? true) {
    layers.push(volumeFrameLayer());
  }

  if (options.showGrid ?? true) {
    layers.push(createGridLayer("volume-grid", { size: 2.55, y: -0.86 }));
  }

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
    exposure: 1.22,
    ambientLight: 1.08,
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
      positions.push(...point);
      colors.push(...scalarColor(cell.value, trace.valueRange));
    });

    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });

  return {
    kind: "mesh",
    id: "surface",
    objectId: "surface",
    name: "Surface mesh",
    positions,
    indices,
    colors,
    material: {
      vertexColors: true,
      doubleSided: true,
      shading: "standard",
      roughness: 0.7,
      metalness: 0.02,
    },
    wireframe: {
      color: "#e0f2fe",
      opacity: 0.16,
    },
    metadata: {
      role: "primary-surface",
      cellCount: trace.cells.length,
    },
  };
}

function surfaceSamplesLayer(trace: SurfaceIntegralTrace, bounds: SurfaceBounds): VisualLayerSpec {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const sampleStride = Math.max(1, Math.floor(trace.cells.length / 110));
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
    name: "Surface sample points",
    positions,
    indices,
    colors,
    material: {
      vertexColors: true,
      doubleSided: true,
      opacity: 0.82,
      transparent: true,
      depthTest: true,
    },
    metadata: {
      role: "sample-points",
      stride: sampleStride,
    },
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
    name: "Volume columns",
    positions,
    indices,
    colors,
    material: {
      vertexColors: true,
      doubleSided: true,
      shading: "standard",
      roughness: 0.72,
      metalness: 0.02,
    },
    metadata: {
      role: "volume-columns",
      voxelCount: trace.voxels.length,
    },
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

    for (let index = 0; index < 4; index += 1) {
      colors.push(...scalarColor(voxel.value, trace.valueRange));
    }

    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });

  return {
    kind: "mesh",
    id: "volume-top-wire",
    objectId: "volume",
    name: "Volume top wire",
    positions,
    indices,
    colors,
    fill: false,
    material: {
      vertexColors: true,
      depthTest: true,
    },
    wireframe: {
      color: "#ecfeff",
      opacity: 0.22,
    },
    metadata: {
      role: "top-wire",
    },
  };
}

function surfaceAnalysisLayers(trace: SurfaceIntegralTrace, bounds: SurfaceBounds): VisualLayerSpec[] {
  const peak = maxBy(trace.cells, (cell) => cell.value);
  const valley = minBy(trace.cells, (cell) => cell.value);
  const contribution = maxBy(trace.cells, (cell) => Math.abs(cell.contribution));

  if (!peak || !valley || !contribution) return [];

  const contributionPoint = normalizeSurfacePoint(contribution.sample, bounds);

  const layers: VisualLayerSpec[] = [
    createMarkerLayer("surface-max", normalizeSurfacePoint(peak.sample, bounds), "#facc15", {
      objectId: "surface-analysis",
      label: "max f",
      metadata: {
        role: "surface-max",
        value: peak.value,
      },
    }),
    createMarkerLayer("surface-min", normalizeSurfacePoint(valley.sample, bounds), "#38bdf8", {
      objectId: "surface-analysis",
      label: "min f",
      metadata: {
        role: "surface-min",
        value: valley.value,
      },
    }),
    {
      kind: "ring",
      id: "surface-contribution-ring",
      objectId: "surface-analysis",
      position: contributionPoint,
      color: "#fb7185",
      radius: 0.09,
      tubeRadius: 0.006,
      metadata: {
        role: "surface-max-contribution",
        contribution: contribution.contribution,
      },
    },
    createLabelLayer(
      "surface-contribution-label",
      `max dA ${contribution.contribution.toExponential(2)}`,
      [contributionPoint[0], contributionPoint[1] + 0.18, contributionPoint[2]],
      "#fb7185",
      {
        objectId: "surface-analysis",
        scale: 0.095,
        depthTest: false,
      },
    ),
  ];

  const gradient = estimateSurfaceGradient(trace, peak.index);
  const length = Math.hypot(gradient[0], gradient[1]);

  if (length > 1e-9) {
    const point = normalizeSurfacePoint(peak.sample, bounds);

    layers.push({
      kind: "arrow",
      id: "surface-gradient",
      objectId: "surface-analysis",
      from: [point[0], point[1] + 0.11, point[2]],
      to: [
        point[0] + (gradient[0] / length) * 0.28,
        point[1] + 0.11,
        point[2] + (gradient[1] / length) * 0.28,
      ],
      color: "#facc15",
      opacity: 0.9,
      headSize: 0.075,
      metadata: {
        role: "surface-gradient",
      },
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
    createMarkerLayer("volume-max", top, "#fde047", {
      objectId: "volume-analysis",
      label: `max h ${tallest.value.toFixed(2)}`,
      metadata: {
        role: "volume-max",
        value: tallest.value,
      },
    }),
    createBoundingBoxLayer(
      "volume-max-outline",
      tallestColumn.position,
      [
        tallestColumn.size[0] * 1.06,
        tallestColumn.size[1] * 1.02,
        tallestColumn.size[2] * 1.06,
      ],
      "#facc15",
      {
        objectId: "volume-analysis",
        opacity: 0.9,
        metadata: {
          role: "volume-max-outline",
        },
      },
    ),
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
        objectId: "volume-analysis",
        position: contributionTop,
        color: "#fb7185",
        radius: 0.09,
        tubeRadius: 0.006,
        metadata: {
          role: "volume-max-contribution",
          contribution: contribution.contribution,
        },
      },
      createLabelLayer(
        "volume-contribution-label",
        `max h*dA ${contribution.contribution.toExponential(2)}`,
        [contributionTop[0] + 0.16, contributionTop[1] + 0.19, contributionTop[2] - 0.05],
        "#fb7185",
        {
          objectId: "volume-analysis",
          scale: 0.095,
          depthTest: false,
        },
      ),
    );
  }

  return layers;
}

function volumeFrameLayer(): VisualLayerSpec {
  const height = 1.72;
  const baseY = -0.86;

  return {
    kind: "lines",
    id: "volume-frame",
    objectId: "volume-frame",
    segments: boxSegments([0, baseY + height / 2, 0], [2.35, height, 2.35]),
    color: "#dbeafe",
    opacity: 0.34,
    metadata: {
      role: "volume-frame",
    },
  };
}

function surfaceBounds(trace: SurfaceIntegralTrace): SurfaceBounds {
  const points = trace.cells.flatMap((cell) => [...cell.corners, cell.sample]);

  if (points.length === 0) {
    return {
      xMin: -1,
      xMax: 1,
      yMin: -1,
      yMax: 1,
      zMin: -1,
      zMax: 1,
    };
  }

  const xValues = points.map((point) => point[0]);
  const yValues = points.map((point) => point[1]);
  const zValues = points.map((point) => point[2]);

  return paddedSurfaceBounds({
    xMin: Math.min(...xValues),
    xMax: Math.max(...xValues),
    yMin: Math.min(...yValues),
    yMax: Math.max(...yValues),
    zMin: Math.min(...zValues),
    zMax: Math.max(...zValues),
  });
}

function paddedSurfaceBounds(bounds: SurfaceBounds): SurfaceBounds {
  const zSpan = Math.max(bounds.zMax - bounds.zMin, 1e-9);
  const zPad = zSpan * 0.08;

  return {
    ...bounds,
    zMin: bounds.zMin - zPad,
    zMax: bounds.zMax + zPad,
  };
}

function normalizeSurfacePoint(point: [number, number, number], bounds: SurfaceBounds): VisualVec3 {
  const x = ((point[0] - bounds.xMin) / Math.max(bounds.xMax - bounds.xMin, 1e-12) - 0.5) * 2.4;
  const y = ((point[1] - bounds.yMin) / Math.max(bounds.yMax - bounds.yMin, 1e-12) - 0.5) * 2.4;
  const z = ((point[2] - bounds.zMin) / Math.max(bounds.zMax - bounds.zMin, 1e-12) - 0.5) * 1.18;

  return [x, z, y];
}

function volumeColumnBounds(trace: VolumeIntegralTrace): VolumeBounds {
  if (trace.voxels.length === 0) {
    return {
      xMin: -1,
      xMax: 1,
      yMin: -1,
      yMax: 1,
      maxHeight: 1,
    };
  }

  const xMin = Math.min(...trace.voxels.map((voxel) => voxel.center[0] - voxel.size[0] / 2));
  const xMax = Math.max(...trace.voxels.map((voxel) => voxel.center[0] + voxel.size[0] / 2));
  const yMin = Math.min(...trace.voxels.map((voxel) => voxel.center[1] - voxel.size[1] / 2));
  const yMax = Math.max(...trace.voxels.map((voxel) => voxel.center[1] + voxel.size[1] / 2));
  const maxHeight = Math.max(...trace.voxels.map((voxel) => voxel.size[2]), 1e-9);

  return {
    xMin,
    xMax,
    yMin,
    yMax,
    maxHeight,
  };
}

function normalizeVolumeColumn(
  center: [number, number, number],
  size: [number, number, number],
  bounds: VolumeBounds,
): NormalizedColumn {
  const x = ((center[0] - bounds.xMin) / Math.max(bounds.xMax - bounds.xMin, 1e-12) - 0.5) * 2.35;
  const z = ((center[1] - bounds.yMin) / Math.max(bounds.yMax - bounds.yMin, 1e-12) - 0.5) * 2.35;
  const height = Math.max(0.012, (size[2] / bounds.maxHeight) * 1.72);
  const sx = (size[0] / Math.max(bounds.xMax - bounds.xMin, 1e-12)) * 2.35;
  const sz = (size[1] / Math.max(bounds.yMax - bounds.yMin, 1e-12)) * 2.35;

  return {
    position: [x, -0.86 + height / 2, z],
    size: [sx, height, sz],
  };
}

function estimateSurfaceGradient(trace: SurfaceIntegralTrace, index: number): [number, number] {
  const current = trace.cells[index];
  const next = trace.cells[index + 1];
  const previous = trace.cells[index - 1];

  if (!current) return [0, 0];

  const neighbor = next ?? previous;
  if (!neighbor) return [0, 0];

  const dx = neighbor.sample[0] - current.sample[0];
  const dy = neighbor.sample[1] - current.sample[1];
  const dz = neighbor.value - current.value;
  const length = Math.hypot(dx, dy);

  if (length < 1e-9) return [0, 0];

  return [(dx / length) * dz, (dy / length) * dz];
}

function maxBy<T>(items: T[], selector: (item: T) => number): T | undefined {
  let best: T | undefined;
  let bestValue = -Infinity;

  for (const item of items) {
    const value = selector(item);

    if (value > bestValue) {
      best = item;
      bestValue = value;
    }
  }

  return best;
}

function minBy<T>(items: T[], selector: (item: T) => number): T | undefined {
  let best: T | undefined;
  let bestValue = Infinity;

  for (const item of items) {
    const value = selector(item);

    if (value < bestValue) {
      best = item;
      bestValue = value;
    }
  }

  return best;
}