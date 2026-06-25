import type { Point } from "@workspace/geometry";

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
		// points は source → target 順の中間経由点（waypoint）のみを保持する。
		// 描画はこの経由点を通る折れ線になる（端点の正は source / target の EndpointRef）。
		points: (doc.points ?? []) as Point[],
		source: doc.source,
		target: doc.target,
		stroke: doc.stroke,
		strokeWidth: doc.strokeWidth,
		strokeDashType: doc.strokeDashType,
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
		source: state.source,
		target: state.target,
		stroke: state.stroke,
		strokeWidth: state.strokeWidth,
		strokeDashType: state.strokeDashType,
		startArrow: state.startArrow,
		endArrow: state.endArrow,
	} as ConnectorDoc;
};
