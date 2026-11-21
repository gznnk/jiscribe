import {
	CONNECTOR_LABEL_DEFAULTS,
	type ConnectorLabel,
} from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import type { Point } from "@jiscribe/geometry";

import { calcConnectorLabelAnchor } from "../../../../rendering/objects/connector/geometry/label/calcConnectorLabelAnchor";
import {
	calcConnectorLabelPlacement,
	type ConnectorLabelPlacement,
} from "../../../../rendering/objects/connector/geometry/label/calcConnectorLabelPlacement";
import {
	calcConnectorLabelRect,
	resolveConnectorLabelBox,
	type ConnectorLabelBox,
} from "../../../../rendering/objects/connector/geometry/label/connectorLabelLayout";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import {
	isConnectorState,
	type ConnectorState,
} from "../../../../states/objects/connector/ConnectorState";
import type {
	CanvasControllerState,
	SnapCandidates,
	SnapFeedback,
} from "../../../CanvasTypes";
import type { ICanvasRegistries } from "../../../registries/ICanvasRegistries";
import { applyLabelPlacement } from "../../../utils/applyLabelPlacement";
import { collectConnectorPoints } from "../../../utils/calcConnectorBoundingBox";
import { claimDrag } from "../../../utils/claimDrag";
import { closeStencilPopups } from "../../../utils/closeStencilPopups";
import { commitEditIfChanged } from "../../../utils/commitEdit";
import { createCowObjects } from "../../../utils/cowObjects";
import { writeDragFeedback } from "../../../utils/writeDragFeedback";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { isPerTargetInteraction } from "../utils/isPerTargetInteraction";
import { connectorLabelPart } from "../utils/partAddress";
import { selectPartByClick } from "../utils/selectPartByClick";
import {
	buildSnapFeedback,
	findSnap,
	SNAP_EPSILON,
	SNAP_THRESHOLD_PX,
	type SnapAxisResult,
} from "../utils/snap/findSnap";
import { isSnapSuppressed } from "../utils/snap/isSnapSuppressed";
import { snapLabelOffsetToLine } from "../utils/snapLabelOffsetToLine";
import { snapLabelPositionToMidpoints } from "../utils/snapLabelPositionToMidpoints";

type LabeledConnector = { connector: ConnectorState; label: ConnectorLabel };

/** Compares two labels by placement alone, reading an absent key as its default. */
const isSamePlacement = (
	label: ConnectorLabel,
	otherLabel: ConnectorLabel,
): boolean =>
	(label.position ?? CONNECTOR_LABEL_DEFAULTS.position) ===
		(otherLabel.position ?? CONNECTOR_LABEL_DEFAULTS.position) &&
	(label.offset ?? CONNECTOR_LABEL_DEFAULTS.offset) ===
		(otherLabel.offset ?? CONNECTOR_LABEL_DEFAULTS.offset);

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
 * Selects the connector and picks its label, so the controls and the label's
 * outline follow the label being dragged (any open text edit was committed by
 * ConnectorEventHandler before routing). An unselected connector's label can be
 * grabbed directly: the drag start doubles as the selection. The label's box is
 * measured here, once for the whole drag.
 */
const handleDragStart = (
	state: CanvasControllerState,
	event: CanvasEvent,
	registries: ICanvasRegistries,
): CanvasControllerState => {
	const connectorId = event.targetId;
	const labeled = connectorId
		? getLabeledConnector(state.objects[connectorId])
		: null;
	if (!connectorId || !labeled) {
		return state;
	}

	const selectedState = selectPartByClick(
		{
			...state,
			selection: { objectIds: [connectorId], part: null },
			multiSelectGroup: null,
			// Close the submenu / category flyout on selection change
			objectMenuOpenId: null,
			...closeStencilPopups(),
			contextMenuPosition: null,
		},
		labeled.connector,
		connectorLabelPart(),
		registries.objectPartKind,
	);
	return claimDrag(
		selectedState,
		{ kind: "label", labelBox: resolveConnectorLabelBox(labeled.label) },
		{ edgeScroll: true },
	);
};

/**
 * A placement with the path snaps applied, and which of its two fields they
 * set: the alignment to other objects may move only what they left free.
 */
type PathSnappedPlacement = {
	placement: ConnectorLabelPlacement;
	/** Whether `placement.position` sits on a midpoint (snapLabelPositionToMidpoints). */
	isPositionSnapped: boolean;
	/** Whether `placement.offset` was pulled onto the line (snapLabelOffsetToLine). */
	isOffsetSnapped: boolean;
};

