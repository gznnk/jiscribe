import type { ParallelogramState } from "./ParallelogramState";
import type { ParallelogramDoc } from "../../../../schemas/objects/flowchart/parallelogram/ParallelogramDoc";
import { ParallelogramFeatures } from "../../../../schemas/objects/flowchart/parallelogram/ParallelogramDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** ParallelogramDoc ↔ ParallelogramState conversion (Frame-family shared logic generated from features). */
export const { toState: parallelogramToState, toDoc: parallelogramToDoc } =
	createFrameMapper<ParallelogramDoc, ParallelogramState>(
		ParallelogramFeatures,
	);
