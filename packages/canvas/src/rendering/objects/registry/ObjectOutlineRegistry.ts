import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { ObjectDocOutlineCalculator } from "@jiscribe/doc/plugin/ObjectDocOutline";
import type { Dimensions } from "@jiscribe/geometry";

/**
 * The canvas's name for a type's outline declaration, which lives on the doc
 * definition (see ObjectDocOutlineCalculator, `ObjectDocDefinition.outline`): the
 * registry calls it with the state, the doc layer with the doc.
 */
export type ObjectOutlineCalculator<TState extends Dimensions = Dimensions> =
	ObjectDocOutlineCalculator<TState>;

/**
 * Per-type registry of outline calculators. Types without a registered
 * calculator fall back to the bounding-box rect/ellipse handling in the
 * connector resolver.
 */
export class ObjectOutlineRegistry {
	private readonly calculators = new Map<ObjectType, ObjectOutlineCalculator>();

	register(type: ObjectType, calculator: ObjectOutlineCalculator): void {
		this.calculators.set(type, calculator);
	}

	get(type: ObjectType): ObjectOutlineCalculator | undefined {
		return this.calculators.get(type);
	}

	clear(): void {
		this.calculators.clear();
	}
}

export const createObjectOutlineRegistry = (): ObjectOutlineRegistry =>
	new ObjectOutlineRegistry();
