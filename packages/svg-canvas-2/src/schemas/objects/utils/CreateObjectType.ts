import type { Ellipse, Rect } from "@workspace/geometry";
import type { Brand, Prettify } from "@workspace/utility-types";

import type { FillStyleDoc } from "../base/FillStyleDoc";
import type { ObjectDoc } from "../base/ObjectDoc";
import type { StrokeStyleDoc } from "../base/StrokeStyleDoc";
import type { TransformDoc } from "../base/TransformDoc";
import type { ObjectFeatures } from "../types/ObjectFeatures";
import type { Poly } from "../types/Poly";

/**
 * Conditional geometry type based on specified geometry feature.
 */
type GeometryDoc<T extends ObjectFeatures> = //
	T["geometry"] extends "none"
		? object
		: T["geometry"] extends "rect"
			? Rect
			: T["geometry"] extends "ellipse"
				? Ellipse
				: T["geometry"] extends "poly"
					? Poly
					: object;

/**
 * Generic type creator for object document types.
 * Conditionally includes feature interfaces based on provided features.
 * Automatically applies branding to prevent structural type compatibility.
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
		Brand<S> &
		P
>;
