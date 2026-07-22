import type { ObjectMenuSection } from "./ObjectMenuTypes";
import type { ObjectType } from "../../../../schemas/objects/types/ObjectType";

/**
 * Registry that manages menu section definitions per object type.
 *
 * Registration goes through applyObjectDefinition() in initializeObjectRegistry.ts:
 * a definition's `menu`, or the features-derived default (createDefaultMenu) when
 * omitted.
 */
export class ObjectMenuRegistry {
	private readonly sectionsByType = new Map<ObjectType, ObjectMenuSection[]>();

	/**
	 * Associates menu sections with an object type.
	 * Re-registering the same type overwrites the previous sections.
	 */
	register(type: ObjectType, sections: ObjectMenuSection[]): void {
		this.sectionsByType.set(type, sections);
	}

	/** Menu sections for the given type. Returns an empty array for an unregistered type. */
	getSections(type: ObjectType): ObjectMenuSection[] {
		return this.sectionsByType.get(type) ?? [];
	}

	/** Removes all registrations. Call before re-running initializeObjectRegistry. */
	clear(): void {
		this.sectionsByType.clear();
	}
}

export const createObjectMenuRegistry = (): ObjectMenuRegistry =>
	new ObjectMenuRegistry();
