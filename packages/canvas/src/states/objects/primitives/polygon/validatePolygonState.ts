import { PolygonFeatures } from "@jiscribe/doc/model/objects/primitives/polygon/PolygonDoc";

import type { ObjectStateValidator } from "../../../registry/ObjectStateValidatorRegistry";
import { createPolyStateValidator } from "../../utils/createPolyStateValidator";

/**
 * Validates a PolygonState (Poly-family common logic generated from features).
 * A polygon is a closed shape, so it requires at least 3 points (unlike a polyline's 2).
 */
export const isValidPolygonState: ObjectStateValidator =
	createPolyStateValidator(PolygonFeatures, 3);
