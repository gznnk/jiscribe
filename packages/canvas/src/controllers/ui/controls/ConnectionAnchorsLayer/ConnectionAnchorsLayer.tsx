import { isTransformedFrame } from "@workspace/geometry";
import type { Point } from "@workspace/geometry";
import { memo } from "react";

import { useObjectOutlineRegistry } from "../../../../presentations/objects/registry/ObjectOutlineRegistryContext";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";
import { ConnectionAnchors } from "../ConnectionAnchors";
import type { AnchorHandleId } from "../ConnectionAnchorTypes";
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
};

/**
 * Renders ConnectionAnchors for frame-based objects when exactly one is selected.
 * Shows connection anchor points on the midpoints of each edge.
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
}) => {
	const outlineRegistry = useObjectOutlineRegistry();

	// Reads the object's true outline polygon (null for rect/ellipse/no-provider,
	// which fall back to bounding-box anchors in the dot components).
	const resolveOutline = (obj: ObjectState): Point[] | null => {
		const provider = outlineRegistry.get(obj.type);
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
	const showSourceAnchors =
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

	// Determine the active anchor on the hover target
	let activeAnchorId: AnchorHandleId | null = null;
	if (editingEndpointRef && targetObjectId) {
		const anchor = editingEndpointRef.anchor;
		if (anchor.kind === "center") {
			activeAnchorId = "center";
		} else if (anchor.kind === "connectPoint") {
			activeAnchorId = anchor.id;
		}
	}

	return (
		<>
			{showSourceAnchors && (
				<ConnectionAnchors
					objectId={selectedId!}
					frame={selectedObject!}
					outline={resolveOutline(selectedObject!)}
					zoom={zoom}
				/>
			)}
			{showTargetAnchors && (
				<ConnectionTargetAnchors
					frame={targetObject!}
					outline={resolveOutline(targetObject!)}
					activeAnchorId={activeAnchorId}
					zoom={zoom}
				/>
			)}
		</>
	);
};

export const ConnectionAnchorsLayer = memo(ConnectionAnchorsLayerComponent);
