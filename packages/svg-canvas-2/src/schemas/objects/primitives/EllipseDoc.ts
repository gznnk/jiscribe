import type { ReadonlyOmit } from "../../../../../utility-types/src";
import type { ObjectFeatures } from "../../types/ObjectFeatures";
import type { CreateObjectType } from "../../utils/CreateObjectType";

export const EllipseFeatures = {
	geometry: "ellipse",
	transform: true,
	stroke: true,
	fill: true,
} as const satisfies ObjectFeatures;

export type EllipseDoc = CreateObjectType<typeof EllipseFeatures, { type: "ellipse" }>;

export const ELLIPSE_DOC_DEFAULTS: ReadonlyOmit<EllipseDoc, "id"> = {
	type: "ellipse",
	cx: 0,
	cy: 0,
	rx: 50,
	ry: 30,
} as const;
