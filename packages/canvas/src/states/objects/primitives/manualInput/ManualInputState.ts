import type { ManualInputFeatures } from "../../../../schemas/objects/primitives/manualInput/ManualInputDoc";
import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ManualInputStateBrand: unique symbol;

export type ManualInputState = CreateObjectState<
	typeof ManualInputFeatures,
	typeof ManualInputStateBrand
>;
