import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import {
	validateFillStyleFields,
	validateRequiredNumber,
	validateStrokeStyleFields,
	validateTextStyleFields,
	validateTransformFields,
} from "../../utils/validateDocUtils";

export const validateEllipseDoc: ObjectDocValidateFn = (o, path) => [
	...validateRequiredNumber(o, path, "cx"),
	...validateRequiredNumber(o, path, "cy"),
	...validateRequiredNumber(o, path, "rx", 0),
	...validateRequiredNumber(o, path, "ry", 0),
	...validateTransformFields(o, path),
	...validateStrokeStyleFields(o, path),
	...validateFillStyleFields(o, path),
	...validateTextStyleFields(o, path),
];
