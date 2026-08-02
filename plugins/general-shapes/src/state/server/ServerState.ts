import type { CreateObjectState } from "@workspace/canvas";

import type { ServerFeatures } from "../../schema/server/ServerDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ServerStateBrand: unique symbol;

export type ServerState = CreateObjectState<
	typeof ServerFeatures,
	typeof ServerStateBrand
>;
