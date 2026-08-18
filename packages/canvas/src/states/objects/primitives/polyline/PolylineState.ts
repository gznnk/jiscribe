import type { PolylineFeatures } from "../../../../schemas/objects/primitives/polyline/PolylineDoc";
import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const PolylineStateBrand: unique symbol;

export type PolylineState = CreateObjectState<
	typeof PolylineFeatures,
	typeof PolylineStateBrand
>;
