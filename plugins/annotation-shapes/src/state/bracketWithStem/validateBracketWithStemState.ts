import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas/unstable";

import { BracketWithStemFeatures } from "../../schema/bracketWithStem/BracketWithStemDoc";
import { isValidGroupMarkerTipFields } from "../shared/isValidGroupMarkerFields";

/** Validates BracketWithStemState (Frame-family common logic + optional direction / tipPosition). */
export const isValidBracketWithStemState: ObjectStateValidator =
	createFrameStateValidator(
		BracketWithStemFeatures,
		isValidGroupMarkerTipFields,
	);
