import type { CanvasControllerState } from "../../../CanvasTypes";
import type { ICanvasRegistries } from "../../../registries/ICanvasRegistries";
import { commitTextEditIfNeeded } from "../../../utils/commitTextEditIfNeeded";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { isLeftButton } from "../utils/isLeftButton";
import { startConnectorLabelEdit } from "../utils/startConnectorLabelEdit";

/**
 * Handles click events on connectors.
 * Connectors are selected independently from objects (selectedConnectorId vs selectedIds).
 * Only single selection is supported; selecting a connector clears selectedIds, and vice versa.
 *
 * Label editing (label.text) starts on a double click, with the edit target
 * depending on whether a label exists:
 * - No committed label: a double click anywhere on the line starts editing
 *   (there is no label box to aim at yet), and the label being created takes the
 *   clicked point as its placement (carried in textEditState until committed).
 * - Committed label: only a double click on the label box (targetPart "label")
 *   starts editing; a double click on the bare line just selects.
 *
 * While editing, the static label box is not rendered and the editor overlay
 * (data-gesture="none") sits in its place, so any tap that reaches this handler
 * is outside the editor and commits the pending edit like any other outside tap.
 */
export const ConnectorEventHandler: GestureHandler = {
	supports(event: CanvasEvent): boolean {
		return (
			isLeftButton(event) &&
			event.targetKind === "connector" &&
			// Taps only, whatever part they land on. Drags belong to the two handlers that
			// share this targetKind: the label box to ConnectorLabelDragHandler, a segment band
			// to ConnectorSegmentDragHandler (see initializeGestureHandlerRegistry).
			(event.type === "click" ||
				event.type === "pressed" ||
				event.type === "doubleClick")
		);
	},

	handle(
		state: CanvasControllerState,
		event: CanvasEvent,
		registries: ICanvasRegistries,
	): CanvasControllerState {
		const connectorId = event.targetId;
		let nextState = commitTextEditIfNeeded(state);

		// A double click selects the connector, and starts label editing when it
		// hits the edit target (see the doc comment above).
		if (event.type === "doubleClick") {
			if (!connectorId) {
				return nextState;
			}
			return startConnectorLabelEdit(
				nextState,
				connectorId,
				event,
				event.targetPart === "label",
				registries,
			);
		}

		// A press on a connector closes the context menu (button is guarded in supports, selection happens on click)
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
				// Without clearing it, an invisible vertex selection lingers and the Delete key deletes an unintended vertex
				selectedVertex: null,
				multiSelectGroup: null,
				// Close the submenu / category flyout on selection change
				objectMenuOpenId: null,
				stencilLibraryOpenCategory: null,
			};
		}

		return nextState;
	},
};
