import { createFrameMapper } from "@workspace/canvas/unstable";

import type { CalloutState } from "./CalloutState";
import type { CalloutDoc } from "../../schema/callout/CalloutDoc";
import { CalloutFeatures } from "../../schema/callout/CalloutDoc";

/** CalloutDoc ↔ CalloutState conversion (Frame-family shared logic generated from features). */
export const { toState: calloutToState, toDoc: calloutToDoc } =
	createFrameMapper<CalloutDoc, CalloutState>(CalloutFeatures, ["tail"]);
