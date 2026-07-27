import { LABEL_TEXT_SLOT_ID } from "../../constants/textSlotId";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import {
	isTextStyleState,
	type TextStyleState,
} from "../../states/objects/base/TextStyleState";
import type { ConnectorState } from "../../states/objects/connections/connector/ConnectorState";
import {
	readTextSlot,
	writeTextSlot,
} from "../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Ends the editing session only (does not modify any object).
 *
 * @param state - the current canvas controller state
 * @returns a new state with textEditState cleared
 */
function clearTextEdit(state: CanvasControllerState): CanvasControllerState {
	return { ...state, textEditState: null };
}

/**
 * Commits a connector's label edit. The text is written back to `label.text` (nested).
 * Even when cleared to an empty string, the style/placement is not discarded: the label is kept
 * with only its text emptied, so re-entering text can restore it. However, a bare label that holds
 * only text is not worth keeping, so it is removed entirely (leaving no empty-label junk = back to no label).
 *
 * @param state - the current canvas controller state
 * @param connector - the connector whose label is being updated
 * @param text - the edited text to write back
 * @returns a new state reflecting the label (if unchanged, only clears textEditState)
 */
function commitConnectorLabel(
	state: CanvasControllerState,
	connector: ConnectorState,
	text: string,
): CanvasControllerState {
	const currentText = connector.label?.text ?? "";
	if (text === currentText) {
		return clearTextEdit(state);
	}

	let nextConnector: ConnectorState;
	if (text === "") {
		// If anything besides text remains (style/placement), keep the label and empty only its text.
		const { text: _clearedText, ...labelWithoutText } = connector.label ?? {};
		if (Object.keys(labelWithoutText).length === 0) {
			// A bare label (text only) is removed entirely, reverting to no label.
			const { label: _removed, ...rest } = connector;
			nextConnector = rest as ConnectorState;
		} else {
			nextConnector = {
				...connector,
				label: { ...labelWithoutText, text: "" },
			} as ConnectorState;
		}
	} else {
		nextConnector = {
			...connector,
			label: { ...connector.label, text },
		} as ConnectorState;
	}

	return {
		...state,
		objects: {
			...state.objects,
			[connector.id]: nextConnector as ObjectState,
		},
		textEditState: null,
		commitVersion: state.commitVersion + 1,
	};
}

/**
 * Commits one text slot of a text-bearing shape (rect, etc.). The write-back is slot-generic:
 * a slot holding rows takes the edited text split on "\n" (writeTextSlot), and the other slots
 * as well as the slot order are left untouched.
 * If unchanged, it only closes the editing session and leaves commitVersion untouched.
 *
 * @param state - the current canvas controller state
 * @param target - the shape whose text is being updated
 * @param slotId - the slot being committed; a slot the shape does not have is discarded
 * @param text - the edited text to write back
 * @returns a new state reflecting the text (if unchanged, only clears textEditState)
 */
function commitTextSlot(
	state: CanvasControllerState,
	target: TextStyleState & ObjectState,
	slotId: string,
	text: string,
): CanvasControllerState {
	const slots = target.text;
	if (slots === undefined || !(slotId in slots)) {
		return clearTextEdit(state);
	}
	if (text === readTextSlot(slots, slotId)) {
		return clearTextEdit(state);
	}

	const nextTarget = {
		...target,
		text: writeTextSlot(slots, slotId, text),
	};

	return {
		...state,
		objects: {
			...state.objects,
			[target.id]: nextTarget as ObjectState,
		},
		textEditState: null,
		commitVersion: state.commitVersion + 1,
	};
}

/**
 * Commits the active text editing session, if any.
 * A dispatcher that routes to a dedicated commit function per edited slot.
 *
 * @param state - the current canvas controller state
 * @returns a new state reflecting the text (if not editing, returns the original state unchanged)
 */
export function commitTextEditIfNeeded(
	state: CanvasControllerState,
): CanvasControllerState {
	if (!state.textEditState) {
		return state;
	}

	const { objectId, slotId, text } = state.textEditState;
	const targetObject = state.objects[objectId];

	if (!targetObject) {
		return clearTextEdit(state);
	}
	// The object kind decides the route, not the slot id: a connector's one
	// editable text is its nested label.text (the LABEL_TEXT_SLOT_ID pseudo
	// slot), while on a shape "label" is a slot name like any other.
	if (targetObject.type === "connector") {
		if (slotId !== LABEL_TEXT_SLOT_ID) {
			return clearTextEdit(state);
		}
		return commitConnectorLabel(state, targetObject as ConnectorState, text);
	}
	if (isTextStyleState(targetObject)) {
		return commitTextSlot(state, targetObject, slotId, text);
	}
	return clearTextEdit(state);
}
