import type { PolylineFeatures } from "@jiscribe/doc/model/objects/primitives/polyline/PolylineDoc";

import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const PolylineStateBrand: unique symbol;

export type PolylineState = CreateObjectState<
	typeof PolylineFeatures,
	typeof PolylineStateBrand
>;
