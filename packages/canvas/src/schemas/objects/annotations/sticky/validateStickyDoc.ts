import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import {
	validateFillStyleFields,
	validateRequiredNumber,
	validateTextStyleFields,
	validateTransformFields,
} from "../../utils/validateDocUtils";

export const validateStickyDoc: ObjectDocValidateFn = (o, path) => [
	...validateRequiredNumber(o, path, "x"),
	...validateRequiredNumber(o, path, "y"),
	...validateRequiredNumber(o, path, "width", 0),
	...validateRequiredNumber(o, path, "height", 0),
	...validateTransformFields(o, path),
	...validateFillStyleFields(o, path),
	...validateTextStyleFields(o, path),
];
