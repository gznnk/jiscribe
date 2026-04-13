import type { CanvasState } from "../../states/canvas/CanvasState";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isTextStyleState } from "../../states/objects/base/TextStyleState";

/**
 * Commits the current text editing session if active.
 * Updates the object's text and clears textEditState.
 *
 * @param state - Current canvas state
 * @param time - Event timestamp for lastCommitTime
 * @returns Updated canvas state with text committed, or unchanged state if not editing
 */
export function commitTextEdit(state: CanvasState, time: number): CanvasState {
	if (!state.textEditState) {
		return state;
	}

	const { objectId, text } = state.textEditState;
	const targetObject = state.objects[objectId];

	if (!targetObject || !isTextStyleState(targetObject)) {
		return {
			...state,
			textEditState: null,
		};
	}

	return {
		...state,
		objects: {
			...state.objects,
			[objectId]: {
				...targetObject,
				text,
			} as ObjectState,
		},
		textEditState: null,
		lastCommitTime: time,
	};
}
