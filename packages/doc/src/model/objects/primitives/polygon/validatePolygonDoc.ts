import { POLYGON_MIN_POINTS } from "./PolygonDoc";
import type { ObjectDocValidateFn } from "../../../../plugin/ObjectDocValidateFn";
import { validatePolyFields } from "../../validators/validatePolyFields";
import {
	validateFillStyleFields,
	validateStrokeStyleFields,
} from "../../validators/validateStyleFields";

export const validatePolygonDoc: ObjectDocValidateFn = (o, path) => [
	...validatePolyFields(o, path, POLYGON_MIN_POINTS),
	...validateStrokeStyleFields(o, path),
	...validateFillStyleFields(o, path),
];
