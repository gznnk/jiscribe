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
import type { DragKind } from "../../../CanvasTypes";
import { useCanvasRegistries } from "../../../registries/CanvasRegistriesContext";
import { isConnectableObject } from "../../../utils/isConnectableObject";
import { ConnectionAnchors } from "../ConnectionAnchors";
import { ConnectionTargetAnchors } from "../ConnectionTargetAnchors";

type ConnectionAnchorsLayerProps = {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	zoom?: number;
	/**
	 * Temporary connector during a connection drag (new creation).
	 * When present, the target-side receiving anchors are shown.
	 */
	pendingConnector?: ConnectorState | null;
	/**
	 * ID of the connector whose endpoint is being edited.
	 * Editing mutates the entity directly, so the receiving anchors are derived
	 * from the entity in `objects`.
	 */
	editingConnectorId?: string | null;
	/**
	 * The endpoint currently being edited (dragged).
	 * This lets anchors be shown only on the fixed-side (not-being-edited) object.
	 */
	editingEndpoint?: "source" | "target" | null;
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
	pendingConnector,
	editingConnectorId,
	editingEndpoint,
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
	// Show anchors on the endpoint being edited (hover target).
	// - If editingEndpoint is "target", show anchors on target object (hover candidate)
	// - If editingEndpoint is "source", show anchors on source object (hover candidate)
	// - Default to "target" for backward compatibility (new creation mode)
	const activeEditingEndpoint = editingEndpoint ?? "target";

	// Source connector for deriving the receiving anchors:
	// - during new creation, pendingConnector
	// - during endpoint editing of an existing connector, the entity (editingConnectorId in objects)
	const editingConnector =
		pendingConnector ??
		(editingConnectorId
			? (objects[editingConnectorId] as ConnectorState | undefined)
			: null);

	// Determine which endpoint is being edited (hover target)
	const editingEndpointRef =
		activeEditingEndpoint === "source"
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
