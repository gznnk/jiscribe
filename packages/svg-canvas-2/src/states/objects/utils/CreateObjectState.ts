import type { Frame, FrameKeyPoints } from "@workspace/geometry";
import type { Brand, Prettify } from "@workspace/utility-types";

import type { ObjectFeatures } from "../../../schemas/objects/types/ObjectFeatures";
import type { Poly } from "../../../schemas/objects/types/Poly";
import type { FillStyleState } from "../base/FillStyleState";
import type { ObjectState } from "../base/ObjectState";
import type { StrokeStyleState } from "../base/StrokeStyleState";
import type { TransformState } from "../base/TransformState";

/**
 * Conditional geometry type based on specified geometry feature (runtime state).
 *
 * - `none`: No geometry properties
 * - `rect`/`ellipse`: Frame (cx, cy, width, height) with optional cached keyPoints
 * - `poly`: Poly (points array)
 */
type GeometryState<T extends ObjectFeatures> = //
	T["geometry"] extends "none"
		? object
		: T["geometry"] extends "rect"
			? Frame & { keyPoints?: FrameKeyPoints }
			: T["geometry"] extends "ellipse"
				? Frame & { keyPoints?: FrameKeyPoints }
				: T["geometry"] extends "poly"
					? Poly
					: object;

/**
 * Generic type creator for object state types (runtime in-memory data).
 * Conditionally includes feature interfaces based on provided features.
 * Automatically applies branding to prevent structural type compatibility with Doc types.
 *
 * Key differences from CreateObjectType (Doc):
 * - Uses Frame instead of Rect/Ellipse (runtime representation)
 * - Uses TransformState instead of TransformDoc (pre-computed transform with UI properties)
 * - Includes Brand to prevent direct assignment from/to Doc types
 *
 * @template T - ObjectFeatures configuration (shared with Doc)
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
 * declare const RectStateBrand: unique symbol;
 * type RectState = CreateObjectState<
 *   typeof RectFeatures,
 *   typeof RectStateBrand
 * >;
 * ```
 */
export type CreateObjectState<
	T extends ObjectFeatures,
	S extends symbol,
	P = object,
> = Prettify<
	ObjectState & { type: T["type"] } & GeometryState<T> &
		(T["transform"] extends true ? TransformState : object) &
		(T["stroke"] extends true ? StrokeStyleState : object) &
		(T["fill"] extends true ? FillStyleState : object) &
		Brand<S> &
		P
>;
