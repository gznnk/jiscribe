import type { ConnectorState } from "./ConnectorState";
import { ConnectorFeatures } from "../../../schemas/objects/connector/ConnectorDoc";
import type { ConnectorDoc } from "../../../schemas/objects/connector/ConnectorDoc";
import { createPolyMapper } from "../base/PolyMapper";

/**
 * ConnectorDoc ↔ ConnectorState conversion (Poly-family common logic generated from features).
 *
 * `points` holds only the intermediate waypoints in source → target order (the authoritative
 * endpoints are the source / target EndpointRefs). Doc-side points is optional; `createPolyMapper`
 * normalizes an absent value to [] so State always has it.
 *
 * source / target / routing / arrows / label are connector-specific fields passed through the
 * allow-list via `extraKeys`.
 */
export const { toState: connectorToState, toDoc: connectorToDoc } =
	createPolyMapper<ConnectorDoc, ConnectorState>(ConnectorFeatures, [
		"source",
		"target",
		"routing",
		"startArrow",
		"endArrow",
		"label",
	]);
