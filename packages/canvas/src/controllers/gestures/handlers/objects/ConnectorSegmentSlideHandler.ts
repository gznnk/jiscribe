import { PRECISION } from "@jiscribe/doc/model/objects/utils/precision";
import { roundToDecimal } from "@jiscribe/geometry";
import type { Point } from "@jiscribe/geometry";

import {
	isConnectorState,
	type ConnectorState,
} from "../../../../states/objects/connector/ConnectorState";
import type { CanvasControllerState, SnapFeedback } from "../../../CanvasTypes";
import type { ICanvasRegistries } from "../../../registries/ICanvasRegistries";
import { collectConnectorPoints } from "../../../utils/calcConnectorBoundingBox";
import { createCowObjects } from "../../../utils/cowObjects";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { beginConnectorReshape } from "../utils/beginConnectorReshape";
import { isPerTargetInteraction } from "../utils/isPerTargetInteraction";
import { slideConnectorSegment } from "../utils/slideConnectorSegment";
import {
	buildSnapFeedback,
	findSnap,
	SNAP_THRESHOLD_PX,
} from "../utils/snap/findSnap";

const TARGET_PART_PREFIX = "segment-slide:";

/** The segment being dragged, resolved from the drag-start snapshot. */
type DraggedSegment = {
	/** The connector as it was when the drag started. */
	connector: ConnectorState;
	/** The coordinate the drag changes ("y" for a horizontal segment). */
	axis: "x" | "y";
	/** The path the drag started from, endpoints included. */
	path: Point[];
};

/**
 * Resolves the dragged segment from the drag-start snapshot, or null when the connector is gone,
 * the path cannot be resolved, the index is out of range, or the segment is not axis-aligned.
 */
const resolveSegment = (
	state: CanvasControllerState,
	registries: ICanvasRegistries,
	connectorId: string,
	segmentIndex: number,
): DraggedSegment | null => {
	const snapshot = state.eventStartSnapshot;
	if (!snapshot) {
		return null;
	}

	const connector = snapshot.objects[connectorId];
	if (!isConnectorState(connector)) {
		return null;
	}

	const path = collectConnectorPoints(
		connector,
		snapshot.objects,
		registries.objectOutline,
		registries.objectAnchorRegion,
		registries.objectExtraConnectPoints,
	);
	if (!path || segmentIndex > path.length - 2) {
		return null;
	}

	const start = path[segmentIndex];
	const end = path[segmentIndex + 1];
	if (start.y === end.y && start.x !== end.x) {
		return { connector, axis: "y", path };
	}
	if (start.x === end.x && start.y !== end.y) {
		return { connector, axis: "x", path };
	}
	return null;
};

/**
 * Moves the segment to the cursor along its free axis and rewrites the connector's vertices.
 *
 * The segment geometry is re-derived from the snapshot on every frame rather than captured at
 * dragStart, because the drawn path changes as the vertices move; resolving against the pristine
 * snapshot keeps each frame an independent function of the cursor.
 */
const handleDrag = (
	state: CanvasControllerState,
	event: CanvasEvent,
	registries: ICanvasRegistries,
	connectorId: string,
	segmentIndex: number,
): CanvasControllerState => {
	const snapshot = state.eventStartSnapshot;
	const segment = resolveSegment(state, registries, connectorId, segmentIndex);
	if (!snapshot || !segment) {
		return state;
	}

	// --- Snap correction, restricted to the axis the segment can move along ---
	let coordinate = segment.axis === "x" ? event.last.x : event.last.y;
	let snapFeedback: SnapFeedback = { x: [], y: [] };
	const snapCandidates = snapshot.snapCandidates;

	if (snapCandidates && !event.mods.ctrl) {
		const result = findSnap(
			snapCandidates,
			SNAP_THRESHOLD_PX / state.viewport.zoom,
			segment.axis === "x" ? [coordinate] : [],
			segment.axis === "y" ? [coordinate] : [],
		);
		coordinate += segment.axis === "x" ? result.delta.x : result.delta.y;
		const x = segment.axis === "x" ? coordinate : segment.path[0].x;
		const y = segment.axis === "y" ? coordinate : segment.path[0].y;
		snapFeedback = buildSnapFeedback(
			{ left: x, right: x, top: y, bottom: y },
			result.xResult,
			result.yResult,
			snapCandidates,
		);
	}

	const updatedConnector: ConnectorState = {
		...segment.connector,
		points: slideConnectorSegment(
			segment.path,
			segmentIndex,
			segment.axis,
			roundToDecimal(coordinate, PRECISION.COORDINATE),
		).map((point) => ({
			x: roundToDecimal(point.x, PRECISION.COORDINATE),
			y: roundToDecimal(point.y, PRECISION.COORDINATE),
		})),
	};

	// COW view over the previous frame's map (rebased internally, #213)
	const updatedObjects = createCowObjects(state.objects);
	updatedObjects[connectorId] = updatedConnector;

	return {
		...state,
		objects: updatedObjects,
		snapFeedback,
	};
};

/**
 * Handles dragging a segment of a right-angle connector across itself.
 *
 * Target: data-kind="connector", data-part="segment-slide:<segmentIndex>", indexing the drawn path
 * `[source, ...vertices, target]` (see ConnectorSegmentSlideHitAreas). It stays exclusive of its siblings
 * on the connector targetKind by the part it answers to: "segment-slide:" here, "segment-move:" for
 * the free straight drag (ConnectorSegmentMoveHandler), "label" for ConnectorLabelDragHandler,
 * and clicks on any part go to ConnectorClickHandler (#110).
 *
 * The drag writes the connector's vertices (see ConnectorDoc). A connector still routed by the
 * engine has none, so the first drag takes the corners it drew as the starting list — from then on
 * the stored vertices are the path, and the engine no longer has a say in it.
 */
export const ConnectorSegmentSlideHandler: GestureHandler = {
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
		registries: ICanvasRegistries,
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
				...handleDrag(state, event, registries, connectorId, segmentIndex),
				edgeScrollEnabled: false,
			};
		}
		return handleDrag(state, event, registries, connectorId, segmentIndex);
	},
};
