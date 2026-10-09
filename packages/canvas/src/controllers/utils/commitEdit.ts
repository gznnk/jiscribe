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