/** Applies the snaps that tie the label to its own path: onto the line, then onto a midpoint along it. */
const snapLabelToPath = (
	rawPlacement: ConnectorLabelPlacement,
	points: readonly Point[],
	thresholdSvg: number,
): PathSnappedPlacement => {
	const onLinePlacement = snapLabelOffsetToLine(rawPlacement, thresholdSvg);
	const placement = snapLabelPositionToMidpoints(
		onLinePlacement,
		points,
		thresholdSvg,
	);
	return {
		placement,
		isPositionSnapped: placement !== onLinePlacement,
		isOffsetSnapped: onLinePlacement !== rawPlacement,
	};
};

/** The label box's left / centre / right and top / middle / bottom around its anchor. */
const calcLabelBoxEdges = (
	anchor: Point,
	labelBox: ConnectorLabelBox,
): { x: number[]; y: number[] } => {
	const { x, y, width, height } = calcConnectorLabelRect(anchor, labelBox);
	return {
		x: [x, x + width / 2, x + width],
		y: [y, y + height / 2, y + height],
	};
};

/** Whether the box edge that findSnap aligned on one axis still lies on its snap line. */
const isAxisAligned = (
	axisResult: NonNullable<SnapAxisResult>,
	snappedEdges: readonly number[],
	alignedEdges: readonly number[],
): boolean => {
	const edgeIndex = snappedEdges.indexOf(axisResult.draggedEdgeValue);
	return (
		Math.abs(alignedEdges[edgeIndex] - axisResult.snapCoordinate) <=
		SNAP_EPSILON
	);
};

/**
 * Aligns the label box with the other objects (findSnap, the same candidates and
 * guides an object move uses) without undoing the path snaps: an axis is taken
 * only when the label, held to its path and to whatever the path snaps set, can
 * still put its box edge on the line. Both axes are tried first, then x alone,
 * then y alone; the first set whose every axis holds wins, and with none the
 * path-snapped placement stands.
 *
 * @returns The placement to write and the guides of the axes taken (empty when none is)
 */
const alignLabelToSnapCandidates = (
	pathSnapped: PathSnappedPlacement,
	points: readonly Point[],
	labelBox: ConnectorLabelBox,
	snapCandidates: SnapCandidates,
	thresholdSvg: number,
): { placement: ConnectorLabelPlacement; snapFeedback: SnapFeedback } => {
	const unaligned = {
		placement: pathSnapped.placement,
		snapFeedback: { x: [], y: [] },
	};
	const anchor = calcConnectorLabelAnchor(
		points,
		pathSnapped.placement.position,
		pathSnapped.placement.offset,
	);
	if (!anchor) {
		return unaligned;
	}
	const snappedEdges = calcLabelBoxEdges(anchor, labelBox);
	const { delta, xResult, yResult } = findSnap(
		snapCandidates,
		thresholdSvg,
		snappedEdges.x,
		snappedEdges.y,
	);

	const axisSets: { x: SnapAxisResult; y: SnapAxisResult }[] = [];
	if (xResult && yResult) {
		axisSets.push({ x: xResult, y: yResult });
	}
	if (xResult) {
		axisSets.push({ x: xResult, y: null });
	}
	if (yResult) {
		axisSets.push({ x: null, y: yResult });
	}

	for (const axisSet of axisSets) {
		const projected = calcConnectorLabelPlacement(points, {
			x: anchor.x + (axisSet.x ? delta.x : 0),
			y: anchor.y + (axisSet.y ? delta.y : 0),
		});
		if (!projected) {
			continue;
		}
		const placement: ConnectorLabelPlacement = {
			position: pathSnapped.isPositionSnapped
				? pathSnapped.placement.position
				: projected.position,
			offset: pathSnapped.isOffsetSnapped
				? pathSnapped.placement.offset
				: projected.offset,
		};
		const alignedAnchor = calcConnectorLabelAnchor(
			points,
			placement.position,
			placement.offset,
		);
		if (!alignedAnchor) {
			continue;
		}
		const alignedEdges = calcLabelBoxEdges(alignedAnchor, labelBox);
		if (
			(axisSet.x &&
				!isAxisAligned(axisSet.x, snappedEdges.x, alignedEdges.x)) ||
			(axisSet.y && !isAxisAligned(axisSet.y, snappedEdges.y, alignedEdges.y))
		) {
			continue;
		}
		return {
			placement,
			snapFeedback: buildSnapFeedback(
				{
					left: alignedEdges.x[0],
					right: alignedEdges.x[2],
					top: alignedEdges.y[0],
					bottom: alignedEdges.y[2],
				},
				axisSet.x,
				axisSet.y,
				snapCandidates,
			),
		};
	}
	return unaligned;
};

