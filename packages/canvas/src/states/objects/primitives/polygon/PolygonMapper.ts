import { PolygonFeatures } from "@jiscribe/doc/model/objects/primitives/polygon/PolygonDoc";
import type { PolygonDoc } from "@jiscribe/doc/model/objects/primitives/polygon/PolygonDoc";

import type { PolygonState } from "./PolygonState";
import { createPolyMapper } from "../../base/PolyMapper";

/** PolygonDoc ↔ PolygonState conversion (Poly-family common logic generated from features). */
export const { toState: polygonToState, toDoc: polygonToDoc } =
	createPolyMapper<PolygonDoc, PolygonState>(PolygonFeatures);
