import { isTransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { DragKind } from "../../../CanvasTypes";
import { TransformControls } from "../TransformControls";

type TransformControlsLayerProps = {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	multiSelectGroup?: GroupState | null;
	zoom?: number;
	isTextEditing: boolean;
	/**
	 * Whether a text slot is selected inside the object; already validated by
	 * resolveSelectedTextSlot, since a stale flag would keep the handles hidden
	 */
	isTextSlotSelected: boolean;
	/** Kind of the drag in progress; null when none is */
	activeDragKind: DragKind | null;
};

/**
 * Renders TransformControls for objects with transform properties (Frame-based objects).
 * For single selection: shows controls if the object has transform properties.
 * For multiple selections: shows controls for the multiSelectGroup.
 */
const TransformControlsLayerComponent: React.FC<
	TransformControlsLayerProps
> = ({
	selectedIds,
	objects,
	multiSelectGroup,
	zoom = 1,
	isTextEditing,
	isTextSlotSelected,
	activeDragKind,
}) => {
	// Do not render controls while text editing
	if (isTextEditing) {
		return null;
	}

	// Hidden while a slot is selected: resizing and rotating still act on the whole
	// object, so handles on its frame would compete with the slot box for the eye.
	if (isTextSlotSelected) {
		return null;
	}

	// Hidden while the selection is moved: the frame would only trail the shapes it
	// belongs to. A transform drag keeps it — the handle being dragged is part of it.
	if (activeDragKind === "move") {
		return null;
	}

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

		return <TransformControls frame={selectedObject} zoom={zoom} />;
	}

	// Multiple selection: render TransformControls with multiSelectGroup if available (optional, can be skipped if not needed)
	if (multiSelectGroup) {
		return <TransformControls frame={multiSelectGroup} zoom={zoom} />;
	}

	return null;
};

export const TransformControlsLayer = memo(TransformControlsLayerComponent);
