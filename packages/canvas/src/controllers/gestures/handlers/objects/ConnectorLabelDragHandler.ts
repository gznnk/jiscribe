import { calcConnectorLabelAnchor } from "../../../../presentations/layers/content/utils/label/calcConnectorLabelAnchor";
import { calcConnectorLabelPlacement } from "../../../../presentations/layers/content/utils/label/calcConnectorLabelPlacement";
import type { ConnectorLabel } from "../../../../schemas/objects/connections/connector/ConnectorDoc";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import {
	isConnectorState,
	type ConnectorState,
} from "../../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { ICanvasRegistries } from "../../../registries/ICanvasRegistries";
import {
	applyLabelPlacement,
	DEFAULT_LABEL_OFFSET,
	DEFAULT_LABEL_POSITION,
} from "../../../utils/applyLabelPlacement";
import { collectConnectorPoints } from "../../../utils/calcConnectorBoundingBox";
import { commitTextEditIfNeeded } from "../../../utils/commitTextEditIfNeeded";
import { createCowObjects } from "../../../utils/cowObjects";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { isLeftButton } from "../utils/isLeftButton";
import { SNAP_THRESHOLD_PX } from "../utils/snap/findSnap";
import { snapLabelOffsetToLine } from "../utils/snapLabelOffsetToLine";

type LabeledConnector = { connector: ConnectorState; label: ConnectorLabel };

/** Compares two labels by placement alone, reading an absent key as its default. */
const isSamePlacement = (
	label: ConnectorLabel,
	otherLabel: ConnectorLabel,
): boolean =>
	(label.position ?? DEFAULT_LABEL_POSITION) ===
		(otherLabel.position ?? DEFAULT_LABEL_POSITION) &&
	(label.offset ?? DEFAULT_LABEL_OFFSET) ===
		(otherLabel.offset ?? DEFAULT_LABEL_OFFSET);

/** Narrows an object to a connector that actually has a label box to grab. */
const getLabeledConnector = (
	object: ObjectState | undefined,
): LabeledConnector | null => {
	if (!isConnectorState(object)) {
		return null;
	}
	const label = object.label;
	return label && label.text !== "" ? { connector: object, label } : null;
};

/**
 * Selects the connector so its controls follow the label being dragged.
 * An unselected connector's label can be grabbed directly: the drag start
 * doubles as the selection.
 */
const handleDragStart = (
	state: CanvasControllerState,
	event: CanvasEvent,
): CanvasControllerState => {
	const connectorId = event.targetId;
	const nextState = commitTextEditIfNeeded(state);
	if (!connectorId || !getLabeledConnector(nextState.objects[connectorId])) {
		return nextState;
	}

	return {
		...nextState,
		selectedConnectorId: connectorId,
		selectedIds: [],
		// Without clearing it, an invisible vertex selection lingers and the Delete key deletes an unintended vertex
		selectedVertex: null,
		multiSelectGroup: null,
		// Close the submenu / category flyout on selection change
		objectMenuOpenId: null,
		stencilLibraryOpenCategory: null,
		contextMenuPosition: null,
		edgeScrollEnabled: true,
	};
};

/**
 * Rewrites the connector's label placement from the cursor position.
 *
 * The path is always resolved from eventStartSnapshot, so every frame is
 * measured against the same polyline and the ratio cannot drift as the label
 * moves. The pointer is corrected by the grab offset (the gap between where the
 * label was grabbed and its anchor), so grabbing a corner of the box does not
 * snap its center onto the cursor.
 *
 * The path is resolved through the same registries the rendering uses, so the
 * polyline the cursor is measured against is the one on screen, outline shapes
 * included.
 *
 * A near-zero offset snaps onto the line unless Ctrl is held, the same bypass
 * the object-move and transform snaps use.
 */
