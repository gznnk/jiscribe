import type { TransformedFrame } from "@jiscribe/geometry";

import type { ObjectGeometryKeyRegistry } from "../../rendering/objects/registry/ObjectGeometryKeyRegistry";
import type { ObjectState } from "../../states/objects/base/ObjectState";

type GeometryKeyRegistry = Pick<ObjectGeometryKeyRegistry, "get">;

/** The fields of an endpoint owner the route resolution reads, one value each. */
export type OwnerGeometry = ReturnType<typeof readOwnerGeometry>;

/**
 * The fields the route resolution actually reads from an endpoint owner, as one
 * value per field. Non-geometry edits (fill / text / ...) clone the owner but
 * keep these values, so a cache keyed on them skips the re-route (#214).
 * Connectable types are all frame-based today; if poly shapes ever become
 * connectable, `points` must be added here. Per-type state beyond the frame
 * (a callout's tail) arrives as `geometryKey`, so a type whose silhouette moves
 * on its own stays live by registering one.
 *
 * @param obj - The owner; null or undefined (a free endpoint, a missing owner) reads as every field undefined
 * @param geometryKeyRegistry - Per-canvas ObjectGeometryKeyRegistry, asked for the owner type's key
 * @returns Scalars plus `features`, which is compared by identity like the rest
 */
export const readOwnerGeometry = (
	obj: ObjectState | null | undefined,
	geometryKeyRegistry: GeometryKeyRegistry,
) => {
	const frame = obj as (ObjectState & Partial<TransformedFrame>) | null;
	return {
		id: obj?.id,
		type: obj?.type,
		features: obj?.features,
		cx: frame?.cx,
		cy: frame?.cy,
		width: frame?.width,
		height: frame?.height,
		rotation: frame?.rotation,
		scaleX: frame?.scaleX,
		scaleY: frame?.scaleY,
		geometryKey: obj ? geometryKeyRegistry.get(obj.type)?.(obj) : undefined,
	};
};

/**
 * Whether two owners route a connector alike: every field of
 * {@link readOwnerGeometry} the same under `Object.is`, as a hook's dependency
 * list compares them.
 *
 * @param previous - What `readOwnerGeometry` read for the owner a route was resolved from
 * @param next - What it reads for the owner now
 */
export const isSameOwnerGeometry = (
	previous: OwnerGeometry,
	next: OwnerGeometry,
): boolean =>
	(Object.keys(previous) as (keyof OwnerGeometry)[]).every((field) =>
		Object.is(previous[field], next[field]),
	);
