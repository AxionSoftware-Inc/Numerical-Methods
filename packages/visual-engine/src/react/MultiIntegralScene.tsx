"use client";

import { useMemo } from "react";
import type { SurfaceIntegralTrace, VolumeIntegralTrace } from "@methodslab/methods-engine/core";
import { createSurfaceIntegralSceneSpec, createVolumeIntegralSceneSpec } from "../core";
import { VisualScene } from "./VisualScene";

export type MultiIntegralSceneProps =
  | {
      kind: "surface";
      trace: SurfaceIntegralTrace;
      showAnalysis?: boolean;
      className?: string;
    }
  | {
      kind: "volume";
      trace: VolumeIntegralTrace;
      showAnalysis?: boolean;
      className?: string;
    };

export function MultiIntegralScene(props: MultiIntegralSceneProps) {
  const spec = useMemo(() => {
    if (props.kind === "surface") {
      return createSurfaceIntegralSceneSpec(props.trace, { showAnalysis: props.showAnalysis });
    }
    return createVolumeIntegralSceneSpec(props.trace, { showAnalysis: props.showAnalysis });
  }, [props]);

  return <VisualScene cameraResetKey={props.kind} className={props.className} spec={spec} />;
}
