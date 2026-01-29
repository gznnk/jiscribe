import type {
	DocToStateMapper,
	StateToDocMapper,
} from "../../../../registry/ObjectRegistryTypes";
import type { ConnectorDoc } from "../../../../schemas/objects/connections/ConnectorDoc";
import type { ConnectorState } from "../../../../states/objects/connections/ConnectorState";
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
		points: doc.points,
		stroke: doc.stroke,
		strokeWidth: doc.strokeWidth,
		source: doc.source,
		target: doc.target,
		startArrow: doc.startArrow,
		endArrow: doc.endArrow,
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
		stroke: state.stroke,
		strokeWidth: state.strokeWidth,
		source: state.source,
		target: state.target,
		startArrow: state.startArrow,
		endArrow: state.endArrow,
	} as ConnectorDoc;
};
