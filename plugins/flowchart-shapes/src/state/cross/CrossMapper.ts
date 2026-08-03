import { createFrameMapper } from "@workspace/canvas-sdk";

import type { CrossState } from "./CrossState";
import type { CrossDoc } from "../../schema/cross/CrossDoc";
import { CrossFeatures } from "../../schema/cross/CrossDoc";

/** CrossDoc <-> CrossState conversion (Frame-family shared logic generated from features). */
export const { toState: crossToState, toDoc: crossToDoc } = createFrameMapper<
	CrossDoc,
	CrossState
>(CrossFeatures);
