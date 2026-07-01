import type { DiamondFeatures } from "../../../../schemas/objects/primitives/diamond/DiamondDoc";
import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const DiamondStateBrand: unique symbol;

export type DiamondState = CreateObjectState<
	typeof DiamondFeatures,
	typeof DiamondStateBrand
>;
