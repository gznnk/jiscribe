import type { RectState } from "./RectState";
import type { RectDoc } from "../../../../schemas/objects/primitives/rect/RectDoc";
import { RectFeatures } from "../../../../schemas/objects/primitives/rect/RectDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** RectDoc ↔ RectState conversion (Frame-family common logic generated from features). */
export const { toState: rectToState, toDoc: rectToDoc } = createFrameMapper<
	RectDoc,
	RectState
>(RectFeatures);
