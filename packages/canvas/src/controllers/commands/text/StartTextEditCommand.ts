import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../../states/objects/base/TextStyleState";
import { isTextStyleState } from "../../../states/objects/base/TextStyleState";
import {
	getFirstTextSlotId,
	readRichTextSlot,
} from "../../../states/objects/types/TextSlots";
import { isTextSlotSelection } from "../../selection/partKinds/textSlotPartKind";
import { getSelectedConnectorId } from "../../selection/readers/getSelectedConnectorId";
import { readActivePartFocusId } from "../../selection/readers/readActivePartFocusId";
import { selectTextSlot } from "../../selection/writers/selectTextSlot";
import { DEFAULT_LABEL_PLACEMENT } from "../../utils/applyLabelPlacement";
import type { ExecutableCommand } from "../CommandTypes";

/**
 * Whether the shape can start text editing.
 * Only shapes that hold text (features.text, in either shape) qualify; the
 * structural guard supplements this by checking value validity. isTextStyleState
 * alone is a loose guard that only checks the text attributes are internally
 * consistent, so it would also pass shapes with no text at all (svg / polyline /
 * polygon, etc.); this aligns on the same features.text criterion the style
 * tables gate the text intents with (textStyleTable).
 */
const canEditText = (
	object: ObjectState | undefined,
): object is ObjectState & TextStyleState =>
	object != null &&
	object.features?.text !== undefined &&
	isTextStyleState(object);

export const StartTextEditCommand: ExecutableCommand = {
	id: "start-text-edit",
	label: { en: "Start Text Editing", ja: "テキスト編集を開始" },
	category: "edit",
	shortcuts: {
		default: [{ code: "Enter" }],
	},

	canExecute(state) {
		// Cannot execute while text editing is already in progress
		if (state.textEditState) {
			return false;
		}

		// A selected connector edits its label instead.
		if (getSelectedConnectorId(state) !== null) {
			return true;
		}

		// Single selection only
		if (state.selection.objectIds.length !== 1) {
			return false;
		}

		return canEditText(state.objects[state.selection.objectIds[0]]);
	},

	execute(state, registries) {
		// When a connector is selected, start editing its label (label.text).
		const connectorId = getSelectedConnectorId(state);
		if (connectorId !== null) {
			const connector = state.objects[connectorId];
			const labelText =
				(connector as { label?: { text?: string } }).label?.text ?? "";
			return {
				...state,
				// An open submenu does not survive the edit session (the menu is hidden or
				// re-laid out), so it would otherwise pop back on exit.
				objectMenuOpenId: null,
				// The selection is already that one connector
				// (getSelectedConnectorId), so only a part picked below it has to go:
				// the label is no part, and the session's owner must be the object
				// itself (see textEditState).
				selection:
					state.selection.part === null
						? state.selection
						: { ...state.selection, part: null },
				textEditState: {
					kind: "connectorLabel",
					text: labelText,
					// Enter carries no pointer position, so a label being created takes
					// the default placement. Without it the commit would spread the
					// connector's own keys and revive the placement of a deleted label
					// (the pointer path overrides those with the clicked point).
					...(labelText === "" ? { placement: DEFAULT_LABEL_PLACEMENT } : {}),
				},
			};
		}

		const objectId = state.selection.objectIds[0];
		const targetObject = state.objects[objectId];

		if (!canEditText(targetObject)) {
			return state;
		}

		// Enter carries no pointer position, so the slot already selected one level
		// below the object decides, falling back to the first slot when none is
		// (nothing picked, or a part of another kind). The editor opens on one slot,
		// so a range opens it on the slot the last gesture moved to.
		const { part } = state.selection;
		const slotId = isTextSlotSelection(part)
			? readActivePartFocusId(part)
			: getFirstTextSlotId(targetObject.text);
		if (slotId === undefined) {
			return state;
		}

		return {
			...state,
			objectMenuOpenId: null,
			// The slot being edited is the selection (see textEditState), so the one
			// the fallback picked is written there too; a slot already selected keeps
			// the reference.
			selection: selectTextSlot(
				state.selection,
				targetObject,
				slotId,
				registries.objectPartKind,
			),
			textEditState: {
				kind: "shape",
				text: readRichTextSlot(targetObject.text, slotId),
			},
		};
	},
};
