import { isTransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import type { ConnectPointId } from "../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";
import { ConnectionAnchors } from "../ConnectionAnchors";
import { ConnectionTargetAnchors } from "../ConnectionTargetAnchors";

type ConnectionAnchorsLayerProps = {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	zoom?: number;
	/**
	 * Connection drag 中の一時コネクター。
	 * これがある場合、接続ターゲット側の受け口アンカーを表示する。
	 */
	pendingConnector?: ConnectorState | null;
	/**
	 * pendingConnector のうち、現在編集中（ドラッグ中）のエンドポイント。
	 * これにより、固定側（編集していない側）のオブジェクトにのみアンカーを表示できる。
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
	editingEndpoint,
	isTextEditing,
}) => {
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

	// Determine which endpoint is being edited (hover target)
	const editingEndpointRef =
		activeEditingEndpoint === "source"
			? pendingConnector?.source
			: pendingConnector?.target;

	const targetObjectId = editingEndpointRef?.owner?.id;
	const targetObject = targetObjectId ? objects[targetObjectId] : null;

	const showTargetAnchors =
		targetObject != null &&
		targetObject.type !== "connector" &&
		isTransformedFrame(targetObject);

	// Determine the active anchor on the hover target
	let activeAnchorId: ConnectPointId | null = null;
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
					zoom={zoom}
				/>
			)}
			{showTargetAnchors && (
				<ConnectionTargetAnchors
					frame={targetObject!}
					activeAnchorId={activeAnchorId}
					zoom={zoom}
				/>
			)}
		</>
	);
};

export const ConnectionAnchorsLayer = memo(ConnectionAnchorsLayerComponent);
