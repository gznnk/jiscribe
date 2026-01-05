import type { ObjectFeatures } from "../types/ObjectFeatures";
import type { CreateObjectType } from "../utils/CreateObjectType";

export const StickyFeatures = {
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
} as const satisfies ObjectFeatures;

export type StickyDoc = CreateObjectType<
	typeof StickyFeatures,
	{ type: "sticky" }
>;
