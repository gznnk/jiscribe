import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import {
	validateFillStyleFields,
	validatePolyFields,
	validateStrokeStyleFields,
} from "../../utils/validateDocUtils";

// A polygon is a closed shape, so it requires at least 3 points (the schema also enforces minItems: 3).
// Unlike a polyline, 2 points form a degenerate line segment and are rejected.
export const validatePolygonDoc: ObjectDocValidateFn = (o, path) => [
	...validatePolyFields(o, path, 3),
	...validateStrokeStyleFields(o, path),
	...validateFillStyleFields(o, path),
];
