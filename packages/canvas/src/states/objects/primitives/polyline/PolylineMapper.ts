import { PolylineFeatures } from "@jiscribe/doc/model/objects/primitives/polyline/PolylineDoc";
import type { PolylineDoc } from "@jiscribe/doc/model/objects/primitives/polyline/PolylineDoc";

import type { PolylineState } from "./PolylineState";
import { createPolyMapper } from "../../base/PolyMapper";

/** PolylineDoc ↔ PolylineState conversion (Poly-family common logic generated from features). */
export const { toState: polylineToState, toDoc: polylineToDoc } =
	createPolyMapper<PolylineDoc, PolylineState>(PolylineFeatures);
