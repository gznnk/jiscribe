import { isString } from "@jiscribe/basic-validators";

import { ImageFeatures } from "./ImageDoc";
import type { ObjectDocValidateFn } from "../../../../plugin/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/**
 * Validates the Image-specific field src (required non-empty string).
 *
 * Beyond being a name at all, the path rule belongs to whoever resolves the
 * file (`splitDocRelativePath`), so a document naming a file that is missing or
 * outside the directory still parses and draws as a placeholder.
 */
const validateImageSrc: ObjectDocValidateFn = (o, path) => {
	if (!isString(o.src)) {
		return [{ path: `${path}.src`, message: "must be a string" }];
	}
	if (o.src === "") {
		return [{ path: `${path}.src`, message: "must name a file" }];
	}
	return [];
};

/** Validates an ImageDoc (shared Frame validation + src, generated from features). */
export const validateImageDoc: ObjectDocValidateFn = createFrameDocValidator(
	ImageFeatures,
	validateImageSrc,
);
