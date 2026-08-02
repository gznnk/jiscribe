import type { CreateObjectState } from "@workspace/canvas";

import type { LaptopFeatures } from "../../schema/laptop/LaptopDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const LaptopStateBrand: unique symbol;

export type LaptopState = CreateObjectState<
	typeof LaptopFeatures,
	typeof LaptopStateBrand
>;
