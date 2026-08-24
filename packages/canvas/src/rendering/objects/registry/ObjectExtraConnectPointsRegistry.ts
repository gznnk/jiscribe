import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { Dimensions, Point } from "@jiscribe/geometry";

import type { ObjectState } from "../../../states/objects/base/ObjectState";

/**
 * One named connection point a type declares beyond the four edge midpoints
 * every connectable shape already has (the brace's cusp, say). Both vectors are
 * in the shape's local coordinate space (origin at the center, width/height
 * units, before transform); the consumers apply the shape's rotation, flips and
 * position.
 */
export type ExtraConnectPoint = {
	/**
	 * Token stored in a connector's `{ kind: "connectPoint", id }` and echoed in
	 * the DOM as `data-part="anchor:<id>"`. Must not collide with a built-in
	 * ConnectPointId (`topCenter` / …) or with `"center"`, and must stay stable
	 * across releases: it is what a saved doc refers to.
	 */
	id: string;
	/** Where the anchor sits, in local coordinates. */
	point: Point;
	/**
	 * Local outward unit vector — the way a connector leaves the shape here. Snapped
	 * to the nearest of the four axes when the orthogonal router asks for it, so a
	 * diagonal is legal but resolves to one axis.
	 */
	direction: Point;
};

/**
 * Produces the connection points a type declares on top of the four edge
 * midpoints, from its state (untransformed width/height plus any per-shape
 * fields). Unlike the edge anchors, these are taken as declared: the outline
 * does not move them, because the shape is what decides where its own named
 * point is. Implementations declare what they read via `TState` (the group
 * markers': `ObjectExtraConnectPointsCalculator<Dimensions &
 * GroupMarkerTipFields>`); the registry stores the default instantiation, to
 * which narrower readers are assignable by contravariance.
 *
 * A type whose extra points move while the frame stands still must also declare
 * a `geometryKey` (see ObjectGeometryKeyRegistry), or connectors attached to
 * them keep the endpoints resolved against the previous position.
 */
export type ObjectExtraConnectPointsCalculator<
	TState extends Dimensions = ObjectState & Dimensions,
> = (state: TState) => readonly ExtraConnectPoint[];

/**
 * Per-type registry of extra connect point calculators. Types without a
 * registered calculator offer only the four edge midpoints and the center.
 */
export class ObjectExtraConnectPointsRegistry {
	private readonly calculators = new Map<
		ObjectType,
		ObjectExtraConnectPointsCalculator
	>();

	register(
		type: ObjectType,
		calculator: ObjectExtraConnectPointsCalculator,
	): void {
		this.calculators.set(type, calculator);
	}

	get(type: ObjectType): ObjectExtraConnectPointsCalculator | undefined {
		return this.calculators.get(type);
	}

	clear(): void {
		this.calculators.clear();
	}
}

export const createObjectExtraConnectPointsRegistry =
	(): ObjectExtraConnectPointsRegistry =>
		new ObjectExtraConnectPointsRegistry();
