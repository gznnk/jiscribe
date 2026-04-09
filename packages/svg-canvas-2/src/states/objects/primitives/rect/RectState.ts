import type { RectFeatures } from "../../../../schemas/objects/primitives/RectDoc";
import type { CreateObjectState } from "../../utils/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const RectStateBrand: unique symbol;

export type RectState = CreateObjectState<
	typeof RectFeatures,
	typeof RectStateBrand
>;
