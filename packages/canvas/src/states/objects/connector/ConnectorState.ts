import type {
	ConnectorFeatures,
	ConnectorLabel,
} from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import type { ConnectorRouting } from "@jiscribe/doc/model/objects/types/ConnectorRouting";
import type { EndpointRef } from "@jiscribe/doc/model/objects/types/EndpointRef";

import type { CreateObjectState } from "../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ConnectorStateBrand: unique symbol;

/** Runtime state for a connector, linking a source and target endpoint. */
export type ConnectorState = CreateObjectState<
	typeof ConnectorFeatures,
	typeof ConnectorStateBrand,
	{
		source: EndpointRef;
		target: EndpointRef;
		routing?: ConnectorRouting;
		// The label is a text attribute, so it is kept in the same shape as the Doc (no conversion needed).
		label?: ConnectorLabel;
	}
>;

/**
 * Type guard to check if an object is ConnectorState.
 *
 * Connectors structurally pass isPoly (their points array holds only
 * intermediate waypoints), so callers computing geometry must check this
 * guard before isPoly to resolve the endpoints correctly.
 *
 * @param obj - The object to check
 * @returns True if the object is ConnectorState, false otherwise
 */
export const isConnectorState = (obj: unknown): obj is ConnectorState => {
	return (
		typeof obj === "object" &&
		obj !== null &&
		"type" in obj &&
		obj.type === "connector" &&
		"source" in obj &&
		"target" in obj
	);
};