/**
 * Rewrites the connector's label placement from the cursor position.
 *
 * The path is always resolved from the drag's start snapshot, so every frame is
 * measured against the same polyline and the ratio cannot drift as the label
 * moves. The pointer is corrected by the grab offset (the gap between where the
 * label was grabbed and its anchor), so grabbing a corner of the box does not
 * snap its center onto the cursor.
 *
 * The path is resolved through the same registries the rendering uses, so the
 * polyline the cursor is measured against is the one on screen, outline shapes
 * included.
 *
 * Unless isSnapSuppressed says otherwise (the same bypass the object-move and
 * transform snaps use), the label snaps to its own path first — a near-zero
 * offset onto the line, a position near a midpoint onto it — and then aligns its
 * box with the other objects where that keeps the path snaps
 * (alignLabelToSnapCandidates). Every frame writes its guides, empty ones included,
 * so the previous frame's never linger.
 */
const handleDrag = (
	state: CanvasControllerState,
	event: CanvasEvent,
	registries: ICanvasRegistries,
): CanvasControllerState => {
	const connectorId = event.targetId;
	const drag = state.drag;
	if (!connectorId || drag?.kind !== "label") {
		return state;
	}
	const snapshot = drag.startSnapshot;

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
		registries.objectExtraConnectPoints,
		registries.objectGeometryKey,
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

	let placement = rawPlacement;
	let snapFeedback: SnapFeedback = { x: [], y: [] };
	if (!isSnapSuppressed(event)) {
		const thresholdSvg = SNAP_THRESHOLD_PX / state.viewport.zoom;
		({ placement, snapFeedback } = alignLabelToSnapCandidates(
			snapLabelToPath(rawPlacement, points, thresholdSvg),
			points,
			drag.labelBox,
			snapshot.snapCandidates,
			thresholdSvg,
		));
	}

	const movedConnector: ConnectorState = {
		...connector,
		label: applyLabelPlacement(label, placement),
	};

	// COW view over the previous frame's map (rebased internally, #213)
	const updatedObjects = createCowObjects(state.objects);
	updatedObjects[connectorId] = movedConnector;

	return writeDragFeedback(
		{ ...state, objects: updatedObjects },
		{ snapFeedback },
	);
};

/**
 * Applies the final frame and decides whether it deserves a history entry.
 * A drag that ends on its starting placement, live state included, commits
 * nothing.
 */
const handleDragEnd = (
	state: CanvasControllerState,
	event: CanvasEvent,
	registries: ICanvasRegistries,
): CanvasControllerState => {
	const connectorId = event.targetId;
	const dragResult = handleDrag(state, event, registries);
	const started = connectorId
		? getLabeledConnector(state.drag?.startSnapshot.objects[connectorId])
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
	// snap bypass can lift between the two (Ctrl released, or the last drag frame
	// was one that edge-scrolled), so only the dragEnd frame reaches the snap. Dropping `dragResult` there would strand the label on the
	// intermediate placement with no commit — no history, no save,
	// and silent persistence on the next unrelated edit. So the shortcut is taken
	// only when the live state is already back at the start; otherwise the
	// dragEnd frame is committed even though it matches the start, at the cost of
	// one undo step whose content equals the previous present.
	const isLiveAtStart =
		started !== null &&
		live !== null &&
		isSamePlacement(started.label, live.label);

	if (isNoOp && isLiveAtStart) {
		return state;
	}
	return commitEditIfChanged(state, dragResult);
};

/**
 * Moves a connector's label along its path by dragging the label box itself
 * (`data-kind="connector" data-action="label"`), writing back `label.position`
 * (path-length ratio) and `label.offset` (perpendicular distance). The drag
 * picks the label one level below the connector, as a click on it does.
 *
 * Only drag gestures land here; click / doubleClick on the same box stay with
 * ConnectorClickHandler, and to the label box rather than a segment band, which
 * keeps the three connector handlers' supports() mutually exclusive (#110). The recognizer's 3px drag threshold is what keeps a sloppy
 * double click on the label from nudging it.
 *
 * While editing, the static label box is not rendered (ConnectorRenderer skips
 * it in favor of ConnectorLabelEditor), so no drag can reach the label being
 * edited.
 */
export const ConnectorLabelDragHandler: GestureHandler = {
	supports(event: CanvasEvent): boolean {
		return (
			isPerTargetInteraction(event) &&
			event.targetKind === "connector" &&
			event.targetAction === "label" &&
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
			return handleDragStart(state, event, registries);
		}
		if (event.type === "drag") {
			return handleDrag(state, event, registries);
		}
		return handleDragEnd(state, event, registries);
	},
};
