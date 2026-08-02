import type { Point } from "@workspace/geometry";

import {
	isConnectorState,
	type ConnectorState,
} from "../../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState, SnapFeedback } from "../../../CanvasTypes";
import { createCowObjects } from "../../../utils/cowObjects";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { beginConnectorReshape } from "../utils/beginConnectorReshape";
import { isPerTargetInteraction } from "../utils/isPerTargetInteraction";
import {
	buildSnapFeedback,
	findSnap,
	SNAP_THRESHOLD_PX,
} from "../utils/snap/findSnap";
import {
	getConnectorSegmentEnds,
	translateConnectorSegment,
} from "../utils/translateConnectorSegment";

const TARGET_PART_PREFIX = "segment-move:";

/**
 * Moves the segment by the distance the cursor has travelled and rewrites the connector.
 *
 * Everything is derived from the drag-start snapshot rather than the live state, so each frame is
 * an independent function of the cursor and a snap correction never accumulates.
 */
const handleDrag = (
	state: CanvasControllerState,
	event: CanvasEvent,
	connectorId: string,
	segmentIndex: number,
): CanvasControllerState => {
	const snapshot = state.eventStartSnapshot;
	const connector = snapshot?.objects[connectorId];
	if (!snapshot || !isConnectorState(connector)) {
		return state;
	}
	const ends = getConnectorSegmentEnds(connector, segmentIndex);
	if (!ends) {
		return state;
	}

	// --- Snap correction, on both axes and against both ends of the segment ---
	const delta: Point = {
		x: event.last.x - event.start.x,
		y: event.last.y - event.start.y,
	};
	let snapFeedback: SnapFeedback = { x: [], y: [] };
	const snapCandidates = snapshot.snapCandidates;

	if (snapCandidates && !event.mods.ctrl) {
		const movedXs = [ends.start.x + delta.x, ends.end.x + delta.x];
		const movedYs = [ends.start.y + delta.y, ends.end.y + delta.y];
		const result = findSnap(
			snapCandidates,
			SNAP_THRESHOLD_PX / state.viewport.zoom,
			movedXs,
			movedYs,
		);
		delta.x += result.delta.x;
		delta.y += result.delta.y;
		snapFeedback = buildSnapFeedback(
			{
				left: Math.min(...movedXs) + result.delta.x,
				right: Math.max(...movedXs) + result.delta.x,
				top: Math.min(...movedYs) + result.delta.y,
				bottom: Math.max(...movedYs) + result.delta.y,
			},
			result.xResult,
			result.yResult,
			snapCandidates,
		);
	}

	const translated = translateConnectorSegment(connector, segmentIndex, delta);
	if (!translated) {
		return state;
	}
	const updatedConnector: ConnectorState = { ...connector, ...translated };

	// COW view over the previous frame's map (rebased internally, #213)
	const updatedObjects = createCowObjects(state.objects);
	updatedObjects[connectorId] = updatedConnector;

	return { ...state, objects: updatedObjects, snapFeedback };
};

/**
 * Handles dragging a segment of a straight connector anywhere on the canvas.
 *
 * Target: data-kind="connector", data-part="segment-move:<segmentIndex>", indexing the drawn path
 * `[source, ...points, target]` (see ConnectorSegmentMoveHitAreas). Only the segments whose two ends
 * both have a coordinate of their own carry that band, so the drag is always a plain translation of
 * the pair (see isConnectorSegmentFreelyMovable).
 *
 * It stays exclusive of its siblings on the connector targetKind by the part it answers to:
 * "segment-move:" here, "segment-slide:" for the one-axis orthogonal drag
 * (ConnectorSegmentSlideHandler), "label" for ConnectorLabelDragHandler, and clicks on any part go to
 * ConnectorClickHandler (#110).
 */
export const ConnectorSegmentMoveHandler: GestureHandler = {
	supports(event: CanvasEvent): boolean {
		return (
			isPerTargetInteraction(event) &&
			event.targetKind === "connector" &&
			!!event.targetPart?.startsWith(TARGET_PART_PREFIX) &&
			(event.type === "dragStart" ||
				event.type === "drag" ||
				event.type === "dragEnd")
		);
	},

	handle(
		state: CanvasControllerState,
		event: CanvasEvent,
	): CanvasControllerState {
		const connectorId = event.targetId;
		const targetPart = event.targetPart;
		if (!connectorId || !targetPart) {
			return state;
		}

		const segmentIndex = parseInt(
			targetPart.slice(TARGET_PART_PREFIX.length),
			10,
		);
		if (isNaN(segmentIndex) || segmentIndex < 0) {
			return state;
		}

		if (event.type === "dragStart") {
			return beginConnectorReshape(state, connectorId);
		}
		if (event.type === "dragEnd") {
			return {
				...handleDrag(state, event, connectorId, segmentIndex),
				edgeScrollEnabled: false,
			};
		}
		return handleDrag(state, event, connectorId, segmentIndex);
	},
};
