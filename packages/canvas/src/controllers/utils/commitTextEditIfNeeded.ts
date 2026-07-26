import { applyLabelPlacement } from "./applyLabelPlacement";
import type { ConnectorLabelPlacement } from "../../presentations/layers/content/utils/label/calcConnectorLabelPlacement";
import type { ConnectorLabel } from "../../schemas/objects/connections/connector/ConnectorDoc";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import {
	isTextStyleState,
	type TextStyleState,
} from "../../states/objects/base/TextStyleState";
import type { ConnectorState } from "../../states/objects/connections/connector/ConnectorState";
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
 * When cleared to an empty string the styles are not discarded: the label is kept with only its
 * text emptied, so re-entering text can restore them. The placement is dropped, because it
 * describes a label that no longer exists and would otherwise pin the next one to the old spot.
 * A label left holding nothing but text is not worth keeping, so it is removed entirely
 * (leaving no empty-label junk = back to no label).
 *
 * @param state - the current canvas controller state
 * @param connector - the connector whose label is being updated
 * @param text - the edited text to write back
 * @param placement - placement for a label being created (the double-clicked
 *   point on the line). Applied only alongside non-empty text, so a cancelled or
 *   emptied edit creates nothing
 * @returns a new state reflecting the label (if unchanged, only clears textEditState)
 */
function commitConnectorLabel(
	state: CanvasControllerState,
	connector: ConnectorState,
	text: string,
	placement: ConnectorLabelPlacement | undefined,
): CanvasControllerState {
	const currentText = connector.label?.text ?? "";
	if (text === currentText) {
		return clearTextEdit(state);
	}

	let nextConnector: ConnectorState;
	if (text === "") {
		// If any style remains, keep the label and empty only its text.
		const {
			text: _clearedText,
			position: _clearedPosition,
			offset: _clearedOffset,
			...labelStyles
		} = connector.label ?? {};
		if (Object.keys(labelStyles).length === 0) {
			// A label with no style left is removed entirely, reverting to no label.
			const { label: _removed, ...rest } = connector;
			nextConnector = rest as ConnectorState;
		} else {
			nextConnector = {
				...connector,
				label: { ...labelStyles, text: "" },
			} as ConnectorState;
		}
	} else {
		const label: ConnectorLabel = { ...connector.label, text };
		nextConnector = {
			...connector,
			label: placement ? applyLabelPlacement(label, placement) : label,
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
 * Commits the body text of a text-bearing shape (rect, etc.).
 * If unchanged, it only closes the editing session and leaves commitVersion untouched.
 *
 * @param state - the current canvas controller state
 * @param target - the shape whose text is being updated
 * @param text - the edited text to write back
 * @returns a new state reflecting the text (if unchanged, only clears textEditState)
 */
function commitTextStyleText(
	state: CanvasControllerState,
	target: TextStyleState & ObjectState,
	text: string,
): CanvasControllerState {
	if (text === target.text) {
		return clearTextEdit(state);
	}

	return {
		...state,
		objects: {
			...state.objects,
			[target.id]: { ...target, text } as ObjectState,
		},
		textEditState: null,
		commitVersion: state.commitVersion + 1,
	};
}

/**
 * Commits the active text editing session, if any.
 * A dispatcher that simply routes to a dedicated commit function per editing kind.
 * The target object is re-checked here because the session only holds an id, which
 * may no longer resolve to an object of the expected type.
 *
 * @param state - the current canvas controller state
 * @returns a new state reflecting the text (if not editing, returns the original state unchanged)
 */
export function commitTextEditIfNeeded(
	state: CanvasControllerState,
): CanvasControllerState {
	const { textEditState } = state;
	if (!textEditState) {
		return state;
	}

	const targetObject = state.objects[textEditState.objectId];
	if (!targetObject) {
		return clearTextEdit(state);
	}

	// Connectors update the nested label.text rather than a body text.
	if (textEditState.kind === "connectorLabel") {
		if (targetObject.type !== "connector") {
			return clearTextEdit(state);
		}
		return commitConnectorLabel(
			state,
			targetObject as ConnectorState,
			textEditState.text,
			textEditState.placement,
		);
	}

	if (isTextStyleState(targetObject)) {
		return commitTextStyleText(state, targetObject, textEditState.text);
	}
	return clearTextEdit(state);
}
