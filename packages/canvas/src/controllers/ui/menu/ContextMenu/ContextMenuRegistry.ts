import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";

import type { ContextMenuContribution } from "./ContextMenuTypes";

/**
 * Registry that manages the context-menu contribution of each object type.
 *
 * Registration goes through `applyObjectDefinition` (controllers/registries):
 * a definition's `contextMenu`, and nothing at all when omitted — unlike the
 * ObjectMenu and the properties sidebar, a type that declares none has no
 * features-derived default here, the built-in list being the whole menu.
 */
export class ContextMenuRegistry {
	private readonly contributionByType = new Map<
		ObjectType,
		ContextMenuContribution
	>();

	/**
	 * Associates a context-menu contribution with an object type.
	 * Re-registering the same type overwrites the previous contribution.
	 */
	register(type: ObjectType, contribution: ContextMenuContribution): void {
		this.contributionByType.set(type, contribution);
	}

	/**
	 * Contribution of the given type. Returns undefined for a type that declared
	 * none, which is the usual case and means the built-in list alone.
	 */
	getContribution(type: ObjectType): ContextMenuContribution | undefined {
		return this.contributionByType.get(type);
	}

	/** Removes all registrations. */
	clear(): void {
		this.contributionByType.clear();
	}
}

export const createContextMenuRegistry = (): ContextMenuRegistry =>
	new ContextMenuRegistry();
