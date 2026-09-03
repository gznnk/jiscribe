import { SNAP_THRESHOLD_PX } from "./snap/findSnap";
import { snapLabelOffsetToLine } from "./snapLabelOffsetToLine";
import { CONNECTOR_HIT_STROKE_WIDTH } from "../../../../constants/connectorHitArea";
import {
	calcConnectorLabelPlacement,
	type ConnectorLabelPlacement,
} from "../../../../rendering/layers/content/utils/label/calcConnectorLabelPlacement";
import type { ConnectorState } from "../../../../states/objects/connector/ConnectorState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { ICanvasRegistries } from "../../../registries/ICanvasRegistries";
import { collectConnectorPoints } from "../../../utils/calcConnectorBoundingBox";
import type { CanvasEvent } from "../../registry/GestureHandlerTypes";

/**
 * Projects the double-clicked point onto the connector path, so a label created
 * from a bare-line double click is placed where it was aimed instead of at the
 * path midpoint. The path is resolved through the same registries the rendering
 * uses, and the offset snaps onto the line with a threshold of at least the hit
 * band's half width: a double click that can reach the connector at all creates
 * the label on the line, at any zoom and on any shape. The label drag keeps the
 * plain zoom-scaled threshold, its aim not being confined to the band.
 *
 * Only called for a connector without label text, so any placement the label
 * still carries belongs to a deleted label and is overridden. Emptying a label
 * through the editor drops its placement (commitTextEditIfNeeded), so one only
 * reaches here from an externally authored document. Returns null when the path
 * cannot be resolved, leaving the label's own values in charge.
 *
 * @param state Canvas state, read for the objects (endpoint resolution) and the zoom
 * @param connector Connector whose line was double-clicked
 * @param event Double-click event; `last` is the clicked point in SVG coordinates
 * @param registries Per-canvas registries, read for the outline / anchor-region
 *   geometry the path resolution needs
 */
const calcPendingLabelPlacement = (
	state: CanvasControllerState,
	connector: ConnectorState,
	event: CanvasEvent,
	registries: ICanvasRegistries,
): ConnectorLabelPlacement | null => {
	const points = collectConnectorPoints(
		connector,
		state.objects,
		registries.objectOutline,
		registries.objectAnchorRegion,
		registries.objectExtraConnectPoints,
	);
	if (!points) {
		return null;
	}

	const placement = calcConnectorLabelPlacement(points, event.last);
	return placement
		? snapLabelOffsetToLine(
				placement,
				Math.max(
					SNAP_THRESHOLD_PX / state.viewport.zoom,
					CONNECTOR_HIT_STROKE_WIDTH / 2,
				),
			)
		: null;
};

/**
 * Shared doubleClick entry for starting connector label editing. Selects the
 * connector, then starts editing depending on whether a committed label exists:
 * no label → editing starts with the clicked point as the pending placement;
 * label present → editing starts only when the label box itself was hit,
 * otherwise the double click just selects.
 *
 * Reached from two targets: the connector itself (ConnectorClickHandler, label
 * hit = targetPart "label") and the waypoint-insert handle sitting on the path
 * (ConnectorVertexInsertHandler, label hit resolved from the hover stack — the
 * handle covers the box at the default midpoint placement, so the recognizer
 * pairs the clicks but the part cannot tell what is underneath).
 *
 * @param state Canvas state with any pending text edit already committed
 *   (both callers run under commitTextEditIfNeeded)
 * @param connectorId Target connector; a non-connector id is a no-op
 * @param event Double-click event; `last` (SVG coordinates) seeds the placement
 *   of a label being created
 * @param isLabelBoxHit Whether the double click landed on the committed label's
 *   box; decides re-edit vs select when label text exists
 * @param registries Per-canvas registries, forwarded to the placement calculation
 *   (unused when an existing label is re-edited)
 */
export const startConnectorLabelEdit = (
	state: CanvasControllerState,
	connectorId: string,
	event: CanvasEvent,
	isLabelBoxHit: boolean,
	registries: ICanvasRegistries,
): CanvasControllerState => {
	const connector = state.objects[connectorId];
	if (connector?.type !== "connector") {
		return state;
	}
	const connectorState = connector as ConnectorState;
	const labelText = connectorState.label?.text ?? "";
	const selectedState = {
		...state,
		selectedConnectorId: connectorId,
		selectedIds: [],
		// Without clearing it, an invisible vertex selection lingers and the Delete key deletes an unintended vertex
		selectedVertex: null,
		multiSelectGroup: null,
		// Close the submenu / category flyout on selection change
		objectMenuOpenId: null,
		stencilLibraryOpenCategory: null,
	};
	if (labelText !== "" && !isLabelBoxHit) {
		return selectedState;
	}
	// A label being created starts where it was clicked; an existing one is
	// edited in place.
	const placement =
		labelText === ""
			? calcPendingLabelPlacement(
					selectedState,
					connectorState,
					event,
					registries,
				)
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
};
