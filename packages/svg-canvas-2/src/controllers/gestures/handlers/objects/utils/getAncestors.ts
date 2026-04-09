import type { CanvasState } from "../../../../../states/canvas/CanvasState";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";

/**
 * Gets all ancestor IDs of an object, ordered from root to leaf (outermost to innermost).
 * Returns an empty array if the object is at root level.
 *
 * This matches the behavior of svg-canvas's getAncestorItemsById.
 *
 * @param state - The canvas state
 * @param objectId - The ID of the object
 * @returns Array of ancestor IDs [root, ..., grandparent, parent]
 * @complexity O(depth) where depth is nesting level (typically < 10)
 *
 * @example
 * // Object hierarchy: root -> group1 -> group2 -> rect
 * getAncestors(state, 'rect-1')
 * // Returns: ['root', 'group-1', 'group-2']
 */
export function getAncestors(state: CanvasState, objectId: string): string[] {
	const ancestors: string[] = [];
	let currentId: string | undefined = objectId;
	const visited = new Set<string>();

	while (currentId) {
		const obj: ObjectState | undefined = state.objects[currentId];
		if (!obj || !obj.parentId) {
			break;
		}

		// Circular reference detection (safety check)
		if (visited.has(obj.parentId)) {
			console.warn(
				`Circular reference detected in object hierarchy at ${obj.parentId}`,
			);
			break;
		}

		ancestors.push(obj.parentId);
		visited.add(currentId);
		currentId = obj.parentId;
	}

	// Reverse to match svg-canvas order: root to leaf (outermost to innermost)
	return ancestors.reverse();
}
