import type { ConnectorFeatures } from "../../../../schemas/objects/connections/ConnectorDoc";
import type { ArrowType } from "../../../../schemas/objects/types/ArrowType";
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
		startArrow?: ArrowType;
		endArrow?: ArrowType;
	}
>;
