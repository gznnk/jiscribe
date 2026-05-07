import type { PolygonState } from "./PolygonState";
import type { PolygonDoc } from "../../../../schemas/objects/primitives/PolygonDoc";
import type {
	DocToStateMapper,
	StateToDocMapper,
} from "../../base/MapperTypes";
import { ObjectMapper } from "../../base/ObjectMapper";

/**
 * Converts PolygonDoc to PolygonState.
 */
export const polygonToState: DocToStateMapper<PolygonDoc, PolygonState> = (
	doc,
) => {
	const base = ObjectMapper.toState(doc);

	return {
		...base,
		points: doc.points,
		stroke: doc.stroke,
		strokeWidth: doc.strokeWidth,
		strokeDashType: doc.strokeDashType,
		fill: doc.fill,
	} as PolygonState;
};

/**
 * Converts PolygonState to PolygonDoc.
 */
export const polygonToDoc: StateToDocMapper<PolygonState, PolygonDoc> = (
	state,
) => {
	const base = ObjectMapper.toDoc(state);

	return {
		...base,
		points: state.points,
		stroke: state.stroke,
		strokeWidth: state.strokeWidth,
		strokeDashType: state.strokeDashType,
		fill: state.fill,
	} as PolygonDoc;
};
