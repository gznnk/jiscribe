import type { DelayState } from "./DelayState";
import type { DelayDoc } from "../../../../schemas/objects/primitives/delay/DelayDoc";
import { DelayFeatures } from "../../../../schemas/objects/primitives/delay/DelayDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** DelayDoc <-> DelayState conversion (Frame-family shared logic generated from features). */
export const { toState: delayToState, toDoc: delayToDoc } = createFrameMapper<
	DelayDoc,
	DelayState
>(DelayFeatures);
