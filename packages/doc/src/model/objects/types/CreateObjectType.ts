import type { Ellipse, Point, Rect } from "@jiscribe/geometry";
import type { Brand, Prettify } from "@jiscribe/utility-types";

import type { ObjectFeatures } from "./ObjectFeatures";
import type { Poly } from "./Poly";
import type { ArrowStyleDoc } from "../base/ArrowStyleDoc";
import type { FillStyleDoc } from "../base/FillStyleDoc";
import type { ObjectDoc } from "../base/ObjectDoc";
import type { RadiusStyleDoc } from "../base/RadiusStyleDoc";
import type { StrokeStyleDoc } from "../base/StrokeStyleDoc";
import type { SourceTextStyleDoc, TextStyleDoc } from "../base/TextStyleDoc";
import type { TransformDoc } from "../base/TransformDoc";

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
 * The doc-side text fields each TextType contributes, `none` standing for a
 * type declaring none. A lookup for the same reason GeometryDocByType is one: a
 * value added to TextType and not here makes the indexed access
 * below fail to compile, where a chain would have let it fall through to the
 * no-text case. `slots` contributes nothing, a keyed doc's slot set being closed
 * and spelled out by the type itself through `P` (see the record shape).
 */
type TextDocByType = {
	none: object;
	body: TextStyleDoc;
	source: SourceTextStyleDoc;
	slots: object;
};

/** Text fields of a doc, picked by the type's declared text feature. */
type TextDoc<T extends ObjectFeatures> =
	TextDocByType[T["text"] extends undefined ? "none" : NonNullable<T["text"]>];

/**
 * Generic type creator for object document types.
 * Conditionally includes feature interfaces based on provided features.
 * Automatically applies branding to prevent structural type compatibility.
 *
 * The text fields follow the declared TextType (see {@link TextDocByType}).
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
		TextDoc<T> &
		(T["radius"] extends true ? RadiusStyleDoc : object) &
		(T["arrow"] extends true ? ArrowStyleDoc : object) &
		Brand<S> &
		P
>;
