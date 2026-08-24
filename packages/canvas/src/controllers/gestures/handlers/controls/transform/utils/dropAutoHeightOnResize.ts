import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import type { CanvasEvent } from "../../../../registry/GestureHandlerTypes";
import type { TransformAnchorType } from "../TransformAnchorType";

/**
 * The two anchors that move only a vertical edge, so a drag on them leaves the
 * height exactly where it was. Every other resize anchor moves a horizontal edge
 * as well.
 */
const WIDTH_ONLY_ANCHORS: ReadonlySet<TransformAnchorType> = new Set([
	"leftCenter",
	"rightCenter",
]);

/** Whether the selection resizes both axes together whatever anchor is dragged. */
const keepsProportion = (
	state: CanvasControllerState,
	event: CanvasEvent,
): boolean => {
	if (event.mods.shift) {
		return true;
	}
	if (state.multiSelectGroup) {
		return state.multiSelectGroup.lockAspectRatio ?? false;
	}
	return state.selectedIds.some((id) => {
		const object = state.objects[id];
		return (
			object !== undefined &&
			"lockAspectRatio" in object &&
			object.lockAspectRatio === true
		);
	});
};

/** Strips the flag from the ids that carry it, or returns the map itself when none does. */
const settleHeights = (
	objects: Record<string, ObjectState>,
	ids: Iterable<string>,
): Record<string, ObjectState> => {
	let settled: Record<string, ObjectState> | null = null;
	for (const id of ids) {
		if (objects[id]?.autoHeight !== true) {
			continue;
		}
		settled ??= { ...objects };
		const { autoHeight: _stated, ...fixed } = objects[id];
		settled[id] = fixed as ObjectState;
	}
	return settled ?? objects;
};

/**
 * Ends the dependence of a height on the text for every selected shape a resize
 * about to start can change the height of: dragging a handle is the user stating
 * a height, and the shape keeps the one it is at when the drag begins.
 *
 * A drag on a left or right handle alone is the exception, and the reason this
 * looks at the anchor rather than at the resize: widening a shape so its text
 * takes fewer lines is what a height that follows the text is for, so those two
 * handles change the width and leave the height to the text — until the aspect
 * ratio is locked or shift is held, which makes them scale both axes.
 *
 * Applied to the drag's snapshot as well as to the live objects, since every
 * frame of the drag is rebuilt from that snapshot; without it the flag would come
 * straight back and the derivation would fight the drag frame by frame.
 *
 * @param state - The state the drag starts from, its `eventStartSnapshot` already built
 * @param event - The dragStart, read for the modifier that locks the ratio for this drag alone
 * @param anchorType - The handle being dragged; `"rotation"` changes no extent and is left alone
 * @returns `state` itself when nothing in the selection was following its text
 */
export const dropAutoHeightOnResize = (
	state: CanvasControllerState,
	event: CanvasEvent,
	anchorType: TransformAnchorType,
): CanvasControllerState => {
	if (
		anchorType === "rotation" ||
		(WIDTH_ONLY_ANCHORS.has(anchorType) && !keepsProportion(state, event))
	) {
		return state;
	}
	const ids =
		state.eventStartSnapshot?.selectedIdsWithDescendants ?? state.selectedIds;
	const objects = settleHeights(state.objects, ids);
	if (objects === state.objects) {
		return state;
	}
	return {
		...state,
		objects,
		eventStartSnapshot: state.eventStartSnapshot && {
			...state.eventStartSnapshot,
			objects: settleHeights(state.eventStartSnapshot.objects, ids),
		},
	};
};
