import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import {
	validateFillStyleFields,
	validateRequiredNumber,
	validateStrokeStyleFields,
	validateTextStyleFields,
	validateTransformFields,
} from "../../utils/validateDocUtils";

export const validateDiamondDoc: ObjectDocValidateFn = (o, path) => [
	...validateRequiredNumber(o, path, "x"),
	...validateRequiredNumber(o, path, "y"),
	...validateRequiredNumber(o, path, "width", 0),
	...validateRequiredNumber(o, path, "height", 0),
	...validateTransformFields(o, path),
	...validateStrokeStyleFields(o, path),
	...validateFillStyleFields(o, path),
	...validateTextStyleFields(o, path),
];
