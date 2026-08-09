import type { CreateObjectState } from "@jiscribe/canvas";

import type { ShieldFeatures } from "../../schema/shield/ShieldDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ShieldStateBrand: unique symbol;

export type ShieldState = CreateObjectState<
	typeof ShieldFeatures,
	typeof ShieldStateBrand
>;
