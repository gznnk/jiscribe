import type { PolylineState } from "./PolylineState";
import type { PolylineDoc } from "../../../../schemas/objects/primitives/polyline/PolylineDoc";
import type {
	DocToStateMapper,
	StateToDocMapper,
} from "../../base/MapperTypes";
import { ObjectMapper } from "../../base/ObjectMapper";

/**
 * Converts PolylineDoc to PolylineState.
 */
export const polylineToState: DocToStateMapper<PolylineDoc, PolylineState> = (
	doc,
) => {
	const base = ObjectMapper.toState(doc);

	return {
		...base,
		points: doc.points,
		stroke: doc.stroke,
		strokeWidth: doc.strokeWidth,
		strokeDashType: doc.strokeDashType,
		startArrow: doc.startArrow,
		endArrow: doc.endArrow,
	} as PolylineState;
};

/**
 * Converts PolylineState to PolylineDoc.
 */
export const polylineToDoc: StateToDocMapper<PolylineState, PolylineDoc> = (
	state,
) => {
	const base = ObjectMapper.toDoc(state);

	return {
		...base,
		points: state.points,
		stroke: state.stroke,
		strokeWidth: state.strokeWidth,
		strokeDashType: state.strokeDashType,
		startArrow: state.startArrow,
		endArrow: state.endArrow,
	} as PolylineDoc;
};
