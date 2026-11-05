import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { ObjectDocAnchorRegionCalculator } from "@jiscribe/doc/plugin/ObjectDocAnchorRegion";
import type { Dimensions } from "@jiscribe/geometry";

/**
 * The canvas's name for a type's anchor region declaration, which lives on the
 * doc definition (see ObjectDocAnchorRegionCalculator,
 * `ObjectDocDefinition.anchorRegion`): the registry calls it with the state, the
 * doc layer with the doc.
 */
export type ObjectAnchorRegionCalculator<
	TState extends Dimensions = Dimensions,
> = ObjectDocAnchorRegionCalculator<TState>;

/**
 * Per-type registry of anchor region calculators. Types without a registered
 * calculator fall back to the full bounding box (see calcConnectPoint).
 */
export class ObjectAnchorRegionRegistry {
	private readonly calculators = new Map<
		ObjectType,
		ObjectAnchorRegionCalculator
	>();

	register(type: ObjectType, calculator: ObjectAnchorRegionCalculator): void {
		this.calculators.set(type, calculator);
	}

	get(type: ObjectType): ObjectAnchorRegionCalculator | undefined {
		return this.calculators.get(type);
	}

	clear(): void {
		this.calculators.clear();
	}
}

export const createObjectAnchorRegionRegistry =
	(): ObjectAnchorRegionRegistry => new ObjectAnchorRegionRegistry();
