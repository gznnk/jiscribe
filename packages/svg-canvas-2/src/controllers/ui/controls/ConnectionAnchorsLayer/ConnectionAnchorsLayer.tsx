import { isTransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";
import { ConnectionAnchors } from "../ConnectionAnchors";
import { ConnectionTargetAnchors } from "../ConnectionTargetAnchors";
import type { TargetAnchorId } from "../ConnectionTargetAnchors";

type ConnectionAnchorsLayerProps = {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	zoom?: number;
	/**
	 * Connection drag 中の一時コネクター。
	 * これがある場合、接続ターゲット側の受け口アンカーを表示する。
	 */
	pendingConnector?: ConnectorState | null;
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
> = ({ selectedIds, objects, zoom = 1, pendingConnector }) => {
	// --- Source anchors (shown on single-selected, frame-based, non-group objects) ---
	const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;
	const selectedObject = selectedId ? objects[selectedId] : null;
	const showSourceAnchors =
		selectedObject != null &&
		selectedObject.type !== "group" &&
		isTransformedFrame(selectedObject);

	// --- Target anchors (shown during a connection drag on the hovered object) ---
	// Target is encoded directly in pendingConnector.target:
	// - OwnedEndpointRef → owner.id is the target object
	// - FreeEndpointRef  → no target yet
	const targetObjectId = pendingConnector?.target.owner?.id;
	const targetObject = targetObjectId ? objects[targetObjectId] : null;
	const showTargetAnchors =
		targetObject != null &&
		targetObject.type !== "connector" &&
		isTransformedFrame(targetObject);

	// Determine which anchor on the target is nearest to the cursor.
	// ConnectionAnchorEventHandler already computes this and stores it in
	// pendingConnector.target when owner matches.
	let activeAnchorId: TargetAnchorId | null = null;
	if (pendingConnector && targetObjectId) {
		const anchor = pendingConnector.target.anchor;
		if (anchor.kind === "center") {
			activeAnchorId = "center";
		} else if (anchor.kind === "connectPoint") {
			activeAnchorId = anchor.id as TargetAnchorId;
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
