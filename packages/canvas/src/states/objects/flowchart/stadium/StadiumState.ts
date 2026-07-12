import type { StadiumFeatures } from "../../../../schemas/objects/flowchart/stadium/StadiumDoc";
import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const StadiumStateBrand: unique symbol;

export type StadiumState = CreateObjectState<
	typeof StadiumFeatures,
	typeof StadiumStateBrand
>;
