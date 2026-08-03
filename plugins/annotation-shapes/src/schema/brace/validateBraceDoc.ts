import type { ObjectDocValidateFn } from "@workspace/canvas/unstable-doc";
import { createFrameDocValidator } from "@workspace/canvas/unstable-doc";

import { BraceFeatures } from "./BraceDoc";
import { validateGroupMarkerTipFields } from "../shared/validateGroupMarkerFields";

/** Validates a BraceDoc (Frame-family shared logic + direction / tipPosition). */
export const validateBraceDoc: ObjectDocValidateFn = createFrameDocValidator(
	BraceFeatures,
	validateGroupMarkerTipFields,
);
