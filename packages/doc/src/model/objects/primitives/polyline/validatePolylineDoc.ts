import { POLYLINE_MIN_POINTS } from "./PolylineDoc";
import type { ObjectDocValidateFn } from "../../../../plugin/ObjectDocValidateFn";
import { validatePolyFields } from "../../validators/validatePolyFields";
import {
	validateArrowFields,
	validateStrokeStyleFields,
} from "../../validators/validateStyleFields";

export const validatePolylineDoc: ObjectDocValidateFn = (o, path) => [
	...validatePolyFields(o, path, POLYLINE_MIN_POINTS),
	...validateStrokeStyleFields(o, path),
	...validateArrowFields(o, path),
];
