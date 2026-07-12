import type { CrossState } from "./CrossState";
import type { CrossDoc } from "../../../../schemas/objects/flowchart/cross/CrossDoc";
import { CrossFeatures } from "../../../../schemas/objects/flowchart/cross/CrossDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** CrossDoc <-> CrossState conversion (Frame-family shared logic generated from features). */
export const { toState: crossToState, toDoc: crossToDoc } = createFrameMapper<
	CrossDoc,
	CrossState
>(CrossFeatures);
