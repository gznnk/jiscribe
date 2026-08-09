import type { CreateObjectState } from "@jiscribe/canvas";

import type { SmartphoneFeatures } from "../../schema/smartphone/SmartphoneDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const SmartphoneStateBrand: unique symbol;

export type SmartphoneState = CreateObjectState<
	typeof SmartphoneFeatures,
	typeof SmartphoneStateBrand
>;
