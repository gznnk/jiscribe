import type { CardFeatures } from "../../../../schemas/objects/flowchart/card/CardDoc";
import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const CardStateBrand: unique symbol;

export type CardState = CreateObjectState<
	typeof CardFeatures,
	typeof CardStateBrand
>;
