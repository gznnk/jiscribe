import { isTransformedFrame } from "@jiscribe/geometry";
import type { Point, Rect } from "@jiscribe/geometry";
import { memo, useMemo } from "react";

import type { ObjectAnchorRegionRegistry } from "../../../../rendering/objects/registry/ObjectAnchorRegionRegistry";
import { useObjectAnchorRegionRegistry } from "../../../../rendering/objects/registry/ObjectAnchorRegionRegistryContext";
import type {
	ExtraConnectPoint,
	ObjectExtraConnectPointsRegistry,
} from "../../../../rendering/objects/registry/ObjectExtraConnectPointsRegistry";
import { useObjectExtraConnectPointsRegistry } from "../../../../rendering/objects/registry/ObjectExtraConnectPointsRegistryContext";
import type { ObjectOutlineRegistry } from "../../../../rendering/objects/registry/ObjectOutlineRegistry";
import { useObjectOutlineRegistry } from "../../../../rendering/objects/registry/ObjectOutlineRegistryContext";
import { calcEdgeAnchorPoint } from "../../../../rendering/objects/utils/calcConnectPoint";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../states/objects/connector/ConnectorState";
import type { ConnectorDraft, DragKind } from "../../../CanvasTypes";
import { useCanvasRegistries } from "../../../registries/CanvasRegistriesContext";
import { isConnectableObject } from "../../../utils/isConnectableObject";
import { ConnectionAnchors } from "../ConnectionAnchors";
import { ConnectionTargetAnchors } from "../ConnectionTargetAnchors";

type ConnectionAnchorsLayerProps = {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	zoom?: number;
	/**
	 * The connector a connection drag is working on; null when none is under way.
	 * Its dragged end decides which object the receiving anchors are shown on.
	 */
	connectorDraft?: ConnectorDraft | null;
	isTextEditing: boolean;
	/** Kind of the drag in progress; null when none is */
	activeDragKind: DragKind | null;
};

type ResolvedAnchorGeometry = {
	/** The object's true outline polygon (null = bounding-box fallback in the dot components). */
	outline: Point[] | null;
	/** The band the edge anchors are centered on (null = full bounding box). */
	anchorRegion: Rect | null;
	/** The anchors the object's type declares beyond the edge ones (null = none). */
	extraConnectPoints: readonly ExtraConnectPoint[] | null;
};

const EMPTY_ANCHOR_GEOMETRY: ResolvedAnchorGeometry = {
	outline: null,
	anchorRegion: null,
	extraConnectPoints: null,
};

const resolveAnchorGeometry = (
	obj: ObjectState | null,
	outlineRegistry: ObjectOutlineRegistry,
	anchorRegionRegistry: ObjectAnchorRegionRegistry,
	extraConnectPointsRegistry: ObjectExtraConnectPointsRegistry,
): ResolvedAnchorGeometry => {
	if (!obj || !isTransformedFrame(obj)) {
		return EMPTY_ANCHOR_GEOMETRY;
	}
	return {
		outline: outlineRegistry.get(obj.type)?.(obj) ?? null,
		anchorRegion: anchorRegionRegistry.get(obj.type)?.(obj) ?? null,
		extraConnectPoints: extraConnectPointsRegistry.get(obj.type)?.(obj) ?? null,
	};
};

/**
 * Renders ConnectionAnchors for connectable frame-based objects when exactly one
 * is selected.
 * Shows the four edge connection anchors, placed on the shape's outline and
 * anchor region rather than the bounding box, plus whatever extra ones its type
 * declares.
 *
 * Also renders ConnectionTargetAnchors on the hovered object while a connection
 * drag is in progress, to indicate connectable points on the target side.
 */
const ConnectionAnchorsLayerComponent: React.FC<
	ConnectionAnchorsLayerProps
