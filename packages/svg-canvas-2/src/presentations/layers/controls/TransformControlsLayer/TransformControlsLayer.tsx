import { isTransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { TransformControls } from "../TransformControls";

type TransformControlsLayerProps = {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
};

/**
 * Renders TransformControls for the selected object when exactly one object is selected.
 * For multiple selections, no controls are shown (similar to SelectionOverlay which shows outlines).
 */
const TransformControlsLayerComponent: React.FC<
	TransformControlsLayerProps
> = ({ selectedIds, objects }) => {
	// Only show transform controls when exactly one object is selected
	if (selectedIds.length !== 1) {
		return null;
	}

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
		/>
	);
};

export const TransformControlsLayer = memo(TransformControlsLayerComponent);
