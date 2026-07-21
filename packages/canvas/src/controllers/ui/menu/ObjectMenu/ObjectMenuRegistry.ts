import type { ObjectMenuSectionFactory, MenuSection } from "./ObjectMenuTypes";
import type { ObjectType } from "../../../../schemas/objects/types/ObjectType";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";

/**
 * Registry that manages menu section definitions per object type.
 *
 * Registration goes through registerObject() in initializeObjectRegistry.ts.
 * To add a custom object, also use registerObject() and have the factory
 * function return that object's dedicated section configuration.
 *
 * @example
 * registerObject("myShape", definition, (state) => [
 *   { id: "style", items: [{ type: "backgroundColor" }] },
 *   { id: "custom", items: [{ type: "custom", id: "myPanel", component: MyPanel }] },
 * ]);
 */
export class ObjectMenuRegistry {
	private readonly factories = new Map<ObjectType, ObjectMenuSectionFactory>();

	/**
	 * Associates a menu section factory with an object type.
	 * Re-registering the same type overwrites the previous factory.
	 */
	register<TState extends ObjectState>(
		type: ObjectType,
		factory: ObjectMenuSectionFactory<TState>,
	): void {
		this.factories.set(type, factory as ObjectMenuSectionFactory);
	}

	/**
	 * Invokes the factory for the given type and returns its menu sections.
	 * Returns an empty array for an unregistered type.
	 */
	getSections(type: ObjectType, state: ObjectState): MenuSection[] {
		return this.factories.get(type)?.(state) ?? [];
	}

	/** Removes all registrations. Call before re-running initializeObjectRegistry. */
	clear(): void {
		this.factories.clear();
	}
}

export const createObjectMenuRegistry = (): ObjectMenuRegistry =>
	new ObjectMenuRegistry();
