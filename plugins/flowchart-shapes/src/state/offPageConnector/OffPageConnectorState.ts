import type { CreateObjectState } from "@workspace/canvas";

import type { OffPageConnectorFeatures } from "../../schema/offPageConnector/OffPageConnectorDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const OffPageConnectorStateBrand: unique symbol;

export type OffPageConnectorState = CreateObjectState<
	typeof OffPageConnectorFeatures,
	typeof OffPageConnectorStateBrand
>;
