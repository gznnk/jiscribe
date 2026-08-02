import type { CreateObjectState } from "@workspace/canvas";

import type { GearFeatures } from "../../schema/gear/GearDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const GearStateBrand: unique symbol;

export type GearState = CreateObjectState<
	typeof GearFeatures,
	typeof GearStateBrand
>;
