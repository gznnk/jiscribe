import type { CanvasControllerState } from "../../../../CanvasTypes";
import { walkParentChain } from "../../../../utils/walkParentChain";

/**
 * Gets all ancestor IDs of an object, ordered from root to leaf (outermost to innermost).
 * Returns an empty array if the object is at root level.
 *
 * Circular references in the hierarchy are detected and broken by the shared
 * {@link walkParentChain} utility (visited-set guard).
 *
 * @param state - The canvas controller state
 * @param objectId - The ID of the object
 * @returns Array of ancestor IDs [root, ..., grandparent, parent]
 * @complexity O(depth) where depth is nesting level (typically < 10)
 *
 * @example
 * // Object hierarchy: root -> group1 -> group2 -> rect
 * getAncestors(state, 'rect-1')
 * // Returns: ['root', 'group-1', 'group-2']
 */
export function getAncestors(
	state: CanvasControllerState,
	objectId: string,
): string[] {
	// walkParentChain returns [parent, ..., root], so reverse it into root->leaf order.
	return walkParentChain(objectId, state.objects).reverse();
}
