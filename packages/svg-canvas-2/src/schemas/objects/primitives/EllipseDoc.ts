import type { ObjectFeatures } from "../types/ObjectFeatures";
import type { CreateObjectType } from "../utils/CreateObjectType";

export const EllipseFeatures = {
	geometry: "ellipse",
	transform: true,
	stroke: true,
	fill: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const EllipseDocBrand: unique symbol;

export type EllipseDoc = CreateObjectType<
	typeof EllipseFeatures,
	typeof EllipseDocBrand,
	{ type: "ellipse" }
>;

export const ELLIPSE_DOC_DEFAULTS = {
	type: "ellipse",
	cx: 0,
	cy: 0,
	rx: 50,
	ry: 30,
} as const satisfies Omit<EllipseDoc, "id" | typeof EllipseDocBrand>;
