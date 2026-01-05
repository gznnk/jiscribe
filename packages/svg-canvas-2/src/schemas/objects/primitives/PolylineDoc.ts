import type { ArrowType } from "../../types/ArrowType";
import type { ObjectFeatures } from "../../types/ObjectFeatures";
import type { CreateObjectType } from "../../utils/CreateObjectType";

export const PolylineFeatures = {
	geometry: "poly",
	stroke: true,
} as const satisfies ObjectFeatures;

export type PolylineDoc = CreateObjectType<
	typeof PolylineFeatures,
	{
		type: "polyline";
		startArrow?: ArrowType;
		endArrow?: ArrowType;
	}
>;
