import type { PolygonState } from "./PolygonState";
import { PolygonFeatures } from "../../../../schemas/objects/primitives/polygon/PolygonDoc";
import type { PolygonDoc } from "../../../../schemas/objects/primitives/polygon/PolygonDoc";
import { createPolyMapper } from "../../base/PolyMapper";

/** PolygonDoc ↔ PolygonState conversion (Poly-family common logic generated from features). */
export const { toState: polygonToState, toDoc: polygonToDoc } =
	createPolyMapper<PolygonDoc, PolygonState>(PolygonFeatures);
