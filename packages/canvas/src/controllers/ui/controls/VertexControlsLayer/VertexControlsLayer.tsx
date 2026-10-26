import type { Point } from "@jiscribe/geometry";
import { memo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { CanvasSelection } from "../../../selection/CanvasSelection";
import { readSelectedVertexIndex } from "../../../selection/readers/readSelectedVertexIndex";
import type { SelectionDragKind } from "../../utils/readSelectionDragKind";
import { VertexControls, VertexInsertControls } from "../VertexControls";

type VertexControlsLayerProps = {
	/**
	 * What the canvas is pointed at, `state.selection` as it stands: a picked
	 * vertex of the selected object rings its handle, anything else leaves the
	 * handles plain (reconcileSelection keeps it from naming a vertex
	 * the object has outgrown)
	 */
	selection: CanvasSelection;
	objects: Record<string, ObjectState>;
	zoom?: number;
	/** The drag changing the selection's geometry (readSelectionDragKind); null for none or any other drag */
	selectionDragKind: SelectionDragKind | null;
};

/**
 * Renders VertexControls for Polyline objects when exactly one is selected.
 * This layer is responsible for showing vertex editing controls for poly-based shapes.
 *
 * Hidden while the shape is moved or transformed, the handles only trailing it;
 * dragging a vertex or a midpoint is a `"vertex"` drag and keeps them.
 */
const VertexControlsLayerComponent: React.FC<VertexControlsLayerProps> = ({
	selection,
	objects,
	zoom = 1,
	selectionDragKind,
}) => {
	const { objectIds: selectedIds } = selection;
	// Only render for single selection
	if (selectedIds.length !== 1) {
		return null;
	}

	if (selectionDragKind !== null) {
		return null;
	}

	const selectedId = selectedIds[0];
	const selectedObject = objects[selectedId];

	if (!selectedObject) {
		return null;
	}

	// Only render for Polyline or Polygon objects with points
	if (
		(selectedObject.type === "polyline" || selectedObject.type === "polygon") &&
		"points" in selectedObject &&
		Array.isArray(selectedObject.points)
	) {
		const points = selectedObject.points as Point[];
		const isClosed = selectedObject.type === "polygon";
		const selectedVertexIndex = readSelectedVertexIndex(selection, selectedId);
		return (
			<>
				{/* Vertex controls for moving existing vertices */}
				<VertexControls
					objectId={selectedId}
					points={points}
					zoom={zoom}
					selectedVertexIndex={selectedVertexIndex}
				/>
				{/* Vertex insert controls for adding new vertices */}
				<VertexInsertControls
					objectId={selectedId}
					points={points}
					closed={isClosed}
					zoom={zoom}
				/>
			</>
		);
	}

	return null;
};

export const VertexControlsLayer = memo(VertexControlsLayerComponent);
