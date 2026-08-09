import type { Ellipse, Point, Rect } from "@workspace/geometry";
import type { Brand, Prettify } from "@workspace/utility-types";

import type { FillStyleDoc } from "../base/FillStyleDoc";
import type { ObjectDoc } from "../base/ObjectDoc";
import type { RadiusStyleDoc } from "../base/RadiusStyleDoc";
import type { StrokeStyleDoc } from "../base/StrokeStyleDoc";
import type { TextStyleDoc } from "../base/TextStyleDoc";
import type { TransformDoc } from "../base/TransformDoc";
import type { ObjectFeatures } from "../types/ObjectFeatures";
import type { Poly } from "../types/Poly";

/**
 * The doc-side coordinate fields each geometry contributes. Written as a lookup
 * keyed by GeometryType rather than a conditional chain: a geometry added to
 * GeometryType and not here makes the indexed access below fail to compile,
 * where a chain would have let it fall through to the no-geometry case.
 */
type GeometryDocByType = {
	none: object;
	rect: Rect;
	ellipse: Ellipse;
	poly: Poly;
	point: Point;
};

/** Geometry fields of a doc, picked by the type's declared geometry feature. */
type GeometryDoc<T extends ObjectFeatures> = GeometryDocByType[T["geometry"]];

/**
 * Generic type creator for object document types.
 * Conditionally includes feature interfaces based on provided features.
 * Automatically applies branding to prevent structural type compatibility.
 *
 * `text: "body"` mixes in the root TextStyleDoc form; `text: "slots"` mixes in
 * nothing, because a keyed doc's slot set is closed and the type spells it out
 * itself through `P` (see the record shape).
 *
 * @template T - ObjectFeatures configuration
 * @template S - Unique symbol for branding (prevents direct assignment between types)
 * @template P - Additional properties type (optional)
 *
 * @example
 * ```typescript
 * const RectFeatures = {
 *   type: "rect",
 *   geometry: "rect",
 *   transform: true,
 *   stroke: true,
 *   fill: true,
 * } as const satisfies ObjectFeatures;
 *
 * declare const RectDocBrand: unique symbol;
 * type RectDoc = CreateObjectType<
 *   typeof RectFeatures,
 *   typeof RectDocBrand
 * >;
 * ```
 */
export type CreateObjectType<
	T extends ObjectFeatures,
	S extends symbol,
	P = object,
> = Prettify<
	ObjectDoc & { type: T["type"] } & GeometryDoc<T> &
		(T["transform"] extends true ? TransformDoc : object) &
		(T["stroke"] extends true ? StrokeStyleDoc : object) &
		(T["fill"] extends true ? FillStyleDoc : object) &
		(T["text"] extends "body" ? TextStyleDoc : object) &
		(T["radius"] extends true ? RadiusStyleDoc : object) &
		Brand<S> &
		P
>;
