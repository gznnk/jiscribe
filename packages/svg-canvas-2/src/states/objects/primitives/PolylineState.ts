import type { PolylineFeatures } from "../../../schemas/objects/primitives/PolylineDoc";
import type { ArrowType } from "../../../schemas/objects/types/ArrowType";
import type { CreateObjectState } from "../utils/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const PolylineStateBrand: unique symbol;

export type PolylineState = CreateObjectState<
	typeof PolylineFeatures,
	typeof PolylineStateBrand,
	{
		startArrow?: ArrowType;
		endArrow?: ArrowType;
	}
>;
