import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isTextStyleState } from "../../states/objects/base/TextStyleState";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Commits the current text editing session if active.
 * Updates the object's text and clears textEditState.
 *
 * @param state - Current canvas controller state
 * @returns Updated canvas controller state with text committed, or unchanged state if not editing
 */
export function commitTextEditIfNeeded(
	state: CanvasControllerState,
): CanvasControllerState {
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

	if (text === targetObject.text) {
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
		commitVersion: state.commitVersion + 1,
	};
}
