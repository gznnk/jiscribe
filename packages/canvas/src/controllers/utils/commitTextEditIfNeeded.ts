import type { ConnectorLabel } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import type { RichText } from "@jiscribe/doc/model/objects/types/text/RichText";
import { isSameRichText } from "@jiscribe/doc/model/objects/types/text/RichText";

import { applyLabelPlacement } from "./applyLabelPlacement";
import { clearConnectorLabel } from "./clearConnectorLabel";
import { NORMAL_MODE } from "./normalMode";
import { readOpenTextEdit } from "./readOpenTextEdit";
import type { ConnectorLabelPlacement } from "../../rendering/objects/connector/geometry/label/calcConnectorLabelPlacement";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../states/objects/base/TextStyleState";
import type { ConnectorState } from "../../states/objects/connector/ConnectorState";
import {
	readRichTextSlot,
	writeRichTextSlot,
} from "../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Ends the editing session only (does not modify any object).
 *
 * @param state - the current canvas controller state
 * @returns a new state with the session closed (`mode` back to normal)
 */
function clearTextEdit(state: CanvasControllerState): CanvasControllerState {
	return { ...state, mode: NORMAL_MODE };
}

/**
 * Commits a connector's label edit. The text is written back to `label.text` (nested).
 * Cleared to an empty string, the label is taken away the way Delete takes a
 * picked one away (clearConnectorLabel).
 *
 * @param state - the current canvas controller state
 * @param connector - the connector whose label is being updated
 * @param text - the edited text to write back
 * @param placement - placement for a label being created: the double-clicked
 *   point on the line, or the default (midpoint) when creation started from the
 *   Enter shortcut. Applied only alongside non-empty text, so a cancelled or
 *   emptied edit creates nothing. Absent for a re-edit, which keeps the label's
 *   own placement
 * @returns a new state reflecting the label (if unchanged, only closes the session)
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
		nextConnector = clearConnectorLabel(connector);
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
		mode: NORMAL_MODE,
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
 * @returns a new state reflecting the text (if unchanged, only closes the session)
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
		mode: NORMAL_MODE,
		commitVersion: state.commitVersion + 1,
	};
}

/**
 * Commits the active text editing session, if any.
 * A dispatcher that routes to a dedicated commit function per editing kind.
 *
 * @param state - the current canvas controller state
 * @returns a new state reflecting the text (if not editing, returns the original state unchanged)
 */
export function commitTextEditIfNeeded(
	state: CanvasControllerState,
): CanvasControllerState {
	if (state.mode.kind !== "textEdit") {
		return state;
	}
	const openEdit = readOpenTextEdit(state);
	if (openEdit === null) {
		return state;
	}

	// Connectors update the nested label.text rather than a slot of state.text.
	if (openEdit.kind === "connectorLabel") {
		return commitConnectorLabel(
			state,
			openEdit.connector,
			openEdit.text,
			openEdit.placement,
		);
	}
	return commitTextSlot(
		state,
		openEdit.object,
		openEdit.textSlotId,
		openEdit.text,
	);
}
