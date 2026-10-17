import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Marks `state` as holding a confirmed edit of the document by advancing
 * `commitVersion`, which is what makes canvasReducer record a history entry and
 * raise a save request. The writer that edits the document calls this itself;
 * handleGesture's close-out never does, so a gesture that edits nothing leaves
 * no entry behind.
 *
 * @param state - The state already holding the edit
 * @returns `state` with `commitVersion` one past its own
 */
export const commitEdit = (
	state: CanvasControllerState,
): CanvasControllerState => ({
	...state,
	commitVersion: state.commitVersion + 1,
});

/**
 * `commitEdit` for a drag's final step, which hands `state` itself back to say
 * it wrote nothing (the convention every drag handler follows) and anything
 * else to say it did. Commits only the latter, so a drag that found nothing to
 * write leaves no history entry.
 *
 * @param state - The state the step was given
 * @param result - What the step returned, compared to `state` by identity
 * @returns `state` untouched, or `result` committed
 */
export const commitEditIfChanged = (
	state: CanvasControllerState,
	result: CanvasControllerState,
): CanvasControllerState => (result === state ? state : commitEdit(result));
