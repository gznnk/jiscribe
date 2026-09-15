import {
	POLYLINE_MIN_POINTS,
	PolylineFeatures,
} from "@jiscribe/doc/model/objects/primitives/polyline/PolylineDoc";

import type { ObjectStateValidator } from "../../../registry/ObjectStateValidatorRegistry";
import { createPolyStateValidator } from "../../utils/createPolyStateValidator";

/** Validates PolylineState (Poly-family common logic generated from features). */
export const isValidPolylineState: ObjectStateValidator =
	createPolyStateValidator(PolylineFeatures, POLYLINE_MIN_POINTS);
