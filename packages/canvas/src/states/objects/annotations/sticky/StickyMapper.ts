import type { StickyState } from "./StickyState";
import type { StickyDoc } from "../../../../schemas/objects/annotations/sticky/StickyDoc";
import { StickyFeatures } from "../../../../schemas/objects/annotations/sticky/StickyDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** StickyDoc ↔ StickyState conversion (Frame-family shared logic generated from features). */
export const { toState: stickyToState, toDoc: stickyToDoc } = createFrameMapper<
	StickyDoc,
	StickyState
>(StickyFeatures);
