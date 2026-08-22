import { RectFeatures } from "./RectDoc";
import { calcFullBoxTextRegion } from "../../../../plugin/ObjectDocTextRegion";
import type { ObjectDocValidateFn } from "../../../../plugin/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/**
 * Validates a RectDoc (Frame-family shared logic generated from features). The
 * text region is handed over as well, being what makes `height` optional here —
 * it must stay the one the definition registers.
 */
export const validateRectDoc: ObjectDocValidateFn = createFrameDocValidator(
	RectFeatures,
	undefined,
	{ textRegion: calcFullBoxTextRegion },
);
