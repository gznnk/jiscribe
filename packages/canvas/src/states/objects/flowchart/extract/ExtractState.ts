import type { ExtractFeatures } from "../../../../schemas/objects/flowchart/extract/ExtractDoc";
import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ExtractStateBrand: unique symbol;

export type ExtractState = CreateObjectState<
	typeof ExtractFeatures,
	typeof ExtractStateBrand
>;
