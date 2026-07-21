import type {
	ObjectMenuSectionFactory,
	ObjectMenuSection,
} from "./ObjectMenuTypes";
import type { ObjectType } from "../../../../schemas/objects/types/ObjectType";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";

/**
 * Registry that manages menu section definitions per object type.
 *
 * Registration goes through applyObjectDefinition() in initializeObjectRegistry.ts:
 * a definition's `menuFactory`, or the features-derived default
 * (createDefaultMenuFactory) when omitted.
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
	getSections(type: ObjectType, state: ObjectState): ObjectMenuSection[] {
		return this.factories.get(type)?.(state) ?? [];
	}

	/** Removes all registrations. Call before re-running initializeObjectRegistry. */
	clear(): void {
		this.factories.clear();
	}
}

export const createObjectMenuRegistry = (): ObjectMenuRegistry =>
	new ObjectMenuRegistry();
