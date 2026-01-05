import type { ArrowType } from "../types/ArrowType";
import type { ObjectFeatures } from "../types/ObjectFeatures";
import type { CreateObjectType } from "../utils/CreateObjectType";

export const PolylineFeatures = {
	geometry: "poly",
	stroke: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const PolylineDocBrand: unique symbol;

export type PolylineDoc = CreateObjectType<
	typeof PolylineFeatures,
	typeof PolylineDocBrand,
	{
		type: "polyline";
		startArrow?: ArrowType;
		endArrow?: ArrowType;
	}
>;
