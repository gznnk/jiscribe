import { isString } from "@jiscribe/basic-validators";

import { SvgFeatures } from "./SvgDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Validates the Svg-specific field svgText (required string). */
const validateSvgText: ObjectDocValidateFn = (o, path) =>
	isString(o.svgText)
		? []
		: [{ path: `${path}.svgText`, message: "must be a string" }];

/** Validates an SvgDoc (shared Frame validation + svgText, generated from features). */
export const validateSvgDoc: ObjectDocValidateFn = createFrameDocValidator(
	SvgFeatures,
	validateSvgText,
);
