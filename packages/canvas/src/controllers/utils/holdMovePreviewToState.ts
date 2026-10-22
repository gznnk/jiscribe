import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Narrows a move preview the drag handler declared this transition to the ids
 * whose object is still the one the handler wrote: whatever settled the
 * transition after it (a re-measured box) is drawn from the state instead.
 *
 * @param state - The settled state, carrying the preview the handler declared
 * @param movedObjects - The objects map as the handler left it, before settling
 * @returns `state` itself when every listed id still holds the handler's object
 *   (or there is no preview), otherwise a state whose preview lists the rest
 */
export const pruneMovePreview = (
	state: CanvasControllerState,
	movedObjects: Record<string, ObjectState>,
): CanvasControllerState => {
	const activeDrag = state.activeDrag;
	const movePreview = activeDrag?.movePreview;
	if (
		activeDrag === null ||
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
		activeDrag: {
			...activeDrag,
			movePreview: { ...movePreview, translatedIds: keptIds },
		},
	};
};

/**
 * Drops a move preview an earlier transition declared once this one has
 * rewritten the objects without declaring it again: the preview speaks for the
 * objects the drag handler wrote, and nothing else is a translation of the
 * start states it draws. The next drag frame declares it afresh.
 *
 * @param state - The transition's resulting state
 * @param previousState - The state the transition started from
 * @returns `state` itself unless the preview is carried over unchanged across a
 *   change of `objects`; otherwise the state with the preview removed
 */
export const dropCarriedOverMovePreview = (
	state: CanvasControllerState,
	previousState: CanvasControllerState,
): CanvasControllerState => {
	const activeDrag = state.activeDrag;
	const movePreview = activeDrag?.movePreview;
	if (
		activeDrag === null ||
		movePreview === undefined ||
		movePreview !== previousState.activeDrag?.movePreview ||
		state.objects === previousState.objects
	) {
		return state;
	}
	return { ...state, activeDrag: { ...activeDrag, movePreview: undefined } };
};
