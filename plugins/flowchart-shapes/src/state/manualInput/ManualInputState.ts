import type { CreateObjectState } from "@workspace/canvas";

import type { ManualInputFeatures } from "../../schema/manualInput/ManualInputDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ManualInputStateBrand: unique symbol;

export type ManualInputState = CreateObjectState<
	typeof ManualInputFeatures,
	typeof ManualInputStateBrand
>;
