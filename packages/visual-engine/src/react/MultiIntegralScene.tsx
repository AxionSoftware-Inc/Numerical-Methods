"use client";

import { useMemo } from "react";
import type {
  SurfaceIntegralTrace,
  VolumeIntegralTrace,
} from "@methodslab/methods-engine/core";
import {
  createSurfaceIntegralSceneSpec,
  createVolumeIntegralSceneSpec,
} from "../core";
import { VisualScene } from "./VisualScene";

export type MultiIntegralSceneProps =
  | {
      kind: "surface";
      trace: SurfaceIntegralTrace;
      showAnalysis?: boolean;
      showGrid?: boolean;
      cameraMode?: "preserve" | "follow-spec";
      className?: string;
    }
  | {
      kind: "volume";
      trace: VolumeIntegralTrace;
      showAnalysis?: boolean;
      showGrid?: boolean;
      showFrame?: boolean;
      cameraMode?: "preserve" | "follow-spec";
      className?: string;
    };

export function MultiIntegralScene(props: MultiIntegralSceneProps) {
  const {
    kind,
    trace,
    showAnalysis,
    showGrid,
    cameraMode = "preserve",
    className,
  } = props;

  const showFrame = kind === "volume" ? props.showFrame : undefined;

  const spec = useMemo(() => {
    if (kind === "surface") {
      return createSurfaceIntegralSceneSpec(trace, {
        showAnalysis,
        showGrid,
      });
    }

    return createVolumeIntegralSceneSpec(trace, {
      showAnalysis,
      showGrid,
      showFrame,
    });
  }, [kind, trace, showAnalysis, showGrid, showFrame]);

  return (
    <VisualScene
      cameraResetKey={spec.id}
      cameraMode={cameraMode}
      className={className}
      spec={spec}
    />
  );
}