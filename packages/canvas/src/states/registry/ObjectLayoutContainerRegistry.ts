import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { ObjectDocDefinition } from "@jiscribe/doc/plugin/ObjectDocDefinition";

/**
 * A type's answer to whether a doc of it is a container other objects sit inside,
 * and how tall its title band is (`ObjectDocDefinition.layoutContainer`).
 */
export type ObjectLayoutContainerCalculator = NonNullable<
	ObjectDocDefinition["layoutContainer"]
>;

/**
 * Per-type registry of the container declarations, read by the automatic layout
 * so a container shape holds the objects lying inside it. Types without one are
 * boxes like any other.
 */
export class ObjectLayoutContainerRegistry {
	private readonly calculators = new Map<
		ObjectType,
		ObjectLayoutContainerCalculator
	>();

	register(
		type: ObjectType,
		calculator: ObjectLayoutContainerCalculator,
	): void {
		this.calculators.set(type, calculator);
	}

	/**
	 * The type's container declaration.
	 *
	 * @param type - The object type; an unregistered one answers undefined
	 */
	get(type: ObjectType): ObjectLayoutContainerCalculator | undefined {
		return this.calculators.get(type);
	}

	clear(): void {
		this.calculators.clear();
	}
}

export const createObjectLayoutContainerRegistry =
	(): ObjectLayoutContainerRegistry => new ObjectLayoutContainerRegistry();
