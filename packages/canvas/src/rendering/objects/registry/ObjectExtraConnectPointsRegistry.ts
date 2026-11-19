import type { ExtraConnectPoint } from "@jiscribe/doc/model/objects/connector/ExtraConnectPoint";
import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { Dimensions } from "@jiscribe/geometry";

import type { ObjectState } from "../../../states/objects/base/ObjectState";

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
