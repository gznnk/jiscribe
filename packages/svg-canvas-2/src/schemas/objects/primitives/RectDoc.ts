import type { ObjectFeatures } from "../types/ObjectFeatures";
import type { CreateObjectType } from "../utils/CreateObjectType";

export const RectFeatures = {
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
} as const satisfies ObjectFeatures;

export type RectDoc = CreateObjectType<typeof RectFeatures, { type: "rect" }>;
