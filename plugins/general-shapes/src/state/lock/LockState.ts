import type { CreateObjectState } from "@jiscribe/canvas";

import type { LockFeatures } from "../../schema/lock/LockDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const LockStateBrand: unique symbol;

export type LockState = CreateObjectState<
	typeof LockFeatures,
	typeof LockStateBrand
>;
