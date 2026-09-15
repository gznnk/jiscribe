import { POLYGON_MIN_POINTS } from "./PolygonDoc";
import type { ObjectDocValidateFn } from "../../../../plugin/ObjectDocValidatorRegistry";
import {
	validateFillStyleFields,
	validatePolyFields,
	validateStrokeStyleFields,
} from "../../utils/validateDocUtils";

export const validatePolygonDoc: ObjectDocValidateFn = (o, path) => [
	...validatePolyFields(o, path, POLYGON_MIN_POINTS),
	...validateStrokeStyleFields(o, path),
	...validateFillStyleFields(o, path),
];
