import type { LoopLimitState } from "./LoopLimitState";
import type { LoopLimitDoc } from "../../../../schemas/objects/flowchart/loopLimit/LoopLimitDoc";
import { LoopLimitFeatures } from "../../../../schemas/objects/flowchart/loopLimit/LoopLimitDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** LoopLimitDoc ↔ LoopLimitState conversion (Frame-family shared logic generated from features). */
export const { toState: loopLimitToState, toDoc: loopLimitToDoc } =
	createFrameMapper<LoopLimitDoc, LoopLimitState>(LoopLimitFeatures);
