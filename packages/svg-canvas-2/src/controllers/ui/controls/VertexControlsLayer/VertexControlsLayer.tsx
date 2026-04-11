import type { Point } from "@workspace/geometry";
import { memo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { VertexControls, VertexInsertControls } from "../VertexControls";

type VertexControlsLayerProps = {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	zoom?: number;
};

/**
 * Renders VertexControls for Polyline objects when exactly one is selected.
 * This layer is responsible for showing vertex editing controls for poly-based shapes.
 */
const VertexControlsLayerComponent: React.FC<VertexControlsLayerProps> = ({
	selectedIds,
	objects,
	zoom = 1,
}) => {
	// Only render for single selection
	if (selectedIds.length !== 1) {
		return null;
	}

	const selectedId = selectedIds[0];
	const selectedObject = objects[selectedId];

	if (!selectedObject) {
		return null;
	}

	// Only render for Polyline objects with points
	if (
		selectedObject.type === "polyline" &&
		"points" in selectedObject &&
		Array.isArray(selectedObject.points)
	) {
		const points = selectedObject.points as Point[];
		return (
			<>
				{/* Vertex controls for moving existing vertices */}
				<VertexControls
					objectId={selectedId}
					points={points}
					zoom={zoom}
				/>
				{/* Vertex insert controls for adding new vertices */}
				<VertexInsertControls
					objectId={selectedId}
					points={points}
					zoom={zoom}
				/>
			</>
		);
	}

	return null;
};

export const VertexControlsLayer = memo(VertexControlsLayerComponent);