> = ({
	selectedIds,
	objects,
	zoom = 1,
	connectorDraft,
	isTextEditing,
	activeDragKind,
}) => {
	const registries = useCanvasRegistries();
	const outlineRegistry = useObjectOutlineRegistry();
	const anchorRegionRegistry = useObjectAnchorRegionRegistry();
	const extraConnectPointsRegistry = useObjectExtraConnectPointsRegistry();

	// --- Source anchors (shown on a single-selected, connectable frame object) ---
	const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;
	const selectedObject = selectedId ? objects[selectedId] : null;

	// --- Target anchors (shown during a connection drag on the hovered object) ---
	// The anchors go on the object the dragged end may land on, so a re-anchor of
	// the source shows them there instead of on the target.
	const draggedEndpoint =
		connectorDraft?.kind === "edit" ? connectorDraft.endpoint : "target";

	// Where the connector being dragged lives: creation holds it in the draft,
	// while a re-anchor rewrites the entity in `objects` on every frame.
	const editingConnector =
		connectorDraft?.kind === "create"
			? connectorDraft.connector
			: connectorDraft
				? (objects[connectorDraft.connectorId] as ConnectorState | undefined)
				: null;

	const editingEndpointRef =
		draggedEndpoint === "source"
			? editingConnector?.source
			: editingConnector?.target;

	const targetObjectId = editingEndpointRef?.owner?.id;
	const targetObject = targetObjectId ? objects[targetObjectId] : null;

	// Memoized on the object reference: the calculators return fresh references on
	// every call, and this layer re-renders on every pointer move of a connection
	// drag, so resolving inline would defeat the dot components' memo() the whole
	// time the object itself stands still.
	const selectedGeometry = useMemo(
		() =>
			resolveAnchorGeometry(
				selectedObject,
				outlineRegistry,
				anchorRegionRegistry,
				extraConnectPointsRegistry,
			),
		[
			selectedObject,
			outlineRegistry,
			anchorRegionRegistry,
			extraConnectPointsRegistry,
		],
	);
	const targetGeometry = useMemo(
		() =>
			resolveAnchorGeometry(
				targetObject,
				outlineRegistry,
				anchorRegionRegistry,
				extraConnectPointsRegistry,
			),
		[
			targetObject,
			outlineRegistry,
			anchorRegionRegistry,
			extraConnectPointsRegistry,
		],
	);

	// Do not render anchors while text editing
	if (isTextEditing) {
		return null;
	}

	// Hidden while the selection is moved or transformed: the dots would just ride along
	// the geometry being changed. A connection drag ("other") keeps them, since the anchor
	// being dragged from is one of them.
	const isShapeBeingMovedOrTransformed =
		activeDragKind === "move" || activeDragKind === "transform";
	const showSourceAnchors =
		!isShapeBeingMovedOrTransformed &&
		selectedObject != null &&
		isConnectableObject(selectedObject, registries.objectMapper) &&
		isTransformedFrame(selectedObject);

	const showTargetAnchors =
		targetObject != null &&
		isConnectableObject(targetObject, registries.objectMapper) &&
		isTransformedFrame(targetObject);

	// Determine the active anchor on the hover target. An edge anchor has no dot of
	// its own to highlight, so its landing point is resolved and drawn instead.
	let activeAnchorId: string | null = null;
	let freeConnectPoint: Point | null = null;
	if (editingEndpointRef && targetObjectId) {
		const anchor = editingEndpointRef.anchor;
		if (anchor.kind === "center") {
			activeAnchorId = "center";
		} else if (anchor.kind === "connectPoint") {
			activeAnchorId = anchor.id;
		} else if (anchor.kind === "edge" && showTargetAnchors) {
			freeConnectPoint = calcEdgeAnchorPoint(
				targetObject,
				anchor,
				targetGeometry.outline,
				targetGeometry.anchorRegion,
			);
		}
	}

	return (
		<>
			{showSourceAnchors && (
				<ConnectionAnchors
					objectId={selectedId!}
					frame={selectedObject!}
					outline={selectedGeometry.outline}
					anchorRegion={selectedGeometry.anchorRegion}
					extraConnectPoints={selectedGeometry.extraConnectPoints}
					zoom={zoom}
				/>
			)}
			{showTargetAnchors && (
				<ConnectionTargetAnchors
					frame={targetObject}
					outline={targetGeometry.outline}
					anchorRegion={targetGeometry.anchorRegion}
					extraConnectPoints={targetGeometry.extraConnectPoints}
					activeAnchorId={activeAnchorId}
					freeConnectPoint={freeConnectPoint}
					zoom={zoom}
				/>
			)}
		</>
	);
};

export const ConnectionAnchorsLayer = memo(ConnectionAnchorsLayerComponent);
