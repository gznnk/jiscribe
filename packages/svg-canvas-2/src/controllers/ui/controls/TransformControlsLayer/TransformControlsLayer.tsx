import { isTransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import { TransformControls } from "../TransformControls";

type TransformControlsLayerProps = {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	multiSelectGroup?: GroupState | null;
	zoom?: number;
};

/**
 * Renders TransformControls for the selected object when exactly one object is selected.
 * For multiple selections, no controls are shown (similar to SelectionOverlay which shows outlines).
 */
const TransformControlsLayerComponent: React.FC<
	TransformControlsLayerProps
> = ({ selectedIds, objects, multiSelectGroup, zoom = 1 }) => {
	// No selection, or multiple selection: do not render controls
	if (selectedIds.length === 0) {
		return null;
	}

	// Single selection: render TransformControls if the object has transform properties
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

	// Multiple selection: render TransformControls with multiSelectGroup if available (optional, can be skipped if not needed)
	if (multiSelectGroup) {
		return (
			<TransformControls
				frame={multiSelectGroup}
				showRotation={true}
				showEdgeHandles={true}
				zoom={zoom}
			/>
		);
	}

	return null;
};

export const TransformControlsLayer = memo(TransformControlsLayerComponent);
