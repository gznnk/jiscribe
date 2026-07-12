import type { CreateObjectType } from "../../types/CreateObjectType";
import type { ObjectFeatures } from "../../types/ObjectFeatures";
import { AUTO_COLOR } from "../../utils/autoColor";

/**
 * A triangle with its apex at the top, used for merges/hierarchies and as a
 * marker. It holds no text (text: false) — it is a marker, not a labeled box.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering. This
 * lets it reuse Frame-based transforms and connector outline connections with
 * the same mechanism as Rect.
 */
export const TriangleFeatures = {
	type: "triangle",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: false,
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const TriangleDocBrand: unique symbol;

export type TriangleDoc = CreateObjectType<
	typeof TriangleFeatures,
	typeof TriangleDocBrand
>;

export const TRIANGLE_DOC_DEFAULTS: Omit<TriangleDoc, "id"> = {
	type: "triangle",
	x: 0,
	y: 0,
	width: 120,
	height: 100,
	fill: "transparent",
	stroke: AUTO_COLOR,
	strokeWidth: 2,
} as const as TriangleDoc;