const handleDrag = (
	state: CanvasControllerState,
	event: CanvasEvent,
	registries: ICanvasRegistries,
): CanvasControllerState => {
	const connectorId = event.targetId;
	const snapshot = state.eventStartSnapshot;
	if (!connectorId || !snapshot) {
		return state;
	}

	const labeled = getLabeledConnector(snapshot.objects[connectorId]);
	if (!labeled) {
		return state;
	}
	const { connector, label } = labeled;

	const points = collectConnectorPoints(
		connector,
		snapshot.objects,
		registries.objectOutline,
		registries.objectAnchorRegion,
	);
	if (!points) {
		return state;
	}

	const grabbedAnchor = calcConnectorLabelAnchor(
		points,
		label.position,
		label.offset,
	);
	if (!grabbedAnchor) {
		return state;
	}

	const rawPlacement = calcConnectorLabelPlacement(points, {
		x: event.last.x + grabbedAnchor.x - event.start.x,
		y: event.last.y + grabbedAnchor.y - event.start.y,
	});
	if (!rawPlacement) {
		return state;
	}

	const placement = event.mods.ctrl
		? rawPlacement
		: snapLabelOffsetToLine(
				rawPlacement,
				SNAP_THRESHOLD_PX / state.viewport.zoom,
			);

	const movedConnector: ConnectorState = {
		...connector,
		label: applyLabelPlacement(label, placement),
	};

	// COW view over the previous frame's map (rebased internally, #213)
	const updatedObjects = createCowObjects(state.objects);
	updatedObjects[connectorId] = movedConnector;

	return { ...state, objects: updatedObjects };
};

/**
 * Applies the final frame and decides whether it deserves a history entry.
 * A drag that ends on its starting placement can leave the objects reference
 * untouched, so handleGesture's change detection records nothing.
 */
const handleDragEnd = (
	state: CanvasControllerState,
	event: CanvasEvent,
	registries: ICanvasRegistries,
): CanvasControllerState => {
	const connectorId = event.targetId;
	const dragResult = handleDrag(state, event, registries);
	const started = connectorId
		? getLabeledConnector(state.eventStartSnapshot?.objects[connectorId])
		: null;
	const finished = connectorId
		? getLabeledConnector(dragResult.objects[connectorId])
		: null;
	const live = connectorId
		? getLabeledConnector(state.objects[connectorId])
		: null;

	const isNoOp =
		started !== null &&
		finished !== null &&
		isSamePlacement(started.label, finished.label);
	// The last drag frame is not guaranteed to hold the same placement as the
	// dragEnd frame: the final move can coalesce into the dragEnd frame, and the
	// Ctrl bypass can be released between the two, so only the dragEnd frame
	// reaches the snap. Dropping `dragResult` there would strand the label on the
	// intermediate placement with no commitVersion bump — no history, no save,
	// and silent persistence on the next unrelated edit. So the shortcut is taken
	// only when the live state is already back at the start; otherwise the
	// dragEnd frame is committed even though it matches the start, at the cost of
	// one undo step whose content equals the previous present.
	const isLiveAtStart =
		started !== null &&
		live !== null &&
		isSamePlacement(started.label, live.label);

	return {
		...(isNoOp && isLiveAtStart ? state : dragResult),
		edgeScrollEnabled: false,
	};
};

/**
 * Moves a connector's label along its path by dragging the label box itself
 * (`data-kind="connector" data-part="label"`), writing back `label.position`
 * (path-length ratio) and `label.offset` (perpendicular distance).
 *
 * Only drag gestures land here; click / doubleClick on the same box stay with
 * ConnectorEventHandler, which keeps the two handlers' supports() mutually
 * exclusive (#110). The recognizer's 3px drag threshold is what keeps a sloppy
 * double click on the label from nudging it.
 *
 * While editing, the static label box is not rendered (ConnectorRenderer skips
 * it in favor of ConnectorLabelEditor), so no drag can reach the label being
 * edited.
 */
export const ConnectorLabelDragHandler: GestureHandler = {
	supports(event: CanvasEvent): boolean {
		return (
			isLeftButton(event) &&
			event.targetKind === "connector" &&
			event.targetPart === "label" &&
			(event.type === "dragStart" ||
				event.type === "drag" ||
				event.type === "dragEnd")
		);
	},

	handle(
		state: CanvasControllerState,
		event: CanvasEvent,
		registries: ICanvasRegistries,
	): CanvasControllerState {
		if (event.type === "dragStart") {
			return handleDragStart(state, event);
		}
		if (event.type === "drag") {
			return handleDrag(state, event, registries);
		}
		return handleDragEnd(state, event, registries);
	},
};
