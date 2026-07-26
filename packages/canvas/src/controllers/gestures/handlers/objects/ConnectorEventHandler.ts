import { snapLabelOffsetToLine } from "./utils/snapLabelOffsetToLine";
import {
	calcConnectorLabelPlacement,
	type ConnectorLabelPlacement,
} from "../../../../presentations/layers/content/utils/label/calcConnectorLabelPlacement";
import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { collectConnectorPoints } from "../../../utils/calcConnectorBoundingBox";
import { commitTextEditIfNeeded } from "../../../utils/commitTextEditIfNeeded";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { isLeftButton } from "../utils/isLeftButton";
import { SNAP_THRESHOLD_PX } from "../utils/snap/findSnap";

/**
 * Projects the double-clicked point onto the connector path, so a label created
 * from a bare-line double click is placed where it was aimed instead of at the
 * path midpoint. The offset snaps onto the line with the same threshold the
 * label drag uses; a double click within the stroke hit width always snaps, so
 * a placement off the line only survives on a very thick stroke.
 *
 * Only called for a connector without label text, so any placement the label
 * still carries belongs to a deleted label (an externally authored document can
 * hold one; commitConnectorLabel strips it here) and is overridden. Returns null
 * when the path cannot be resolved, leaving the label's own values in charge.
 *
 * @param state Canvas state, read for the objects (endpoint resolution) and the zoom
 * @param connector Connector whose line was double-clicked
 * @param event Double-click event; `last` is the clicked point in SVG coordinates
 */
const calcPendingLabelPlacement = (
	state: CanvasControllerState,
	connector: ConnectorState,
	event: CanvasEvent,
): ConnectorLabelPlacement | null => {
	const points = collectConnectorPoints(connector, state.objects);
	if (!points) {
		return null;
	}

	const placement = calcConnectorLabelPlacement(points, event.last);
	return placement
		? snapLabelOffsetToLine(placement, SNAP_THRESHOLD_PX / state.viewport.zoom)
		: null;
};

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
 * While editing, the label box is covered by the editor overlay
 * (data-gesture="none"), so any tap that reaches this handler is outside the
 * label and commits the pending edit like any other outside tap.
 */
export const ConnectorEventHandler: GestureHandler = {
	supports(event: CanvasEvent): boolean {
		return (
			isLeftButton(event) &&
			event.targetKind === "connector" &&
			// Taps only: drags on the label box belong to ConnectorLabelDragHandler,
			// which shares this targetKind (see initializeGestureHandlerRegistry).
			(event.type === "click" ||
				event.type === "pressed" ||
				event.type === "doubleClick")
		);
	},

	handle(
		state: CanvasControllerState,
		event: CanvasEvent,
	): CanvasControllerState {
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
			const connectorState = connector as ConnectorState;
			const labelText = connectorState.label?.text ?? "";
			const selectedState = {
				...nextState,
				selectedConnectorId: connectorId,
				selectedIds: [],
				multiSelectGroup: null,
				// Close the submenu / category flyout on selection change
				objectMenuOpenId: null,
				stencilLibraryOpenCategory: null,
			};
			if (labelText !== "" && event.targetPart !== "label") {
				return selectedState;
			}
			// A label being created starts where it was clicked; an existing one is
			// edited in place.
			const placement =
				labelText === ""
					? calcPendingLabelPlacement(selectedState, connectorState, event)
					: null;
			return {
				...selectedState,
				textEditState: {
					kind: "connectorLabel",
					objectId: connectorId,
					text: labelText,
					...(placement ? { placement } : {}),
				},
			};
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
				multiSelectGroup: null,
				// Close the submenu / category flyout on selection change
				objectMenuOpenId: null,
				stencilLibraryOpenCategory: null,
			};
		}

		return nextState;
	},
};
