import type { Ellipse, Rect } from "@workspace/geometry";

import type { Prettify } from "../../../../../utility-types/src";
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
 *
 * @template T - ObjectFeatures configuration
 * @template P - Additional properties type (optional)
 *
 * @example
 * ```typescript
 * const RectFeatures = {
 *   geometry: "rect",
 *   transform: true,
 *   stroke: true,
 *   fill: true,
 * } as const satisfies ObjectFeatures;
 *
 * type RectDoc = CreateObjectType<typeof RectFeatures, { type: "rect" }>;
 * ```
 */
export type CreateObjectType<T extends ObjectFeatures, P = object> = Prettify<
	ObjectDoc &
		GeometryDoc<T> &
		(T["transform"] extends true ? TransformDoc : object) &
		(T["stroke"] extends true ? StrokeStyleDoc : object) &
		(T["fill"] extends true ? FillStyleDoc : object) &
		P
>;
