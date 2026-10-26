import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Narrows a move preview to the ids whose object is still the one the move
 * wrote: whatever rewrote one after it (a box re-measured by the settling or
 * by a font arriving) is drawn from the state instead.
 *
 * @param state - The state after the rewrite, carrying the preview
 * @param movedObjects - The objects map the preview speaks for: the drag
 *   handler's own output on a drag frame, the state before the rewrite otherwise
 * @returns `state` itself when every listed id still holds that object (or there
 *   is no preview), otherwise a state whose preview lists the rest
 */
export const pruneMovePreview = (
	state: CanvasControllerState,
	movedObjects: Record<string, ObjectState>,
): CanvasControllerState => {
	const { drag } = state;
	const movePreview = drag?.kind === "move" ? drag.movePreview : undefined;
	if (
		drag?.kind !== "move" ||
		movePreview === undefined ||
		state.objects === movedObjects
	) {
		return state;
	}
	const isStillMoved = (id: string): boolean =>
		state.objects[id] === movedObjects[id];
	if ([...movePreview.translatedIds].every(isStillMoved)) {
		return state;
	}
	const keptIds = new Set([...movePreview.translatedIds].filter(isStillMoved));
	return {
		...state,
		drag: {
			...drag,
			movePreview: { ...movePreview, translatedIds: keptIds },
		},
	};
};
