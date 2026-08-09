import type { CreateObjectState } from "@jiscribe/canvas";

import type { ManualInputFeatures } from "../../schema/manualInput/ManualInputDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ManualInputStateBrand: unique symbol;

export type ManualInputState = CreateObjectState<
	typeof ManualInputFeatures,
	typeof ManualInputStateBrand
>;
