import { createFrameMapper } from "@workspace/canvas/unstable";

import type { LoopLimitState } from "./LoopLimitState";
import type { LoopLimitDoc } from "../../schema/loopLimit/LoopLimitDoc";
import { LoopLimitFeatures } from "../../schema/loopLimit/LoopLimitDoc";

/** LoopLimitDoc ↔ LoopLimitState conversion (Frame-family shared logic generated from features). */
export const { toState: loopLimitToState, toDoc: loopLimitToDoc } =
	createFrameMapper<LoopLimitDoc, LoopLimitState>(LoopLimitFeatures);
