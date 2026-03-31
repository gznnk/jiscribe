import type { CanvasState } from "../../../states/canvas/CanvasState";
import type { ObjectState } from "../../../states/objects/base/ObjectState";

/**
 * Gets all ancestor IDs of an object, ordered from parent to root.
 * Returns an empty array if the object is at root level.
 *
 * @param state - The canvas state
 * @param objectId - The ID of the object
 * @returns Array of ancestor IDs [parent, grandparent, ..., root]
 * @complexity O(depth) where depth is nesting level (typically < 10)
 *
 * @example
 * // Object hierarchy: root -> group1 -> group2 -> rect
 * getAncestors(state, 'rect-1')
 * // Returns: ['group-2', 'group-1', 'root']
 */
export function getAncestors(
	state: CanvasState,
	objectId: string,
): string[] {
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

	return ancestors;
}

/**
 * Gets all ancestor objects of an object, ordered from parent to root.
 * Returns an empty array if the object is at root level.
 *
 * @param state - The canvas state
 * @param objectId - The ID of the object
 * @returns Array of ancestor objects [parent, grandparent, ..., root]
 *
 * @example
 * // Object hierarchy: root -> group1 -> group2 -> rect
 * getAncestorObjects(state, 'rect-1')
 * // Returns: [GroupState('group-2'), GroupState('group-1'), GroupState('root')]
 */
export function getAncestorObjects(
	state: CanvasState,
	objectId: string,
): ObjectState[] {
	return getAncestors(state, objectId)
		.map((id) => state.objects[id])
		.filter((obj): obj is ObjectState => obj !== undefined);
}
