import { isTransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { calculateMultiSelectBounds } from "../../utils/calculateMultiSelectBounds";
import { TransformControls } from "../TransformControls";

type TransformControlsLayerProps = {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	zoom?: number;
};

/**
 * Renders TransformControls for the selected object(s).
 * - Single selection: Shows controls for that object
 * - Multiple selection: Shows controls for the virtual bounding box of all selected objects
 */
const TransformControlsLayerComponent: React.FC<
	TransformControlsLayerProps
> = ({ selectedIds, objects, zoom = 1 }) => {
	// No selection
	if (selectedIds.length === 0) {
		return null;
	}

	// Single selection
	if (selectedIds.length === 1) {
		const selectedId = selectedIds[0];
		const selectedObject = objects[selectedId];

		if (!selectedObject) {
			return null;
		}

		// Check if the object has transform properties (Frame with rotation, scaleX, scaleY)
		if (!isTransformedFrame(selectedObject)) {
			return null;
		}

		return (
			<TransformControls
				frame={selectedObject}
				showRotation={true}
				showEdgeHandles={true}
				zoom={zoom}
			/>
		);
	}

	// Multiple selection: calculate virtual bounding box
	const virtualBounds = calculateMultiSelectBounds(objects, selectedIds);

	if (!virtualBounds) {
		return null;
	}

	return (
		<TransformControls
			frame={virtualBounds}
			showRotation={false}
			showEdgeHandles={true}
			zoom={zoom}
		/>
	);
};

export const TransformControlsLayer = memo(TransformControlsLayerComponent);
