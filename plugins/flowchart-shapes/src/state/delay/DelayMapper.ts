import { createFrameMapper } from "@workspace/canvas/unstable";

import type { DelayState } from "./DelayState";
import type { DelayDoc } from "../../schema/delay/DelayDoc";
import { DelayFeatures } from "../../schema/delay/DelayDoc";

/** DelayDoc <-> DelayState conversion (Frame-family shared logic generated from features). */
export const { toState: delayToState, toDoc: delayToDoc } = createFrameMapper<
	DelayDoc,
	DelayState
>(DelayFeatures);
