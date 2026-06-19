import type { StickyFeatures } from "../../../../schemas/objects/annotations/sticky/StickyDoc";
import type { CreateObjectState } from "../../utils/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const StickyStateBrand: unique symbol;

export type StickyState = CreateObjectState<
	typeof StickyFeatures,
	typeof StickyStateBrand
>;
