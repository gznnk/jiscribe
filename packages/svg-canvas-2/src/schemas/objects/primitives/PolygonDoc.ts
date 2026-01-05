import type { ObjectFeatures } from "../../types/ObjectFeatures";
import type { CreateObjectType } from "../../utils/CreateObjectType";

export const PolygonFeatures = {
	geometry: "poly",
	stroke: true,
	fill: true,
} as const satisfies ObjectFeatures;

export type PolygonDoc = CreateObjectType<typeof PolygonFeatures, { type: "polygon" }>;
