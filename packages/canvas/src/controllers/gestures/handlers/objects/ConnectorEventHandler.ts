import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { commitTextEditIfNeeded } from "../../../utils/commitTextEditIfNeeded";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";

/**
 * Handles click events on connectors.
 * Connectors are selected independently from objects (selectedConnectorId vs selectedIds).
 * Only single selection is supported; selecting a connector clears selectedIds, and vice versa.
 *
 * Label editing (label.text) starts on a double click, with the edit target
 * depending on whether a label exists:
 * - No committed label: a double click anywhere on the line starts editing
 *   (there is no label box to aim at yet).
 * - Committed label: only a double click on the label box (targetPart "label")
 *   starts editing; a double click on the bare line just selects.
 *
 * While editing, the label box is covered by the editor overlay
 * (data-gesture="none"), so any tap that reaches this handler is outside the
 * label and commits the pending edit like any other outside tap.
 */
export const ConnectorEventHandler: GestureHandler = {
	supports(event: CanvasEvent): boolean {
		return (
			event.targetKind === "connector" &&
			// TODO: this filtering may no longer be necessary here
			(event.type === "click" ||
				event.type === "pressed" ||
				event.type === "doubleClick")
		);
	},

	handle(
		state: CanvasControllerState,
		event: CanvasEvent,
	): CanvasControllerState {
		// Only left-click (button 0)
		if (event.button !== 0) {
			return state;
		}

		const connectorId = event.targetId;
		let nextState = commitTextEditIfNeeded(state);

		// A double click selects the connector, and starts label editing when it
		// hits the edit target (see the doc comment above).
		if (event.type === "doubleClick") {
			if (!connectorId) {
				return nextState;
			}
			const connector = nextState.objects[connectorId];
			if (connector?.type !== "connector") {
				return nextState;
			}
			const labelText = (connector as ConnectorState).label?.text ?? "";
			const selectedState = {
				...nextState,
				selectedConnectorId: connectorId,
				selectedIds: [],
				multiSelectGroup: null,
			};
			if (labelText !== "" && event.targetPart !== "label") {
				return selectedState;
			}
			return {
				...selectedState,
				textEditState: {
					objectId: connectorId,
					text: labelText,
				},
			};
		}

		// A press on a connector closes the context menu (button is guarded above, selection happens on click)
		if (event.type === "pressed") {
			nextState = { ...nextState, contextMenuPosition: null };
		}

		// A click selects the connector (clearing shape selection to enforce exclusivity)
		// No change if the same connector is already selected
		if (
			event.type === "click" &&
			connectorId &&
			nextState.selectedConnectorId !== connectorId
		) {
			nextState = {
				...nextState,
				selectedConnectorId: connectorId,
				selectedIds: [],
				multiSelectGroup: null,
			};
		}

		return nextState;
	},
};
