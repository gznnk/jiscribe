import type { CrossFeatures } from "../../../../schemas/objects/flowchart/cross/CrossDoc";
import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const CrossStateBrand: unique symbol;

export type CrossState = CreateObjectState<
	typeof CrossFeatures,
	typeof CrossStateBrand
>;
