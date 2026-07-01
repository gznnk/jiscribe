import type { CanvasState } from "../../../../../states/canvas/CanvasState";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";
import { getTopLevelSelectedIds } from "../../../../utils/getTopLevelSelectedIds";

/**
 * For the selected objects, when all children of a group are selected, deselect the children
 * and select the group itself, repeating this upward through the hierarchy.
 *
 * Example: when all children [rect-1, rect-2, rect-3] of group-1 are selected
 *   Input:  ['rect-1', 'rect-2', 'rect-3']
 *   Output: ['group-1']
 *
 * ### Flow
 * ① Remove descendants whose ancestor is already selected (enforcing the invariant).
 *   Even if a group and its descendants both end up in selectedIds (e.g. via area selection),
 *   drop the descendants and keep only the top-level items.
 * ② Fold groups whose "all children are selected" upward toward the parents, worklist-style.
 *   - Enqueue the direct parent group of each selected item as a starting point.
 *   - If all children of a group taken from the queue are selected, remove the children from the
 *     selection and select the group itself (fold), then enqueue that group's parent for re-inspection.
 *   - Even if a group is inspected first and skipped because not all children are selected, its parent
 *     is enqueued again once a child group is later folded, so the result is order-independent.
 *
 * ### Complexity
 * Each group is folded at most once (guaranteed by collapsed). A re-inspection is enqueued only
 * upon "folding one of the children", so the number of folds is bounded by the number of groups.
 * Each dequeue's cost is proportional to the childIds count, so overall it stays linear O(N) in the
 * number of involved objects (resolving the old implementation's while(changed) full scan and the
 * O(N^2)-ish neighborhood of shift-based BFS).
 *
 * ### Termination guarantee
 * Folding happens at most as many times as the number of groups due to the monotonically increasing
 * collapsed set, and re-enqueuing is bounded accordingly. Initial enqueuing is finite too.
 * Therefore the loop always terminates even if parentId / childIds contain circular references.
 */
export function autoSelectParentGroups(
	state: CanvasState,
	selectedIds: string[],
): string[] {
	// ① Remove descendants whose ancestor is already selected
	const selected = new Set(getTopLevelSelectedIds(selectedIds, state.objects));

	// ② Queue of groups to re-inspect. The Set's insertion order keeps the result order stable.
	const queue: string[] = [];
	const queued = new Set<string>();
	const enqueue = (groupId: string): void => {
		if (!queued.has(groupId)) {
			queued.add(groupId);
			queue.push(groupId);
		}
	};

	// Starting points: the direct parent groups of the current selected items
	for (const id of selected) {
		const parentId = state.objects[id]?.parentId;
		if (parentId != null) {
			enqueue(parentId);
		}
	}

	// Already-folded groups (prevents re-folding / infinite loops)
	const collapsed = new Set<string>();

	let head = 0;
	while (head < queue.length) {
		const groupId = queue[head];
		head++;
		// Dequeued, so allow re-enqueuing during re-inspection triggered by a child fold
		queued.delete(groupId);

		if (collapsed.has(groupId)) {
			continue;
		}

		const group = state.objects[groupId];
		if (!group || group.type !== "group") {
			continue;
		}

		const { childIds } = group as GroupState;
		if (childIds.length === 0) {
			continue;
		}

		// If not all children are selected, it cannot be folded yet
		if (!childIds.every((childId) => selected.has(childId))) {
			continue;
		}

		// Fold: remove the children from the selection and select the group itself.
		// Since a child group has already been folded into itself and is in the selection set,
		// replacing only the direct childIds completes the descendant removal as well.
		for (const childId of childIds) {
			selected.delete(childId);
		}
		selected.add(groupId);
		collapsed.add(groupId);

		// This group's parent may newly become "all children selected", so re-inspect it
		const parentId = group.parentId;
		if (parentId != null) {
			enqueue(parentId);
		}
	}

	return [...selected];
}
