import type { StoredDataFeatures } from "../../../../schemas/objects/flowchart/storedData/StoredDataDoc";
import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const StoredDataStateBrand: unique symbol;

export type StoredDataState = CreateObjectState<
	typeof StoredDataFeatures,
	typeof StoredDataStateBrand
>;
