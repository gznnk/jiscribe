import {
	CalloutFeatures,
	isCalloutTail,
} from "../../../../schemas/objects/annotations/callout/CalloutDoc";
import type { ObjectStateValidator } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates CalloutState (Frame-family common logic + optional tail). */
export const isValidCalloutState: ObjectStateValidator =
	createFrameStateValidator(
		CalloutFeatures,
		(o) => o.tail === undefined || isCalloutTail(o.tail),
	);
