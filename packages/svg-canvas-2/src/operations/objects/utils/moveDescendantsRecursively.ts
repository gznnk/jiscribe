import { objectRegistry } from "../../../registry/ObjectRegistry";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/GroupState";

/**
 * Recursively moves all descendant objects by a delta.
 * Used when dragging a group - all children (and grandchildren) need to move.
 * Uses the object registry to call the appropriate moveByDelta function for each object type.
 *
 * @param childIds - IDs of direct children to move
 * @param originalObjects - Original objects from eventStartState
 * @param updatedObjects - Target object to write updates to (mutated)
 * @param delta - Movement delta {x, y}
 */
export function moveDescendantsRecursively(
	childIds: string[],
	originalObjects: Record<string, ObjectState>,
	updatedObjects: Record<string, ObjectState>,
	delta: { x: number; y: number },
): void {
	for (const childId of childIds) {
		const child = originalObjects[childId];
		if (!child) continue;

		// Get the moveByDelta function from the registry
		const moveByDelta = objectRegistry.getMoveByDelta(child.type);
		if (!moveByDelta) {
			console.warn(`No moveByDelta function registered for type: ${child.type}`);
			continue;
		}

		// Move the object using the type-specific moveByDelta function
		updatedObjects[childId] = moveByDelta(child, delta);

		// If this is a group, recursively move its children
		if (child.type === "group") {
			const childGroup = child as GroupState;
			moveDescendantsRecursively(
				childGroup.childIds,
				originalObjects,
				updatedObjects,
				delta,
			);
		}
	}
}
