import type { CreateObjectType } from "../../types/CreateObjectType";
import type { ObjectFeatures } from "../../types/ObjectFeatures";

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
