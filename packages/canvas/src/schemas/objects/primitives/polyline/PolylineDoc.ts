import { ARROW_STYLE_KEYS, type ArrowStyleDoc } from "../../base/ArrowStyleDoc";
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
	ArrowStyleDoc
>;

/** Doc fields polyline carries beyond the ones its features imply (see ObjectDocDefinition.extraKeys). */
export const POLYLINE_EXTRA_KEYS = [
	...ARROW_STYLE_KEYS,
] as const satisfies readonly (keyof PolylineDoc)[];
