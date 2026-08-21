import { PolylineFeatures } from "../../../../schemas/objects/primitives/polyline/PolylineDoc";
import type { ObjectStateValidator } from "../../../registry/ObjectStateValidatorRegistry";
import { createPolyStateValidator } from "../../utils/createPolyStateValidator";

/** Validates PolylineState (Poly-family common logic generated from features; min 2 points). */
export const isValidPolylineState: ObjectStateValidator =
	createPolyStateValidator(PolylineFeatures, 2);
