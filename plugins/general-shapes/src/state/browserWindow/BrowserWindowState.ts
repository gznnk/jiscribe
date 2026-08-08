import type { CreateObjectState } from "@workspace/canvas";

import type { BrowserWindowFeatures } from "../../schema/browserWindow/BrowserWindowDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const BrowserWindowStateBrand: unique symbol;

export type BrowserWindowState = CreateObjectState<
	typeof BrowserWindowFeatures,
	typeof BrowserWindowStateBrand
>;
