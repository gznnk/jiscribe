import type {
	ConnectorFeatures,
	ConnectorLabel,
} from "../../../../schemas/objects/connections/connector/ConnectorDoc";
import type { ArrowType } from "../../../../schemas/objects/types/ArrowType";
import type { ConnectorRouting } from "../../../../schemas/objects/types/ConnectorRouting";
import type { EndpointRef } from "../../../../schemas/objects/types/EndpointRef";
import type { CreateObjectState } from "../../types/CreateObjectState";

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
		startArrow?: ArrowType;
		endArrow?: ArrowType;
		// The label is a text attribute, so it is kept in the same shape as the Doc (no conversion needed).
		label?: ConnectorLabel;
	}
>;
