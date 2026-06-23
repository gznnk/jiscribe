import { isString } from "@workspace/basic-validators";

import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import {
	validateRequiredNumber,
	validateTransformFields,
} from "../../utils/validateDocUtils";

export const validateSvgDoc: ObjectDocValidateFn = (o, path) => [
	...validateRequiredNumber(o, path, "x"),
	...validateRequiredNumber(o, path, "y"),
	...validateRequiredNumber(o, path, "width", 0),
	...validateRequiredNumber(o, path, "height", 0),
	...(isString(o.svgText)
		? []
		: [{ path: `${path}.svgText`, message: "must be a string" }]),
	...validateTransformFields(o, path),
];
