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
	// Show anchors on both source and target if they are Owned (not Free).
	// This handles both creation (source=Owned, target=hover) and editing (either endpoint can be dragged).
	const sourceObjectId = pendingConnector?.source.owner?.id;
	const targetObjectId = pendingConnector?.target.owner?.id;

	// Collect all owned objects that should show target anchors
	const ownedObjectIds = new Set<string>();
	if (sourceObjectId) ownedObjectIds.add(sourceObjectId);
	if (targetObjectId) ownedObjectIds.add(targetObjectId);

	// For each owned object, determine the active anchor
	const activeAnchors = new Map<string, ConnectPointId>();
	if (pendingConnector) {
		// Check source endpoint
		if (sourceObjectId) {
			const anchor = pendingConnector.source.anchor;
			if (anchor.kind === "center") {
				activeAnchors.set(sourceObjectId, "center");
			} else if (anchor.kind === "connectPoint") {
				activeAnchors.set(sourceObjectId, anchor.id);
			}
		}
		// Check target endpoint
		if (targetObjectId) {
			const anchor = pendingConnector.target.anchor;
			if (anchor.kind === "center") {
				activeAnchors.set(targetObjectId, "center");
			} else if (anchor.kind === "connectPoint") {
				activeAnchors.set(targetObjectId, anchor.id);
			}
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
			{/* Show target anchors on all owned objects during connection drag */}
			{Array.from(ownedObjectIds).map((objId) => {
				const obj = objects[objId];
				if (!obj || obj.type === "connector" || !isTransformedFrame(obj)) {
					return null;
				}
				return (
					<ConnectionTargetAnchors
						key={objId}
						frame={obj}
						activeAnchorId={activeAnchors.get(objId) ?? null}
						zoom={zoom}
					/>
				);
			})}
		</>
	);
};

export const ConnectionAnchorsLayer = memo(ConnectionAnchorsLayerComponent);
