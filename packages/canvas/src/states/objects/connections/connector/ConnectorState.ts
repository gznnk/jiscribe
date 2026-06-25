import type { ConnectorFeatures } from "../../../../schemas/objects/connections/connector/ConnectorDoc";
import type { ArrowType } from "../../../../schemas/objects/types/ArrowType";
import type { ConnectorRouting } from "../../../../schemas/objects/types/ConnectorRouting";
import type { EndpointRef } from "../../../../schemas/objects/types/EndpointRef";
import type { CreateObjectState } from "../../utils/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ConnectorStateBrand: unique symbol;

export type ConnectorState = CreateObjectState<
	typeof ConnectorFeatures,
	typeof ConnectorStateBrand,
	{
		source: EndpointRef;
		target: EndpointRef;
		routing?: ConnectorRouting;
		startArrow?: ArrowType;
		endArrow?: ArrowType;
	}
>;
