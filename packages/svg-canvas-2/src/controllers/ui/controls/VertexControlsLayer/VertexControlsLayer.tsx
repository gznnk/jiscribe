import type { Point } from "@workspace/geometry";
import { memo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { VertexControls } from "../VertexControls/VertexControls";

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
		return (
			<VertexControls
				objectId={selectedId}
				points={selectedObject.points as Point[]}
				zoom={zoom}
			/>
		);
	}

	return null;
};

export const VertexControlsLayer = memo(VertexControlsLayerComponent);
