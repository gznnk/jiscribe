import type { PolygonFeatures } from "@jiscribe/doc/model/objects/primitives/polygon/PolygonDoc";

import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const PolygonStateBrand: unique symbol;

export type PolygonState = CreateObjectState<
	typeof PolygonFeatures,
	typeof PolygonStateBrand
>;
