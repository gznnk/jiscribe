import {
	POLYGON_MIN_POINTS,
	PolygonFeatures,
} from "@jiscribe/doc/model/objects/primitives/polygon/PolygonDoc";

import type { ObjectStateValidator } from "../../../registry/ObjectStateValidatorRegistry";
import { createPolyStateValidator } from "../../utils/createPolyStateValidator";

/** Validates a PolygonState (Poly-family common logic generated from features). */
export const isValidPolygonState: ObjectStateValidator =
	createPolyStateValidator(PolygonFeatures, POLYGON_MIN_POINTS);
