import type { CreateObjectType } from "../../types/CreateObjectType";
import type { ObjectFeatures } from "../../types/ObjectFeatures";
import { AUTO_COLOR } from "../../utils/autoColor";

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

/**
 * Creation defaults of a polygon, sitting where every other type's do
 * (`RECT_DOC_DEFAULTS` and friends) and reached through the type's
 * `defaults` (builtinObjectDocDefinitions) rather than living as private
 * constants in the factory. The shipped `$def` for this type is still hand-written
 * (doc-schema's templates), so the generated docs do not quote these yet.
 *
 * `points` is excluded rather than given a placeholder: a poly shape's vertices
 * are built per creation from the click position or the drawn bounds
 * (PolygonObjectFactory), so there is no default value creation would read.
 */
export const POLYGON_DOC_DEFAULTS: Omit<PolygonDoc, "id" | "points"> = {
	type: "polygon",
	fill: "transparent",
	stroke: AUTO_COLOR,
	strokeWidth: 2,
} as const as PolygonDoc;
