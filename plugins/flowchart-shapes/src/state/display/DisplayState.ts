import type { CreateObjectState } from "@jiscribe/canvas";

import type { DisplayFeatures } from "../../schema/display/DisplayDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const DisplayStateBrand: unique symbol;

export type DisplayState = CreateObjectState<
	typeof DisplayFeatures,
	typeof DisplayStateBrand
>;
