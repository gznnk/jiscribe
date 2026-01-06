import type { ConnectorDoc } from "../../../../schemas/objects/connections/ConnectorDoc";
import type { ConnectorState } from "../../../../states/objects/connections/ConnectorState";
import type {
	DocToStateMapper,
	StateToDocMapper,
} from "../../../types/ObjectMapperTypes";
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
		startArrow: doc.startArrow,
		endArrow: doc.endArrow,
	} as ConnectorState;
};

/**
 * Converts ConnectorState to ConnectorDoc.
 */
export const connectorToDoc: StateToDocMapper<
	ConnectorState,
	ConnectorDoc
> = (state) => {
	const base = ObjectMapper.toDoc(state);

	return {
		...base,
		points: state.points,
		stroke: state.stroke,
		strokeWidth: state.strokeWidth,
		startArrow: state.startArrow,
		endArrow: state.endArrow,
	} as ConnectorDoc;
};
