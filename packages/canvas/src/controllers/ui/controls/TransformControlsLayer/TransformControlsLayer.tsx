import { isTransformedFrame } from "@jiscribe/geometry";
import { memo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { DragKind } from "../../../CanvasTypes";
import { useCanvasRegistries } from "../../../registries/CanvasRegistriesContext";
import type { CanvasSelection } from "../../../selection/CanvasSelection";
import { collectOutlinedPartRegions } from "../../../selection/collectOutlinedPartRegions";
import { resolveTransformHandles } from "../ObjectTransformHandlesRegistry";
import { TransformControls } from "../TransformControls";

type TransformControlsLayerProps = {
	/**
	 * What the canvas is pointed at, `state.selection` as it stands: the reducer
	 * has already dropped a part no longer selectable (reconcileSelection), so a
	 * stale part cannot keep the handles hidden
	 */
	selection: CanvasSelection;
	objects: Record<string, ObjectState>;
	multiSelectGroup?: GroupState | null;
	zoom?: number;
	isTextEditing: boolean;
	/** Kind of the drag in progress; null when none is */
	activeDragKind: DragKind | null;
};

/**
 * Renders TransformControls for objects with transform properties (Frame-based objects).
 * For single selection: shows the handles the object's type declares for that very
 * object, provided it has transform properties.
 * For multiple selections: shows controls for the multiSelectGroup.
 */
const TransformControlsLayerComponent: React.FC<
	TransformControlsLayerProps
> = ({
	selection,
	objects,
	multiSelectGroup,
	zoom = 1,
	isTextEditing,
	activeDragKind,
}) => {
	const registries = useCanvasRegistries();

	// Do not render controls while text editing
	if (isTextEditing) {
		return null;
	}

	// Hidden while an outlined part is selected: resizing and rotating still act on
	// the whole object, so handles on its frame would compete with that part's box
	// for the eye. A kind drawing no box leaves nothing to compete with
	// (collectOutlinedPartRegions).
	if (
		collectOutlinedPartRegions(objects, registries.objectPartKind, selection)
			.length > 0
	) {
		return null;
	}

	// Hidden while the selection is moved: the frame would only trail the shapes it
	// belongs to. A transform drag keeps it — the handle being dragged is part of it.
	if (activeDragKind === "move") {
		return null;
	}

	const selectedIds = selection.objectIds;

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

		const handles = registries.objectTransformHandles.resolve(selectedObject);
		const { resize, rotate } = resolveTransformHandles(handles);
		if (!resize && !rotate) {
			return null;
		}

		return (
			<TransformControls frame={selectedObject} zoom={zoom} handles={handles} />
		);
	}

	// A mixed selection has no single declaration to follow, so the group frame keeps
	// every handle; the per-type declaration applies to single selections only.
	if (multiSelectGroup) {
		return <TransformControls frame={multiSelectGroup} zoom={zoom} />;
	}

	return null;
};

export const TransformControlsLayer = memo(TransformControlsLayerComponent);
