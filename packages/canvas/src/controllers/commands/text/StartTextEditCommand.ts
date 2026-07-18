import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { isTextStyleState } from "../../../states/objects/base/TextStyleState";
import type { ExecutableCommand } from "../CommandTypes";

/**
 * Whether the shape can start text editing.
 * Only shapes that hold text (features.text) qualify; the structural guard
 * supplements this by checking value validity. isTextStyleState alone is a loose
 * guard that only checks the text attributes are internally consistent, so it would
 * also pass shapes with no text at all (svg / polyline / polygon, etc.); this aligns
 * on the same features.text criterion used by the property-update side
 * (FeatureGatedStyleProperty's text gate).
 */
const canEditText = (
	object: ObjectState | undefined,
): object is ObjectState & { text?: string } =>
	object != null && object.features?.text === true && isTextStyleState(object);

export const StartTextEditCommand: ExecutableCommand = {
	id: "start-text-edit",
	label: "Start Text Editing",
	category: "edit",
	shortcuts: {
		default: [{ code: "Enter" }],
	},

	canExecute(state) {
		// Cannot execute while text editing is already in progress
		if (state.textEditState) {
			return false;
		}

		// A single connector selection (selectedConnectorId) allows label editing.
		if (state.selectedConnectorId && state.selectedIds.length === 0) {
			return state.objects[state.selectedConnectorId]?.type === "connector";
		}

		// Single selection only
		if (state.selectedIds.length !== 1) {
			return false;
		}

		return canEditText(state.objects[state.selectedIds[0]]);
	},

	execute(state) {
		// When a connector is selected, start editing its label (label.text).
		if (state.selectedConnectorId && state.selectedIds.length === 0) {
			const connector = state.objects[state.selectedConnectorId];
			if (connector?.type !== "connector") {
				return state;
			}
			return {
				...state,
				textEditState: {
					objectId: state.selectedConnectorId,
					text: (connector as { label?: { text?: string } }).label?.text ?? "",
				},
			};
		}

		const objectId = state.selectedIds[0];
		const targetObject = state.objects[objectId];

		if (!canEditText(targetObject)) {
			return state;
		}

		return {
			...state,
			textEditState: {
				objectId,
				text: targetObject.text ?? "",
			},
		};
	},
};
