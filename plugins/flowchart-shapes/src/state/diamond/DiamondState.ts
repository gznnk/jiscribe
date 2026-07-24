import type { CreateObjectState } from "@workspace/canvas";

import type { DiamondFeatures } from "../../schema/diamond/DiamondDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const DiamondStateBrand: unique symbol;

export type DiamondState = CreateObjectState<
	typeof DiamondFeatures,
	typeof DiamondStateBrand
>;
