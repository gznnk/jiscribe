import type { ConnectorState } from "./ConnectorState";
import type { ConnectorDoc } from "../../../../schemas/objects/connections/connector/ConnectorDoc";
import type {
	DocToStateMapper,
	StateToDocMapper,
} from "../../base/MapperTypes";
import { ObjectMapper } from "../../base/ObjectMapper";

/**
 * Converts ConnectorDoc to ConnectorState.
 */
export const connectorToState: DocToStateMapper<
	ConnectorDoc,
	ConnectorState
> = (doc) => {
	const base = ObjectMapper.toState(doc);

	return {
		...base,
		// points holds only the intermediate waypoints in source → target order.
		// Rendering produces a polyline passing through these waypoints (the
		// authoritative endpoints are the source / target EndpointRefs).
		// Doc-side points is optional; normalize an absent value to [] so State always has it.
		points: doc.points ?? [],
		source: doc.source,
		target: doc.target,
		routing: doc.routing,
		stroke: doc.stroke,
		strokeWidth: doc.strokeWidth,
		strokeDashType: doc.strokeDashType,
		startArrow: doc.startArrow,
		endArrow: doc.endArrow,
		label: doc.label,
	} as ConnectorState;
};

/**
 * Converts ConnectorState to ConnectorDoc.
 */
export const connectorToDoc: StateToDocMapper<ConnectorState, ConnectorDoc> = (
	state,
) => {
	const base = ObjectMapper.toDoc(state);

	return {
		...base,
		points: state.points,
		source: state.source,
		target: state.target,
		routing: state.routing,
		stroke: state.stroke,
		strokeWidth: state.strokeWidth,
		strokeDashType: state.strokeDashType,
		startArrow: state.startArrow,
		endArrow: state.endArrow,
		label: state.label,
	} as ConnectorDoc;
};
