import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { BraceFeatures } from "./BraceDoc";
import { validateGroupMarkerTipFields } from "../shared/validateGroupMarkerFields";

/** Validates a BraceDoc (Frame-family shared logic + direction / tipPosition). */
export const validateBraceDoc: ObjectDocValidateFn = createFrameDocValidator(
	BraceFeatures,
	validateGroupMarkerTipFields,
);
