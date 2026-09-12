import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";

import type { PropertyPanelSection } from "./PropertyPanelTypes";

/**
 * Registry that manages properties-sidebar section definitions per object type.
 *
 * Registration goes through `applyObjectDefinition` (controllers/registries):
 * a definition's `propertyPanel`, or the features-derived default
 * (createDefaultPropertyPanel) when omitted.
 */
export class PropertyPanelRegistry {
	private readonly sectionsByType = new Map<
		ObjectType,
		PropertyPanelSection[]
	>();

	/**
	 * Associates sidebar sections with an object type.
	 * Re-registering the same type overwrites the previous sections.
	 */
	register(type: ObjectType, sections: PropertyPanelSection[]): void {
		this.sectionsByType.set(type, sections);
	}

	/** Sidebar sections for the given type. Returns an empty array for an unregistered type. */
	getSections(type: ObjectType): PropertyPanelSection[] {
		return this.sectionsByType.get(type) ?? [];
	}

	/** Removes all registrations. */
	clear(): void {
		this.sectionsByType.clear();
	}
}

export const createPropertyPanelRegistry = (): PropertyPanelRegistry =>
	new PropertyPanelRegistry();
