import { isNumber } from "@workspace/basic-validators";

import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import {
	validateFillStyleFields,
	validateRadiusStyleFields,
	validateStrokeStyleFields,
	validateTextStyleFields,
	validateTransformFields,
} from "../../utils/validateDocUtils";

export const validateRectDoc: ObjectDocValidateFn = (o, path) => [
	...(isNumber(o.x) ? [] : [{ path: `${path}.x`, message: "must be a number" }]),
	...(isNumber(o.y) ? [] : [{ path: `${path}.y`, message: "must be a number" }]),
	...(isNumber(o.width) ? [] : [{ path: `${path}.width`, message: "must be a number" }]),
	...(isNumber(o.height) ? [] : [{ path: `${path}.height`, message: "must be a number" }]),
	...validateTransformFields(o, path),
	...validateStrokeStyleFields(o, path),
	...validateFillStyleFields(o, path),
	...validateTextStyleFields(o, path),
	...validateRadiusStyleFields(o, path),
];
