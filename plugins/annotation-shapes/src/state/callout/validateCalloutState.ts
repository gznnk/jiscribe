import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas/unstable";

import {
	CalloutFeatures,
	isCalloutTail,
} from "../../schema/callout/CalloutDoc";

/** Validates CalloutState (Frame-family common logic + optional tail). */
export const isValidCalloutState: ObjectStateValidator =
	createFrameStateValidator(
		CalloutFeatures,
		(o) => o.tail === undefined || isCalloutTail(o.tail),
	);
