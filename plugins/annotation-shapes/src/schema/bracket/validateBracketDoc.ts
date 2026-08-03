import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { BracketFeatures } from "./BracketDoc";
import { validateGroupMarkerDirection } from "../shared/validateGroupMarkerFields";

/**
 * Validates a BracketDoc (Frame-family shared logic + direction). There is no
 * tipPosition to check: the bracket's label is pinned to the middle of its spine.
 */
export const validateBracketDoc: ObjectDocValidateFn = createFrameDocValidator(
	BracketFeatures,
	validateGroupMarkerDirection,
);
