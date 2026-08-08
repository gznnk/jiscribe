import type { CreateObjectState } from "@workspace/canvas";

import type { StoredDataFeatures } from "../../schema/storedData/StoredDataDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const StoredDataStateBrand: unique symbol;

export type StoredDataState = CreateObjectState<
	typeof StoredDataFeatures,
	typeof StoredDataStateBrand
>;
