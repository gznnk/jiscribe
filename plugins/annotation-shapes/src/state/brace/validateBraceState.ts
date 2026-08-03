import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas/unstable";

import {
	BraceFeatures,
	isBraceDirection,
	isBraceTipPosition,
} from "../../schema/brace/BraceDoc";

/** Validates BraceState (Frame-family common logic + optional direction / tipPosition). */
export const isValidBraceState: ObjectStateValidator =
	createFrameStateValidator(
		BraceFeatures,
		(o) =>
			(o.direction === undefined || isBraceDirection(o.direction)) &&
			(o.tipPosition === undefined || isBraceTipPosition(o.tipPosition)),
	);
