import { POLYLINE_MIN_POINTS } from "./PolylineDoc";
import type { ObjectDocValidateFn } from "../../../../plugin/ObjectDocValidatorRegistry";
import {
	validateArrowFields,
	validatePolyFields,
	validateStrokeStyleFields,
} from "../../utils/validateDocUtils";

export const validatePolylineDoc: ObjectDocValidateFn = (o, path) => [
	...validatePolyFields(o, path, POLYLINE_MIN_POINTS),
	...validateStrokeStyleFields(o, path),
	...validateArrowFields(o, path),
];
