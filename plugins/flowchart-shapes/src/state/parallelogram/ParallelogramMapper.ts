import { createFrameMapper } from "@workspace/canvas-sdk";

import type { ParallelogramState } from "./ParallelogramState";
import type { ParallelogramDoc } from "../../schema/parallelogram/ParallelogramDoc";
import { ParallelogramFeatures } from "../../schema/parallelogram/ParallelogramDoc";

/** ParallelogramDoc ↔ ParallelogramState conversion (Frame-family shared logic generated from features). */
export const { toState: parallelogramToState, toDoc: parallelogramToDoc } =
	createFrameMapper<ParallelogramDoc, ParallelogramState>(
		ParallelogramFeatures,
	);
