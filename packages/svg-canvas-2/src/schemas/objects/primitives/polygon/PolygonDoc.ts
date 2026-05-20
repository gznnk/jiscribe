import type { ObjectFeatures } from "../../types/ObjectFeatures";
import type { CreateObjectType } from "../../utils/CreateObjectType";

export const PolygonFeatures = {
	type: "polygon",
	geometry: "poly",
	stroke: true,
	fill: true,
	connectable: false,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const PolygonDocBrand: unique symbol;

export type PolygonDoc = CreateObjectType<
	typeof PolygonFeatures,
	typeof PolygonDocBrand
>;
