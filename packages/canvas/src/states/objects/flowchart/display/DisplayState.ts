import type { DisplayFeatures } from "../../../../schemas/objects/flowchart/display/DisplayDoc";
import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const DisplayStateBrand: unique symbol;

export type DisplayState = CreateObjectState<
	typeof DisplayFeatures,
	typeof DisplayStateBrand
>;
