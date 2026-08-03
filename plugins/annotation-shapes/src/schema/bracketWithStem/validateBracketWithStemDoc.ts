import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { BracketWithStemFeatures } from "./BracketWithStemDoc";
import { validateGroupMarkerTipFields } from "../shared/validateGroupMarkerFields";

/** Validates a BracketWithStemDoc (Frame-family shared logic + direction / tipPosition). */
export const validateBracketWithStemDoc: ObjectDocValidateFn =
	createFrameDocValidator(
		BracketWithStemFeatures,
		validateGroupMarkerTipFields,
	);
