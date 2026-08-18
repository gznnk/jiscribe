import type { PolylineState } from "./PolylineState";
import {
	POLYLINE_EXTRA_KEYS,
	PolylineFeatures,
} from "../../../../schemas/objects/primitives/polyline/PolylineDoc";
import type { PolylineDoc } from "../../../../schemas/objects/primitives/polyline/PolylineDoc";
import { createPolyMapper } from "../../base/PolyMapper";

/** PolylineDoc ↔ PolylineState conversion (Poly-family common logic generated from features). */
export const { toState: polylineToState, toDoc: polylineToDoc } =
	createPolyMapper<PolylineDoc, PolylineState>(
		PolylineFeatures,
		POLYLINE_EXTRA_KEYS,
	);
