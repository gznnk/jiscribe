import type { CreateObjectState } from "@workspace/canvas";

import type { CloudFeatures } from "../schema/CloudDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const CloudStateBrand: unique symbol;

export type CloudState = CreateObjectState<
	typeof CloudFeatures,
	typeof CloudStateBrand
>;
