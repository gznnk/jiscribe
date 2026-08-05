import type { CreateObjectState } from "@workspace/canvas";

import type { StickyFeatures } from "../schema/StickyDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const StickyStateBrand: unique symbol;

export type StickyState = CreateObjectState<
	typeof StickyFeatures,
	typeof StickyStateBrand
>;
