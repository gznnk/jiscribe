import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type {
	CanvasControllerState,
	TransformDragResize,
} from "../../../../../CanvasTypes";
import { buildSelectedIdsWithDescendants } from "../../../../../utils/buildSelectedIdsWithDescendants";
import { calcObjectResizedAxes } from "../../../../../utils/calcObjectResizedAxes";

/**
 * Strips the flag from the ids that carry it and whose height the resize writes,
 * or returns the map itself when none does.
 */
const settleHeights = (
	objects: Record<string, ObjectState>,
	ids: Iterable<string>,
	resize: TransformDragResize,
): Record<string, ObjectState> => {
	let settled: Record<string, ObjectState> | null = null;
	for (const id of ids) {
		const object = objects[id];
		if (
			object?.autoHeight !== true ||
			calcObjectResizedAxes(resize, object).height === undefined
		) {
			continue;
		}
		settled ??= { ...objects };
		const { autoHeight: _stated, ...fixed } = object;
		settled[id] = fixed as ObjectState;
	}
	return settled ?? objects;
};

/**
 * Ends the dependence of a height on the text for every selected shape a resize
 * about to start can change the height of: dragging a handle is the user stating
 * a height, and the shape keeps the one it is at when the drag begins.
 *
 * A resize that writes the width alone is the exception: widening a shape so its
 * text takes fewer lines is what a height that follows the text is for, so the
 * left and right handles change the width and leave the height to the text —
 * until the aspect ratio is locked or shift is held, which makes them write both
 * axes (calcResizedAxes). Which axis is the height is each shape's own: a child
 * turned 90° in a group resized by its side handles has its height written
 * (calcObjectResizedAxes).
 *
 * Applied to the drag's snapshot as well as to the live objects, since every
 * frame of the drag is rebuilt from that snapshot; without it the flag would come
 * straight back and the derivation would fight the drag frame by frame.
 *
 * @param state - The state the resize starts from; its `activeDrag` names the ids when a
 *   drag opened one, and off a drag (a stated size) the descendants are collected here instead
 * @param resize - The resize about to start, in the dragged frame's terms; null for the rotation knob, which changes no extent
 * @returns `state` itself when the resize leaves the height alone or nothing in the selection was following its text
 */
export const dropAutoHeightOnResize = (
	state: CanvasControllerState,
	resize: TransformDragResize | null,
): CanvasControllerState => {
	if (resize === null) {
		return state;
	}
	const ids =
		state.activeDrag?.startSnapshot.selectedIdsWithDescendants ??
		buildSelectedIdsWithDescendants(state.selection.objectIds, state.objects);
	const objects = settleHeights(state.objects, ids, resize);
	if (objects === state.objects) {
		return state;
	}
	return {
		...state,
		objects,
		activeDrag: state.activeDrag && {
			...state.activeDrag,
			startSnapshot: {
				...state.activeDrag.startSnapshot,
				objects: settleHeights(
					state.activeDrag.startSnapshot.objects,
					ids,
					resize,
				),
			},
		},
	};
};
