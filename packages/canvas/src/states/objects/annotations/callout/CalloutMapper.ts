import type { CalloutState } from "./CalloutState";
import type { CalloutDoc } from "../../../../schemas/objects/annotations/callout/CalloutDoc";
import { CalloutFeatures } from "../../../../schemas/objects/annotations/callout/CalloutDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** CalloutDoc ↔ CalloutState conversion (Frame-family shared logic generated from features). */
export const { toState: calloutToState, toDoc: calloutToDoc } =
	createFrameMapper<CalloutDoc, CalloutState>(CalloutFeatures);
