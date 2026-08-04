import { isTransformedFrame } from "@workspace/geometry";
import type { Point, Rect } from "@workspace/geometry";
import { memo } from "react";

import { useObjectAnchorRegionRegistry } from "../../../../presentations/objects/registry/ObjectAnchorRegionRegistryContext";
import type { ExtraConnectPoint } from "../../../../presentations/objects/registry/ObjectExtraConnectPointsRegistry";
import { useObjectExtraConnectPointsRegistry } from "../../../../presentations/objects/registry/ObjectExtraConnectPointsRegistryContext";
import { useObjectOutlineRegistry } from "../../../../presentations/objects/registry/ObjectOutlineRegistryContext";
import { calcEdgeAnchorPoint } from "../../../../presentations/objects/utils/calcConnectPoint";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";
import type { DragKind } from "../../../CanvasTypes";
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

/**
 * Renders ConnectionAnchors for frame-based objects when exactly one is selected.
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
	const outlineRegistry = useObjectOutlineRegistry();
	const anchorRegionRegistry = useObjectAnchorRegionRegistry();
	const extraConnectPointsRegistry = useObjectExtraConnectPointsRegistry();

	// Reads the object's true outline polygon (null for rect/ellipse/no-provider,
	// which fall back to bounding-box anchors in the dot components).
	const resolveOutline = (obj: ObjectState): Point[] | null => {
		const provider = outlineRegistry.get(obj.type);
		if (!provider || !isTransformedFrame(obj)) {
			return null;
		}
		return provider(obj);
	};

	// Reads the band the edge anchors are centered on (null = full bounding box).
	const resolveAnchorRegion = (obj: ObjectState): Rect | null => {
		const provider = anchorRegionRegistry.get(obj.type);
		if (!provider || !isTransformedFrame(obj)) {
			return null;
		}
		return provider(obj);
	};

	// Reads the anchors the object's type declares beyond the edge ones (null = none).
	const resolveExtraConnectPoints = (
		obj: ObjectState,
	): readonly ExtraConnectPoint[] | null => {
		const provider = extraConnectPointsRegistry.get(obj.type);
		if (!provider || !isTransformedFrame(obj)) {
			return null;
		}
		return provider(obj);
	};

	// Do not render anchors while text editing
	if (isTextEditing) {
		return null;
	}

	// --- Source anchors (shown on single-selected, frame-based, non-group objects) ---
	const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;
	const selectedObject = selectedId ? objects[selectedId] : null;
	// Hidden while the selection is moved or transformed: the dots would just ride along
	// the geometry being changed. A connection drag ("other") keeps them, since the anchor
	// being dragged from is one of them.
	const isShapeBeingMovedOrTransformed =
		activeDragKind === "move" || activeDragKind === "transform";
	const showSourceAnchors =
		!isShapeBeingMovedOrTransformed &&
		selectedObject != null &&
		selectedObject.type !== "group" &&
		isTransformedFrame(selectedObject);

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

	const showTargetAnchors =
		targetObject != null &&
		targetObject.type !== "connector" &&
		isTransformedFrame(targetObject);

	const targetOutline = showTargetAnchors ? resolveOutline(targetObject) : null;
	const targetAnchorRegion = showTargetAnchors
		? resolveAnchorRegion(targetObject)
		: null;

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
				targetOutline,
				targetAnchorRegion,
			);
		}
	}

	return (
		<>
			{showSourceAnchors && (
				<ConnectionAnchors
					objectId={selectedId!}
					frame={selectedObject!}
					outline={resolveOutline(selectedObject!)}
					anchorRegion={resolveAnchorRegion(selectedObject!)}
					extraConnectPoints={resolveExtraConnectPoints(selectedObject!)}
					zoom={zoom}
				/>
			)}
			{showTargetAnchors && (
				<ConnectionTargetAnchors
					frame={targetObject}
					outline={targetOutline}
					anchorRegion={targetAnchorRegion}
					extraConnectPoints={resolveExtraConnectPoints(targetObject)}
					activeAnchorId={activeAnchorId}
					freeConnectPoint={freeConnectPoint}
					zoom={zoom}
				/>
			)}
		</>
	);
};

export const ConnectionAnchorsLayer = memo(ConnectionAnchorsLayerComponent);
