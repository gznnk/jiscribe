import { isTransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { ConnectionAnchors } from "../ConnectionAnchors";

type ConnectionAnchorsLayerProps = {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	zoom?: number;
};

/**
 * Renders ConnectionAnchors for frame-based objects when exactly one is selected.
 * Shows connection anchor points on the midpoints of each edge.
 */
const ConnectionAnchorsLayerComponent: React.FC<
	ConnectionAnchorsLayerProps
> = ({ selectedIds, objects, zoom = 1 }) => {
	// Only render for single selection
	if (selectedIds.length !== 1) {
		return null;
	}

	const selectedId = selectedIds[0];
	const selectedObject = objects[selectedId];

	if (!selectedObject) {
		return null;
	}

	// Only render for frame-based objects
	if (!isTransformedFrame(selectedObject)) {
		return null;
	}

	return (
		<ConnectionAnchors
			objectId={selectedId}
			frame={selectedObject}
			zoom={zoom}
		/>
	);
};

export const ConnectionAnchorsLayer = memo(ConnectionAnchorsLayerComponent);
