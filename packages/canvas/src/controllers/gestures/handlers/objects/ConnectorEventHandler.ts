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
 * A double click on a connector starts editing its label (label.text).
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

		// A double click starts label editing. Re-double-clicking the same connector while
		// already editing continues editing without committing (same as shape text editing).
		if (event.type === "doubleClick") {
			if (!connectorId) {
				return state;
			}
			const isReEditingSame = state.textEditState?.objectId === connectorId;
			const baseState = isReEditingSame ? state : commitTextEditIfNeeded(state);
			const connector = baseState.objects[connectorId];
			if (connector?.type !== "connector") {
				return baseState;
			}
			return {
				...baseState,
				selectedConnectorId: connectorId,
				selectedIds: [],
				multiSelectGroup: null,
				textEditState: {
					objectId: connectorId,
					text: (connector as ConnectorState).label?.text ?? "",
				},
			};
		}

		let nextState = commitTextEditIfNeeded(state);

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
