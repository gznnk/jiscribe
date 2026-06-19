import { isNumber } from "@workspace/basic-validators";

import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import {
	validateFillStyleFields,
	validateStrokeStyleFields,
	validateTextStyleFields,
	validateTransformFields,
} from "../../utils/validateDocUtils";

export const validateEllipseDoc: ObjectDocValidateFn = (o, path) => [
	...(isNumber(o.cx)
		? []
		: [{ path: `${path}.cx`, message: "must be a number" }]),
	...(isNumber(o.cy)
		? []
		: [{ path: `${path}.cy`, message: "must be a number" }]),
	...(isNumber(o.rx)
		? []
		: [{ path: `${path}.rx`, message: "must be a number" }]),
	...(isNumber(o.ry)
		? []
		: [{ path: `${path}.ry`, message: "must be a number" }]),
	...validateTransformFields(o, path),
	...validateStrokeStyleFields(o, path),
	...validateFillStyleFields(o, path),
	...validateTextStyleFields(o, path),
];
