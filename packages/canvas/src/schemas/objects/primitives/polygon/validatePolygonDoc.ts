import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import {
	validateFillStyleFields,
	validatePolyFields,
	validateStrokeStyleFields,
} from "../../utils/validateDocUtils";

export const validatePolygonDoc: ObjectDocValidateFn = (o, path) => [
	...validatePolyFields(o, path),
	...validateStrokeStyleFields(o, path),
	...validateFillStyleFields(o, path),
];
