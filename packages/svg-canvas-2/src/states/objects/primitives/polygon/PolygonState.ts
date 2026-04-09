import type { PolygonFeatures } from "../../../../schemas/objects/primitives/PolygonDoc";
import type { CreateObjectState } from "../../utils/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const PolygonStateBrand: unique symbol;

export type PolygonState = CreateObjectState<
	typeof PolygonFeatures,
	typeof PolygonStateBrand
>;
