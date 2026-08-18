import type { Frame } from "@jiscribe/geometry";
import type { Brand, Prettify } from "@jiscribe/utility-types";

import type { ObjectFeatures } from "../../../schemas/objects/types/ObjectFeatures";
import type { Poly } from "../../../schemas/objects/types/Poly";
import type { ArrowStyleState } from "../base/ArrowStyleState";
import type { FillStyleState } from "../base/FillStyleState";
import type { ObjectState } from "../base/ObjectState";
import type { RadiusStyleState } from "../base/RadiusStyleState";
import type { StrokeStyleState } from "../base/StrokeStyleState";
import type { TextStyleState } from "../base/TextStyleState";
import type { TransformState } from "../base/TransformState";

/**
 * The runtime geometry each geometry type takes.
 *
 * - `none`: No geometry properties
 * - `rect`/`ellipse`: Frame (keyPoints are stored in EventStartSnapshot.keyPoints)
 * - `poly`: Poly (points array)
 * - `point`: Frame, its size derived from the content the doc does not store
 *
 * Written as a lookup keyed by GeometryType rather than a conditional chain: a
 * geometry added to GeometryType and not here makes the indexed access below
 * fail to compile, where a chain would have let it fall through to `none`.
 */
type GeometryStateByType = {
	none: object;
	rect: Frame;
	ellipse: Frame;
	poly: Poly;
	point: Frame;
};

/** Geometry fields of a state, picked by the type's declared geometry feature. */
type GeometryState<T extends ObjectFeatures> =
	GeometryStateByType[T["geometry"]];

/**
 * Generic type creator for object state types (runtime in-memory data).
 * Conditionally includes feature interfaces based on provided features.
 * Automatically applies branding to prevent structural type compatibility with Doc types.
 *
 * Key differences from CreateObjectType (Doc):
 * - Uses Frame instead of Rect/Ellipse (runtime representation)
 * - Uses TransformState instead of TransformDoc (pre-computed transform with UI properties)
 * - Includes Brand to prevent direct assignment from/to Doc types
 * - Mixes in the same TextStyleState for both text shapes ("body" / "slots"),
 *   the state having one normal form regardless of how the doc spells its text
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
		(T["text"] extends "body" | "slots" ? TextStyleState : object) &
		(T["radius"] extends true ? RadiusStyleState : object) &
		(T["arrow"] extends true ? ArrowStyleState : object) &
		Brand<S> &
		P
>;
