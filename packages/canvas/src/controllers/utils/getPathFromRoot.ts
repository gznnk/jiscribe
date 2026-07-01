import { walkParentChain } from "./walkParentChain";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * Traverses from the given object up to the root and returns the path (array of IDs)
 * leading from the root down to the object itself.
 *
 * @param targetId - ID of the target object
 * @param objects - Map of all objects on the canvas
 * @returns Array of IDs from the root element to the target element itself `[rootId, ..., parentId, targetId]`
 */
export function getPathFromRoot(
	targetId: string,
	objects: Record<string, ObjectState>,
): string[] {
	// walkParentChain returns [parent, ..., root], so prepend targetId and reverse.
	return [targetId, ...walkParentChain(targetId, objects)].reverse();
}
