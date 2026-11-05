import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { ObjectDocDefinition } from "@jiscribe/doc/plugin/ObjectDocDefinition";

/**
 * A type's answer to whether a doc of it is a container other objects sit inside,
 * and how tall its title band is (`ObjectDocDefinition.container`).
 */
export type ObjectContainerCalculator = NonNullable<
	ObjectDocDefinition["container"]
>;

/**
 * Per-type registry of the container declarations, read by the automatic layout
 * so a container shape holds the objects lying inside it. Types without one are
 * boxes like any other.
 */
export class ObjectContainerRegistry {
	private readonly calculators = new Map<
		ObjectType,
		ObjectContainerCalculator
	>();

	register(type: ObjectType, calculator: ObjectContainerCalculator): void {
		this.calculators.set(type, calculator);
	}

	/**
	 * The type's container declaration.
	 *
	 * @param type - The object type; an unregistered one answers undefined
	 */
	get(type: ObjectType): ObjectContainerCalculator | undefined {
		return this.calculators.get(type);
	}

	clear(): void {
		this.calculators.clear();
	}
}

export const createObjectContainerRegistry = (): ObjectContainerRegistry =>
	new ObjectContainerRegistry();
