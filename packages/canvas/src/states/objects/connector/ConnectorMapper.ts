import type { ConnectorState } from "./ConnectorState";
import {
	CONNECTOR_EXTRA_KEYS,
	ConnectorFeatures,
} from "../../../schemas/objects/connector/ConnectorDoc";
import type { ConnectorDoc } from "../../../schemas/objects/connector/ConnectorDoc";
import { createPolyMapper } from "../base/PolyMapper";

/**
 * ConnectorDoc ↔ ConnectorState conversion (Poly-family common logic generated from features).
 *
 * `points` holds only the intermediate waypoints in source → target order (the authoritative
 * endpoints are the source / target EndpointRefs). Doc-side points is optional; `createPolyMapper`
 * normalizes an absent value to [] so State always has it.
 *
 * source / target / routing / arrows / label are the connector's own fields. The allow-list
 * takes them from the one declaration of them (CONNECTOR_EXTRA_KEYS), which the doc
 * definition passes to doc-ops as well.
 */
export const { toState: connectorToState, toDoc: connectorToDoc } =
	createPolyMapper<ConnectorDoc, ConnectorState>(
		ConnectorFeatures,
		CONNECTOR_EXTRA_KEYS,
	);
