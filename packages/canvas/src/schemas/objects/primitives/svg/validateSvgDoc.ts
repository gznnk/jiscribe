import { isNumber, isString } from "@workspace/basic-validators";

import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { validateTransformFields } from "../../utils/validateDocUtils";

export const validateSvgDoc: ObjectDocValidateFn = (o, path) => [
	...(isNumber(o.x)
		? []
		: [{ path: `${path}.x`, message: "must be a number" }]),
	...(isNumber(o.y)
		? []
		: [{ path: `${path}.y`, message: "must be a number" }]),
	...(isNumber(o.width)
		? []
		: [{ path: `${path}.width`, message: "must be a number" }]),
	...(isNumber(o.height)
		? []
		: [{ path: `${path}.height`, message: "must be a number" }]),
	...(isString(o.svgText)
		? []
		: [{ path: `${path}.svgText`, message: "must be a string" }]),
	...validateTransformFields(o, path),
];
