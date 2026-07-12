import type { ArrowType } from "../../types/ArrowType";
import type { CreateObjectType } from "../../types/CreateObjectType";
import type { ObjectFeatures } from "../../types/ObjectFeatures";

export const PolylineFeatures = {
	type: "polyline",
	geometry: "poly",
	stroke: true,
	arrow: true,
	connectable: false,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const PolylineDocBrand: unique symbol;

export type PolylineDoc = CreateObjectType<
	typeof PolylineFeatures,
	typeof PolylineDocBrand,
	{
		startArrow?: ArrowType;
		endArrow?: ArrowType;
	}
>;
