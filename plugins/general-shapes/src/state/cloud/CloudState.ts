import type { CreateObjectState } from "@jiscribe/canvas";

import type { CloudFeatures } from "../../schema/cloud/CloudDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const CloudStateBrand: unique symbol;

export type CloudState = CreateObjectState<
	typeof CloudFeatures,
	typeof CloudStateBrand
>;
