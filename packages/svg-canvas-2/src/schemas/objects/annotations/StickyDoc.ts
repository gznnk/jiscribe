import type { ObjectFeatures } from "../types/ObjectFeatures";
import type { CreateObjectType } from "../utils/CreateObjectType";

export const StickyFeatures = {
	type: "sticky",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const StickyDocBrand: unique symbol;

export type StickyDoc = CreateObjectType<
	typeof StickyFeatures,
	typeof StickyDocBrand
>;
