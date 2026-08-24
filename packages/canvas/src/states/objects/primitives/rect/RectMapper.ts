import type { RectDoc } from "@jiscribe/doc/model/objects/primitives/rect/RectDoc";
import { RectFeatures } from "@jiscribe/doc/model/objects/primitives/rect/RectDoc";

import type { RectState } from "./RectState";
import { createFrameMapper } from "../../base/FrameMapper";

/** RectDoc ↔ RectState conversion (Frame-family common logic generated from features). */
export const { toState: rectToState, toDoc: rectToDoc } = createFrameMapper<
	RectDoc,
	RectState
>(RectFeatures);
