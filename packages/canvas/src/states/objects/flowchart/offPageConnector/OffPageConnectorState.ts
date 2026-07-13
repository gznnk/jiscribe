import type { OffPageConnectorFeatures } from "../../../../schemas/objects/flowchart/offPageConnector/OffPageConnectorDoc";
import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const OffPageConnectorStateBrand: unique symbol;

export type OffPageConnectorState = CreateObjectState<
	typeof OffPageConnectorFeatures,
	typeof OffPageConnectorStateBrand
>;
