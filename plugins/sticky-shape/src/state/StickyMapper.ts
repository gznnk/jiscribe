import { createFrameMapper } from "@workspace/canvas/unstable";

import type { StickyState } from "./StickyState";
import type { StickyDoc } from "../schema/StickyDoc";
import { StickyFeatures } from "../schema/StickyDoc";

/** StickyDoc ↔ StickyState conversion (Frame-family shared logic generated from features). */
export const { toState: stickyToState, toDoc: stickyToDoc } = createFrameMapper<
	StickyDoc,
	StickyState
>(StickyFeatures);
