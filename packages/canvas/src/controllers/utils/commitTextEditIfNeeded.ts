import { applyLabelPlacement } from "./applyLabelPlacement";
import type { ConnectorLabelPlacement } from "../../domain/state/connector/label/calcConnectorLabelPlacement";
import type { ConnectorLabel } from "../../schemas/objects/connections/connector/ConnectorDoc";
import type { RichText } from "../../schemas/objects/types/RichText";
import { isSameRichText } from "../../schemas/objects/types/RichText";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import {
	isTextStyleState,
	type TextStyleState,
} from "../../states/objects/base/TextStyleState";
import type { ConnectorState } from "../../states/objects/connections/connector/ConnectorState";
import {
	readRichTextSlot,
	writeRichTextSlot,
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
 * When cleared to an empty string the styles are not discarded: the label is kept with only its
 * text emptied, so re-entering text can restore them. The placement is dropped, because it
 * describes a label that no longer exists and would otherwise pin the next one to the old spot.
 * A label left holding nothing but text is not worth keeping, so it is removed entirely
 * (leaving no empty-label junk = back to no label).
 *
 * @param state - the current canvas controller state
 * @param connector - the connector whose label is being updated
 * @param text - the edited text to write back
 * @param placement - placement for a label being created: the double-clicked
 *   point on the line, or the default (midpoint) when creation started from the
 *   Enter shortcut. Applied only alongside non-empty text, so a cancelled or
 *   emptied edit creates nothing. Absent for a re-edit, which keeps the label's
 *   own placement
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
 * Commits one text slot of a text-bearing shape (rect, etc.). The write-back is slot-generic:
 * a slot holding rows takes the edited body split at its newlines (writeRichTextSlot), and the
 * other slots as well as the slot order are left untouched.
 * If unchanged, it only closes the editing session and leaves commitVersion untouched.
 *
 * @param state - the current canvas controller state
 * @param target - the shape whose text is being updated
 * @param slotId - the slot being committed; a slot the shape does not have is discarded
 * @param text - the edited body to write back, styling included
 * @returns a new state reflecting the text (if unchanged, only clears textEditState)
 */
function commitTextSlot(
	state: CanvasControllerState,
	target: TextStyleState & ObjectState,
	slotId: string,
	text: RichText,
): CanvasControllerState {
	const slots = target.text;
	if (slots === undefined || !(slotId in slots)) {
		return clearTextEdit(state);
	}
	const nextSlots = writeRichTextSlot(slots, slotId, text);
	// Compared after the write rather than against the draft itself, so a
	// difference the slot cannot hold (styling on the newline between two rows)
	// does not commit a slot that reads back unchanged.
	if (
		isSameRichText(
			readRichTextSlot(nextSlots, slotId),
			readRichTextSlot(slots, slotId),
		)
	) {
		return clearTextEdit(state);
	}

	const nextTarget = {
		...target,
		text: nextSlots,
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
 * A dispatcher that routes to a dedicated commit function per editing kind.
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

	// Connectors update the nested label.text rather than a slot of state.text.
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
		return commitTextSlot(
			state,
			targetObject,
			textEditState.slotId,
			textEditState.text,
		);
	}
	return clearTextEdit(state);
}
