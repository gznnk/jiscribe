import { TextFeatures } from "./TextDoc";
import type { ObjectDocValidateFn } from "../../../../plugin/ObjectDocValidatorRegistry";
import { isTextLayout } from "../../types/TextLayout";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";
import { validateRequiredNumber } from "../../utils/validateDocUtils";

/**
 * Validates the layout mode and the width that goes with it. The block layout is
 * the one that stores a width, and it cannot do without one: the wrapping — and
 * with it the measured height — has nothing to happen in. The label layout
 * measures its own box, so a width on it is refused rather than carried: nothing
 * reads it, and a number left sitting there would silently become the wrap
 * width the day the layout is switched.
 */
const validateTextLayoutFields: ObjectDocValidateFn = (o, path) => {
	if (o.textLayout !== undefined && !isTextLayout(o.textLayout)) {
		return [
			{ path: `${path}.textLayout`, message: "must be one of: label, block" },
		];
	}
	if (o.textLayout !== "block") {
		if (o.width !== undefined) {
			return [
				{
					path: `${path}.width`,
					message:
						'is stored by textLayout "block" alone; set that layout with it, or drop the width',
				},
			];
		}
		return [];
	}
	if (o.width === undefined) {
		return [
			{
				path: `${path}.width`,
				message: 'is required when textLayout is "block"',
			},
		];
	}
	return validateRequiredNumber(o, path, "width", 0);
};

/** Validates a TextDoc (Frame-family shared logic generated from features; `point` checks x / y only). */
export const validateTextDoc: ObjectDocValidateFn = createFrameDocValidator(
	TextFeatures,
	validateTextLayoutFields,
);
