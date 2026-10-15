import { collectCowChangedKeys } from "./cowObjects";
import { updateAffectedGroupBounds } from "./updateAffectedGroupBounds";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isGroupState } from "../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Settles the cached frames above every object a transition rewrote, by
 * comparing the two object maps rather than by being told what moved.
 *
 * **A backstop, not a replacement for the writers that name their ids.** The
 * settling passes fall into two kinds, and this is the second:
 *
 * - A writer that knows what it touched says so, right where it touched it
 *   (`updateGroupBoundsFromRoot` in DeleteCommand / GroupCommand / the vertex
 *   handlers, `updateAffectedGroupBounds` in MoveCommands / ObjectEventHandler,
 *   `updateGroupBoundsForSelection` at a transform dragEnd). Those calls settle
 *   more than a box diff can see (an object the transition **removed** is gone
 *   from the map this pass reads), and they also clean up the groups a removal
 *   empties or leaves with one child (`cleanupGroups`). Deleting one of them as
 *   "now redundant" reopens that case.
 * - A writer core hands the map to and gets an object back has nothing to name,
 *   and that is what this covers (`handleCommand`, the selection-control
 *   write-back). It is the half a plugin reaches, so it settles without the
 *   plugin naming anything — which is the point: there is no call for a plugin
 *   author to forget. A group whose `childIds` the transition replaced is
 *   recomputed itself as well as its ancestors, so a writer that takes a child
 *   out of a group leaves the frame fitting the children that remain; a group
 *   that only moved with its children keeps the frame it was moved to. A group
 *   left with no children keeps its previous frame and stays in the map;
 *   removing it is the writer's call.
 *
 * The one automatic pass that came before this
 * ({@link import("./reconcileObjectContentSizes").reconcileObjectContentSizes})
 * settles ancestors only for the objects **its own resizer** moved, so a writer
 * handing over a box it already derived went unsettled — see that file for the
 * whole of it.
 *
 * @param state - The transition's resulting state; its `objects` are what the group frames are recomputed from
 * @param previousState - The state the transition started from, supplying the references compared against; passing `state` itself returns it unchanged
 * @returns The same state reference when nothing inside a group was rewritten and no group's membership changed; otherwise a state with those frames recomputed
 */
export const reconcileGroupBounds = (
	state: CanvasControllerState,
	previousState: CanvasControllerState,
): CanvasControllerState => {
	if (state.objects === previousState.objects) {
		return state;
	}

	const rewrittenIds: string[] = [];
	const collectIfRewritten = (id: string, object: ObjectState): void => {
		const previousObject = previousState.objects[id];
		if (object === previousObject) {
			return;
		}
		rewrittenIds.push(id);
		// updateAffectedGroupBounds settles the groups above an id, so a group whose
		// membership changed is named through a child it still holds; one left
		// empty has nothing to recompute from.
		if (
			isGroupState(object) &&
			isGroupState(previousObject) &&
			object.childIds !== previousObject.childIds
		) {
			const remainingChildId = object.childIds.find(
				(childId) => state.objects[childId] !== undefined,
			);
			if (remainingChildId !== undefined) {
				rewrittenIds.push(remainingChildId);
			}
		}
	};

	// While a drag holds the map as a copy-on-write view, every untouched ID is
	// the same reference in both maps, so the scan collapses to the overlay
	// (collectCowChangedKeys). Maps sharing no backing Record fall back to the
	// full scan, where the same reference comparison does the filtering.
	const changedIds = collectCowChangedKeys(
		state.objects,
		previousState.objects,
	);
	if (changedIds) {
		for (const id of changedIds) {
			// An ID only the previous map held names nothing to measure from here.
			const object = state.objects[id];
			if (object) {
				collectIfRewritten(id, object);
			}
		}
	} else {
		for (const [id, object] of Object.entries(state.objects)) {
			collectIfRewritten(id, object);
		}
	}

	return rewrittenIds.length === 0
		? state
		: updateAffectedGroupBounds(state, rewrittenIds);
};
