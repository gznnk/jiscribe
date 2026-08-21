import type { ObjectDocValidateFn } from "../../../../plugin/ObjectDocValidatorRegistry";
import {
	validateArrowFields,
	validatePolyFields,
	validateStrokeStyleFields,
} from "../../utils/validateDocUtils";

export const validatePolylineDoc: ObjectDocValidateFn = (o, path) => [
	...validatePolyFields(o, path),
	...validateStrokeStyleFields(o, path),
	...validateArrowFields(o, path),
];
